from flask import Flask, request, jsonify
import datetime, json, os, smtplib, urllib.request
from email.mime.text import MIMEText
from google.oauth2 import service_account
from googleapiclient.discovery import build

app = Flask(__name__)
JST = datetime.timezone(datetime.timedelta(hours=9))

# ============================================================
# IP制限：同一IPから1時間以内に3件以上の予約を拒否
# ============================================================
_ip_log = {}  # { ip: [タイムスタンプ, ...] }
IP_LIMIT = 3        # 上限件数
IP_WINDOW = 3600    # 1時間（秒）

def check_ip_limit(ip: str) -> bool:
    """True=OK, False=制限超過"""
    now = datetime.datetime.utcnow().timestamp()
    timestamps = _ip_log.get(ip, [])
    # ウィンドウ外のログを削除
    timestamps = [t for t in timestamps if now - t < IP_WINDOW]
    if len(timestamps) >= IP_LIMIT:
        _ip_log[ip] = timestamps
        return False
    timestamps.append(now)
    _ip_log[ip] = timestamps
    return True

def get_client_ip() -> str:
    """Vercel経由でも実IPを取得"""
    return (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.headers.get("X-Real-IP", "")
        or request.remote_addr
        or "unknown"
    )

def get_service():
    try:
        info = json.loads(os.environ.get("GCP_SERVICE_ACCOUNT_JSON", "{}"))
        creds = service_account.Credentials.from_service_account_info(
            info, scopes=['https://www.googleapis.com/auth/calendar']
        )
        # cache_discovery=FalseでVercelのエラーを回避
        return build('calendar', 'v3', credentials=creds, cache_discovery=False)
    except Exception as e:
        print(f"Credentials Error: {e}")
        raise

@app.route('/api/distance', methods=['GET'])
def get_distance():
    origin = request.args.get('origin', '')
    destination = request.args.get('destination', '')
    if not origin or not destination:
        return jsonify({"error": "origin と destination が必要です"}), 400
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY", "")
    if not api_key:
        return jsonify({"error": "APIキーが設定されていません"}), 500
    try:
        url = (
            "https://maps.googleapis.com/maps/api/distancematrix/json"
            f"?origins={urllib.request.quote(origin)}"
            f"&destinations={urllib.request.quote(destination)}"
            f"&mode=driving"
            f"&language=ja"
            f"&key={api_key}"
        )
        with urllib.request.urlopen(url, timeout=10) as res:
            data = json.loads(res.read().decode())
        # APIレベルのステータス確認
        if data.get("status") != "OK":
            return jsonify({"error": f"住所が見つかりませんでした（{data.get('status', 'UNKNOWN')}）"}), 404
        rows = data.get("rows", [])
        if not rows or not rows[0].get("elements"):
            return jsonify({"error": "ルート情報を取得できませんでした"}), 404
        element = rows[0]["elements"][0]
        if element.get("status") != "OK":
            status = element.get("status", "UNKNOWN")
            msg = {
                "NOT_FOUND": "住所が見つかりませんでした。もう少し詳しく入力してください（例：○○病院 善通寺市）",
                "ZERO_RESULTS": "ルートが見つかりませんでした",
            }.get(status, f"取得できませんでした（{status}）")
            return jsonify({"error": msg}), 404
        distance_m = element["distance"]["value"]
        distance_km = round(distance_m / 1000, 1)
        duration_text = element["duration"]["text"]
        distance_text = element["distance"]["text"]
        return jsonify({
            "distance_km": distance_km,
            "distance_text": distance_text,
            "duration_text": duration_text
        })
    except Exception as e:
        print(f"Distance API Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/slots', methods=['GET'])
def get_slots():
    try:
        service = get_service()
        start = request.args.get('start')
        end = request.args.get('end')
        
        if start and end:
            t_min = f"{start}T00:00:00+09:00"
            t_max = f"{end}T23:59:59+09:00"
        else:
            now = datetime.datetime.now(JST)
            t_min = now.isoformat()
            t_max = (now + datetime.timedelta(days=60)).isoformat()

        events_result = service.events().list(
            calendarId=os.environ.get("CALENDAR_ID", "chikara8841986@gmail.com"), 
            timeMin=t_min, timeMax=t_max, singleEvents=True, orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        busy_slots = []
        for event in events:
            start_time = event['start'].get('dateTime')
            end_time = event['end'].get('dateTime')
            if start_time and end_time:
                dt_s = datetime.datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                dt_e = datetime.datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                utc_s = dt_s.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
                utc_e = dt_e.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
                # 終了時刻もフロントに返し、正確な「×」判定を行う
                busy_slots.append({"start": utc_s, "end": utc_e})

        return jsonify(busy_slots)

    except Exception as e:
        print(f"API Error: {e}")
        return jsonify({"error": str(e)}), 500

def _cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

@app.route('/api/reserve', methods=['POST', 'OPTIONS'])
def reserve():
    # CORSプリフライト対応
    if request.method == 'OPTIONS':
        resp = app.make_response('')
        for k, v in _cors_headers().items():
            resp.headers[k] = v
        return resp, 204

    # IP制限チェック
    client_ip = get_client_ip()
    if not check_ip_limit(client_ip):
        resp = jsonify({"error": "短時間に予約が集中しています。しばらく時間をおいてから再度お試しください。"})
        for k, v in _cors_headers().items():
            resp.headers[k] = v
        return resp, 429

    try:
        data = request.json
        start_str = data.get('start')
        duration_minutes = data.get('duration_minutes', 30)
        summary = data.get('summary', '予約')
        description = data.get('description', '')
        name = data.get('name', 'お客様')
        to_email = data.get('email', '')

        service = get_service()
        start_dt = datetime.datetime.fromisoformat(start_str.replace('Z', '+00:00')).astimezone(JST)
        end_dt = start_dt + datetime.timedelta(minutes=duration_minutes)

        # カレンダーへ予約本体を追加
        event = {
            'summary': summary,
            'description': description,
            'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Asia/Tokyo'},
            'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'Asia/Tokyo'},
        }
        calendar_id = os.environ.get("CALENDAR_ID", "chikara8841986@gmail.com")
        created_event = service.events().insert(calendarId=calendar_id, body=event).execute()
        calendar_event_id = created_event.get('id')

        # カレンダーへ移動時間（予約開始30分前）を追加
        travel_end_dt = start_dt
        travel_start_dt = start_dt - datetime.timedelta(minutes=30)
        travel_summary = data.get('gcalTravelSummary', f'【移動】{name}様のお迎え準備')
        travel_event = {
            'summary': travel_summary,
            'description': f'【移動時間】{name}様 お迎えの準備\nお迎え先: {data.get("from", "")}',
            'start': {'dateTime': travel_start_dt.isoformat(), 'timeZone': 'Asia/Tokyo'},
            'end': {'dateTime': travel_end_dt.isoformat(), 'timeZone': 'Asia/Tokyo'},
        }
        created_travel = service.events().insert(calendarId=calendar_id, body=travel_event).execute()
        travel_event_id = created_travel.get('id')

        # LINE通知
        line_token = os.environ.get("LINE_TOKEN")
        line_user_id = os.environ.get("LINE_USER_ID")
        if line_token and line_user_id:
            url = "https://api.line.me/v2/bot/message/push"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {line_token}"
            }
            line_message = (
                f"🔔 新しい予約が入りました！\n\n"
                f"{summary}\n\n"
                f"{description}\n\n"
                f"予約者の区分: {data.get('bookerType', '本人')}"
            )
            payload = {
                "to": line_user_id,
                "messages": [{"type": "text", "text": line_message}]
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
            try:
                with urllib.request.urlopen(req) as res:
                    pass
            except Exception as e:
                print(f"LINE Error: {e}")

        # 確認メール送信
        sender_email = os.environ.get("EMAIL_ADDRESS")
        sender_password = os.environ.get("EMAIL_PASSWORD")
        if to_email and sender_email and sender_password:
            subject = "【ハコビテ】ご予約ありがとうございます"
            body = f"{name} 様\n\nこの度は「ハコビテ」をご予約いただき、誠にありがとうございます。\n以下の内容でご予約を承りました。\n\n--------------------------------------------------\n{description}\n--------------------------------------------------\n\nご不明な点がございましたら、お気軽にご連絡ください。\n\n介護タクシー・生活支援 ハコビテ\n電話: 080-4950-6821"
            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = sender_email
            msg["To"] = to_email
            try:
                server = smtplib.SMTP("smtp.gmail.com", 587)
                server.starttls()
                server.login(sender_email, sender_password)
                server.send_message(msg)
                server.quit()
            except Exception as e:
                print(f"Email Error: {e}")

        # 業務管理アプリから呼ばれた場合はGAS同期をスキップ（業務管理アプリが別途syncToGASで全データを同期するため）
        skip_gas = data.get("skipGasSync", False)
        if not skip_gas:
            # 業務管理アプリ（GAS）へ予約データを同期
            gas_url = os.environ.get(
                "GAS_URL",
                "https://script.google.com/macros/s/AKfycbw6Ep8OOakgStBhAMd2P_3tbbf5EJN8e18GGbyoOWIc4dJlq4Wti1dazOjg5ygm61nG/exec"
            )
            try:
                import time, random, string
                new_id = f"{int(time.time() * 1000)}_{(''.join(random.choices(string.ascii_lowercase + string.digits, k=5)))}"
                reservation_item = {
                    "id": new_id,
                    "createdAt": start_dt.isoformat(),
                    "customerName": name,
                    "customerPhone": data.get("tel", data.get("phone", "")),
                    "customerEmail": to_email,
                    "reservationDate": start_dt.isoformat(),
                    "serviceType": data.get("serviceType", "介護タクシー"),
                    "pickupLocation": data.get("from", data.get("pickupLocation", "")),
                    "dropoffLocation": data.get("to", data.get("dropoffLocation", "")),
                    "passengerCount": data.get("passengers", data.get("passengerCount", 1)),
                    "wheelchairNeeded": data.get("wheelchair", data.get("wheelchairNeeded", "不要")),
                    "careNotes": data.get("careNotes", ""),
                    "bookerType": data.get("bookerType", "本人"),
                    "staffName": data.get("bookerName", data.get("staffName", "")),
                    "staffTel": data.get("bookerTel", data.get("staffTel", "")),
                    "staffTelSameAsCustomer": data.get("bookerTelSame", False),
                    "familyHospitalStaffName": data.get("familyHospitalStaffName", ""),
                    "paymentMethod": data.get("payment", data.get("paymentMethod", "現金")),
                    "careReq": data.get("careReq", ""),
                    "memo": data.get("note", data.get("notes", data.get("memo", ""))),
                    "source": "reserve_app"
                }
                # GASにPOSTしてreservationsに追記させる
                # text/plainで送るとGASがリダイレクト後もPOSTを維持できる
                gas_payload = json.dumps({"addReservation": reservation_item}).encode("utf-8")
                gas_req = urllib.request.Request(
                    gas_url,
                    data=gas_payload,
                    headers={"Content-Type": "text/plain"},
                    method="POST"
                )
                # GASはリダイレクトするのでfollow_redirectsが必要
                opener = urllib.request.build_opener(urllib.request.HTTPRedirectHandler())
                with opener.open(gas_req, timeout=15) as gas_res:
                    gas_body = gas_res.read().decode("utf-8")
                    print(f"GAS sync: {gas_res.status} / {gas_body[:200]}")
            except Exception as e:
                print(f"GAS Sync Error (non-fatal): {e}")

        resp = jsonify({"status": "success", "calendarEventId": calendar_event_id, "travelEventId": travel_event_id})
        for k, v in _cors_headers().items():
            resp.headers[k] = v
        return resp
    except Exception as e:
        print(f"Reserve API Error: {e}")
        resp = jsonify({"error": str(e)})
        for k, v in _cors_headers().items():
            resp.headers[k] = v
        return resp, 500
