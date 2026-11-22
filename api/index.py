from flask import Flask, request, jsonify
import datetime, json, os, re, smtplib, urllib.error, urllib.request
from email.mime.text import MIMEText
from google.oauth2 import service_account
from googleapiclient.discovery import build

app = Flask(__name__)
JST = datetime.timezone(datetime.timedelta(hours=9))

# 空き判定の設定（チューニング前提の定数）
# 空き判定のルール：「予約の開始30分前〜終了」が、「カレンダーの予定〜その終了30分後」と
# 1分でも重なったら予約不可。つまり予定が終わってから1時間（余白30分＋次の予約の移動30分）は
# 予約できない（代表確認 2026-10-16）。
# 画面側の〇×（src/App.jsx の isRangeBusy）も同じルールで判定しているので、ここを変えるときは必ずそろえる。
# ただし業務管理アプリの電話受付（allowTightSchedule を送ってくる）は、前の予定のあと1時間でも予約できる。
# そのときは「予約の時間そのもの（開始〜終了）が予定と重なるか」だけを見る（_is_overlapping。代表判断 2026-11-06）。
# さらに、業務管理のサーバーが署名した許可（overlapPermit）があれば、承知した予定とは重ねて入れられる（代表判断 2026-11-22）。
# 電話受付の画面（phoneConflicts）はこちらの判定とそろえてある。
TRAVEL_BUFFER_BEFORE_MIN = 30   # 予約開始前に確保する移動準備イベントぶんのバッファ
POST_BOOKING_MARGIN_MIN = 30    # 移動時間とは別に、予定の終了後に追加で空ける余白
BUSINESS_HOUR_START = 8         # 代替候補探索・開始時刻の下限
BUSINESS_HOUR_END = 18          # 代替候補探索・開始時刻の上限
SLOTS_DAYS_AHEAD = 60           # カレンダーの〇×のために何日先まで読むか

HAKOBITE_RESERVATION_API_URL = os.environ.get(
    "HAKOBITE_RESERVATION_API_URL",
    "https://hakobite-work.pages.dev/api/reservation",
)
LEGACY_GAS_URL = os.environ.get(
    "GAS_URL",
    "https://script.google.com/macros/s/AKfycbw6Ep8OOakgStBhAMd2P_3tbbf5EJN8e18GGbyoOWIc4dJlq4Wti1dazOjg5ygm61nG/exec",
)

def call_hakobite_reservation_api(payload: dict, timeout: int = 12):
    """予約アプリ専用APIを通して、許可された予約データだけを読み書きする。"""
    req = urllib.request.Request(
        HAKOBITE_RESERVATION_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Hakobite-Reservation-API/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        body = res.read().decode("utf-8")
    result = json.loads(body) if body else {}
    if not isinstance(result, dict) or result.get("ok") is False:
        raise RuntimeError((result or {}).get("error", "Hakobite reservation API request failed"))
    return result.get("result") or {}

def calendar_marks(data: dict) -> str:
    """カレンダーの予定名の頭に付ける印。車いすの種類（【リ】【普】【自】【不】）と、
    迎え先が病院なら🏥・それ以外（自宅・施設など）なら🏠。
    病院は「病院」「医院」のほか「医療センター」「クリニック」「診療所」も含める（丸亀医療センターなど）。"""
    w = str(data.get('wheelchair') or '')
    if 'リクライニング' in w:
        wc = '【リ】'
    elif '普通' in w:
        wc = '【普】'
    elif '自分' in w or '自前' in w or '持参' in w:
        wc = '【自】'
    elif w in ('利用なし', '不要', 'なし'):
        wc = '【不】'
    else:
        wc = ''  # 車いすの指定がない予約には付けない
    pickup = str(data.get('from') or '')
    place = '🏥' if re.search('病院|医院|医療センター|クリニック|診療所', pickup) else '🏠'
    return wc + place

def get_client_ip() -> str:
    """予約を送ってきた通信元のIPアドレス（Vercelが付ける X-Forwarded-For の先頭）"""
    return (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.headers.get("X-Real-IP", "")
        or request.remote_addr
        or ""
    )

def is_ip_blocked(ip: str) -> bool:
    """業務管理アプリの「予約者チェック」でブロックされた通信元か。
    確認に失敗したときは予約を止めない（本物のお客様の予約を落とさないため）。"""
    if not ip:
        return False
    try:
        result = call_hakobite_reservation_api({"action": "checkIp", "ip": ip}, timeout=5)
        return bool(result.get("blocked"))
    except Exception as e:
        print(f"IP block check failed (allowing): {e}")
        return False

def fallback_reservation_to_gas(reservation_item: dict):
    payload = json.dumps({"addReservation": reservation_item}).encode("utf-8")
    req = urllib.request.Request(
        LEGACY_GAS_URL,
        data=payload,
        headers={"Content-Type": "text/plain"},
        method="POST",
    )
    opener = urllib.request.build_opener(urllib.request.HTTPRedirectHandler())
    with opener.open(req, timeout=8) as gas_res:
        return gas_res.read().decode("utf-8")

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

def _get_busy_intervals_for_date(service, calendar_id, date_str):
    """指定日（JST）の終日でないイベントを (開始, 終了) のJST datetimeタプルのリストで返す。"""
    t_min = f"{date_str}T00:00:00+09:00"
    t_max = f"{date_str}T23:59:59+09:00"
    events_result = service.events().list(
        calendarId=calendar_id,
        timeMin=t_min, timeMax=t_max, singleEvents=True, orderBy='startTime'
    ).execute()
    busy = []
    for event in events_result.get('items', []):
        start_time = event['start'].get('dateTime')
        end_time = event['end'].get('dateTime')
        if start_time and end_time:
            dt_s = datetime.datetime.fromisoformat(start_time.replace('Z', '+00:00')).astimezone(JST)
            dt_e = datetime.datetime.fromisoformat(end_time.replace('Z', '+00:00')).astimezone(JST)
            busy.append((dt_s, dt_e))
    return busy

def _is_window_busy(busy_intervals, window_start, window_end):
    # 既存予約の終了直後は POST_BOOKING_MARGIN_MIN 分だけ広げて判定し、詰め込みすぎを防ぐ
    margin = datetime.timedelta(minutes=POST_BOOKING_MARGIN_MIN)
    return any(window_start < (b_end + margin) and window_end > b_start for b_start, b_end in busy_intervals)

def _is_overlapping(busy_intervals, start, end):
    """予約の時間そのもの（開始〜終了）が、カレンダーの予定と1分でも重なるか（移動・余白は見ない）。電話受付用。"""
    return any(start < b_end and end > b_start for b_start, b_end in busy_intervals)

def _find_alternative_starts(busy_intervals, base_date, duration_minutes, now, requested_start, before_limit=2, after_limit=2):
    """同日内で、移動バッファを含めて空いている開始時刻を、希望時刻より前と後それぞれ近い順に最大limit件ずつ返す。"""
    before_candidates = []
    after_candidates = []
    for hour in range(BUSINESS_HOUR_START, BUSINESS_HOUR_END + 1):
        for minute in range(0, 60, 15):
            if hour == BUSINESS_HOUR_END and minute > 0:
                continue
            cand_start = datetime.datetime(base_date.year, base_date.month, base_date.day, hour, minute, tzinfo=JST)
            if cand_start <= now:
                continue
            cand_end = cand_start + datetime.timedelta(minutes=duration_minutes)
            window_start = cand_start - datetime.timedelta(minutes=TRAVEL_BUFFER_BEFORE_MIN)
            if _is_window_busy(busy_intervals, window_start, cand_end):
                continue
            if cand_start < requested_start:
                before_candidates.append(cand_start)
            elif cand_start > requested_start:
                after_candidates.append(cand_start)
    before_candidates.sort(key=lambda c: abs((c - requested_start).total_seconds()))
    after_candidates.sort(key=lambda c: abs((c - requested_start).total_seconds()))
    before_selected = sorted(before_candidates[:before_limit])
    after_selected = sorted(after_candidates[:after_limit])
    return {
        "before": [c.strftime('%H:%M') for c in before_selected],
        "after": [c.strftime('%H:%M') for c in after_selected],
    }

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

def _list_event_times(service, calendar_id, t_min, t_max):
    """〇×に使う開始・終了だけを読む。予定名や説明欄まで読むと、期間を広げた分だけ遅くなる。
    Googleは何も指定しないと250件で切るので、続きがあれば読む（外から長い期間を指定されても5ページまで）。"""
    params = dict(calendarId=calendar_id, timeMin=t_min, timeMax=t_max, singleEvents=True, orderBy='startTime',
                  maxResults=2500, fields='items(start,end),nextPageToken')
    items = []
    for _ in range(5):
        page = service.events().list(**params).execute()
        items.extend(page.get('items', []))
        token = page.get('nextPageToken')
        if not token:
            break
        params['pageToken'] = token
    return items


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
            t_max = (now + datetime.timedelta(days=SLOTS_DAYS_AHEAD)).isoformat()

        events = _list_event_times(service, os.environ.get("CALENDAR_ID", "chikara8841986@gmail.com"), t_min, t_max)
        
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

        resp = jsonify(busy_slots)
        # 業務管理アプリの電話受付画面（別ドメイン）からも空き状況を読めるようにする
        for k, v in _cors_headers().items():
            resp.headers[k] = v
        return resp

    except Exception as e:
        print(f"API Error: {e}")
        resp = jsonify({"error": str(e)})
        for k, v in _cors_headers().items():
            resp.headers[k] = v
        return resp, 500

@app.route('/api/availability', methods=['GET'])
def get_availability():
    def _with_cors(resp):
        for k, v in _cors_headers().items():
            resp.headers[k] = v
        return resp

    date_str = request.args.get('date', '')
    start_str = request.args.get('start', '')
    duration_str = request.args.get('duration', '')

    try:
        year, month, day = (int(x) for x in date_str.split('-'))
        datetime.datetime(year, month, day)
    except Exception:
        return _with_cors(jsonify({"available": False, "error": "date は YYYY-MM-DD 形式で指定してください"})), 400

    try:
        start_h, start_m = (int(x) for x in start_str.split(':'))
        assert 0 <= start_h < 24 and 0 <= start_m < 60
    except Exception:
        return _with_cors(jsonify({"available": False, "error": "start は HH:MM 形式で指定してください"})), 400

    try:
        duration_minutes = int(duration_str)
        assert 30 <= duration_minutes <= 300
    except Exception:
        return _with_cors(jsonify({"available": False, "error": "duration は30〜300の範囲で指定してください"})), 400

    try:
        req_start = datetime.datetime(year, month, day, start_h, start_m, tzinfo=JST)
        req_end = req_start + datetime.timedelta(minutes=duration_minutes)
        window_start = req_start - datetime.timedelta(minutes=TRAVEL_BUFFER_BEFORE_MIN)
        now = datetime.datetime.now(JST)

        service = get_service()
        calendar_id = os.environ.get("CALENDAR_ID", "chikara8841986@gmail.com")
        busy = _get_busy_intervals_for_date(service, calendar_id, date_str)

        if req_start <= now:
            alternatives = _find_alternative_starts(busy, req_start.date(), duration_minutes, now, req_start)
            return _with_cors(jsonify({"available": False, "reason": "past", "alternatives": alternatives}))

        if _is_window_busy(busy, window_start, req_end):
            alternatives = _find_alternative_starts(busy, req_start.date(), duration_minutes, now, req_start)
            return _with_cors(jsonify({"available": False, "reason": "busy", "alternatives": alternatives}))

        return _with_cors(jsonify({"available": True}))
    except Exception as e:
        print(f"Availability API Error: {e}")
        return _with_cors(jsonify({"error": str(e)})), 500

def _cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


@app.route('/api/repeaters', methods=['POST', 'OPTIONS'])
def get_repeaters():
    if request.method == 'OPTIONS':
        resp = jsonify({})
        for k, v in _cors_headers().items():
            resp.headers[k] = v
        return resp

    try:
        body = request.get_json(silent=True) or {}
        data = call_hakobite_reservation_api({
            "action": "repeaters",
            "pin": str(body.get("pin", "")),
        })
        repeaters = data.get("repeaters", []) if isinstance(data, dict) else []
        resp = jsonify({"repeaters": repeaters})
        for k, v in _cors_headers().items():
            resp.headers[k] = v
        return resp
    except Exception as e:
        if isinstance(e, urllib.error.HTTPError) and e.code == 429:
            try:
                seconds = int(json.loads(e.read().decode('utf-8')).get('retryAfterSec') or 0)
            except Exception:
                seconds = 0
            minutes = max(1, (seconds + 59) // 60)
            wait = f'約{minutes}分後' if minutes <= 60 else '明日'
            resp = jsonify({"error": f"暗証番号の間違いが続いたため止めています。{wait}にもう一度お試しください。", "repeaters": []})
            for k, v in _cors_headers().items():
                resp.headers[k] = v
            return resp, 429
        print(f"Repeaters API Error: {e}")
        resp = jsonify({"error": "暗証番号が違うか、リピーター情報を取得できませんでした。", "repeaters": []})
        for k, v in _cors_headers().items():
            resp.headers[k] = v
        return resp, 403

@app.route('/api/reserve', methods=['POST', 'OPTIONS'])
def reserve():
    # CORSプリフライト対応
    if request.method == 'OPTIONS':
        resp = app.make_response('')
        for k, v in _cors_headers().items():
            resp.headers[k] = v
        return resp, 204

    # 連続予約の件数制限は設けない（代表判断 2026-10-31）。
    # かわりに、業務管理アプリの「予約者チェック」でブロックした通信元からの予約は受け付けない。
    client_ip = get_client_ip()
    if is_ip_blocked(client_ip):
        resp = jsonify({"error": "blocked", "message": "申し訳ありません、この通信環境からのご予約は受け付けておりません。お手数ですがお電話でご連絡ください。"})
        for k, v in _cors_headers().items():
            resp.headers[k] = v
        return resp, 403

    try:
        data = request.json
        start_str = data.get('start')
        duration_minutes = data.get('duration_minutes', 30)
        # カレンダーの予定名の頭に、車いすの種類と迎え先の印を付ける（例：【普】🏥【予約】山田 太郎様 (1時間)）
        summary = calendar_marks(data) + data.get('summary', '予約')
        description = data.get('description', '')
        name = data.get('name', 'お客様')
        to_email = data.get('email', '')

        service = get_service()
        start_dt = datetime.datetime.fromisoformat(start_str.replace('Z', '+00:00')).astimezone(JST)
        end_dt = start_dt + datetime.timedelta(minutes=duration_minutes)
        calendar_id = os.environ.get("CALENDAR_ID", "chikara8841986@gmail.com")

        # サーバー側の直前重複チェック（検索・入力の間に他の予約が入るダブルブッキングを防ぐ）
        window_start = start_dt - datetime.timedelta(minutes=TRAVEL_BUFFER_BEFORE_MIN)
        busy_at_submit = _get_busy_intervals_for_date(service, calendar_id, start_dt.strftime('%Y-%m-%d'))
        if data.get('allowTightSchedule'):
            # 電話受付：前の予定のあと1時間の余白は求めない（電話口で移動が間に合うか確かめて入れるため）
            # 予定との重なりは、合言葉を通った人が承知した分（署名つきの許可）だけ通す
            conflict = _is_overlapping(busy_at_submit, start_dt, end_dt) and not _overlap_permitted(
                data.get('overlapPermit'), busy_at_submit, start_dt, end_dt)
        else:
            conflict = _is_window_busy(busy_at_submit, window_start, end_dt)
        if conflict:
            resp = jsonify({"error": "conflict", "message": "申し訳ありません、直前に別のご予約が入りました。別の時間で再度お試しください。"})
            for k, v in _cors_headers().items():
                resp.headers[k] = v
            return resp, 409

        # カレンダーへ予約本体を追加
        event = {
            'summary': summary,
            'description': description,
            'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Asia/Tokyo'},
            'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'Asia/Tokyo'},
        }
        created_event = service.events().insert(calendarId=calendar_id, body=event).execute()
        calendar_event_id = created_event.get('id')

        # カレンダーへ移動時間（予約開始30分前）を追加
        travel_end_dt = start_dt
        travel_start_dt = start_dt - datetime.timedelta(minutes=30)
        # 移動の予定名にも、予約本体と同じ印を付ける（例：【普】🏥【移動】山田 太郎様のお迎え準備）
        travel_summary = calendar_marks(data) + data.get('gcalTravelSummary', f'【移動】{name}様のお迎え準備')
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

        # 業務管理アプリから呼ばれた場合は重複保存を避ける。
        # 変数名は既存フロントとの互換性のため維持する。
        skip_gas = data.get("skipGasSync", False)
        if not skip_gas:
            try:
                import time, random, string
                new_id = f"{int(time.time() * 1000)}_{(''.join(random.choices(string.ascii_lowercase + string.digits, k=5)))}"
                reservation_item = {
                    "id": new_id,
                    "createdAt": datetime.datetime.now(JST).isoformat(),
                    "customerName": name,
                    "customerPhone": data.get("tel", data.get("phone", "")),
                    "customerEmail": to_email,
                    "reservationDate": start_dt.isoformat(),
                    "startTime": start_dt.strftime("%H:%M"),
                    "endTime": end_dt.strftime("%H:%M"),
                    "serviceType": data.get("serviceType", "介護タクシー"),
                    "pickupLocation": data.get("from", data.get("pickupLocation", "")) + (f"（{data.get('wardRoom')}）" if data.get("wardRoom") else ""),
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
                    "calendarEventId": calendar_event_id or "",
                    "travelEventId": travel_event_id or "",
                    "clientIp": client_ip,
                    "source": "reserve_app"
                }
                call_hakobite_reservation_api({
                    "action": "create",
                    "reservation": reservation_item,
                })
            except Exception as e:
                print(f"Reservation Supabase API Error; trying GAS fallback: {e}")
                try:
                    if "reservation_item" in locals():
                        fallback_reservation_to_gas(reservation_item)
                except Exception as fallback_error:
                    print(f"GAS fallback error (non-fatal): {fallback_error}")

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


# ---- 業務管理アプリで予約を直したとき・消したときに、Googleカレンダーの予定も合わせる ----
# 流れ：業務管理アプリ → 業務管理のサーバー（/api/db。4桁の合言葉で守られている）が「変更の指示」に署名して
# ここへ送る → ここは業務管理のサーバー（/api/reservation の verifyCalendarJob）に「本物の署名か」を確かめてから
# カレンダーを書き換える。署名の鍵は業務管理のサーバーだけが持っているので、ここを直接たたいても何もできない。
CALENDAR_JOB_MAX_BYTES = 20 * 1024
EVENT_ID_RE = re.compile(r'^[A-Za-z0-9_@.\-]{1,300}$')
WHEELCHAIR_MARK_RE = re.compile(r'^(【[リ普自不]】)')


def duration_label(minutes: int) -> str:
    h, m = divmod(int(minutes), 60)
    if h == 0:
        return f'{m}分'
    return f'{h}時間' if m == 0 else f'{h}時間{m}分'


def merge_description(desc: str, fields, stamp: str) -> str:
    """説明欄の「■項目: 値」の行のうち、変わった項目だけを書き換える（ない項目は「■受付」の前に足す）。
    ほかの行（メール・支払など、業務管理アプリで直さない情報）はそのまま残す。最後に「■変更」の行を付け直す。"""
    lines = (desc or '').split('\n')

    def put(key, value):
        prefix = f'■{key}:'
        new_line = f'{prefix} {value}'
        for i, line in enumerate(lines):
            if line.startswith(prefix):
                lines[i] = new_line
                return
        anchor = next((i for i, line in enumerate(lines) if line.startswith('■受付:')), None)
        if anchor is None:
            lines.append(new_line)
        else:
            lines.insert(anchor, new_line)

    for key, value in fields:
        put(str(key), str(value).replace('\r', '').replace('\n', ' / '))
    stamp_prefix = '■変更:'
    lines[:] = [line for line in lines if not line.startswith(stamp_prefix)]
    while lines and not lines[-1].strip():
        lines.pop()
    lines.append(f'{stamp_prefix} {stamp}')
    return '\n'.join(lines)


def _http_status(err) -> int:
    resp = getattr(err, 'resp', None)
    try:
        return int(getattr(resp, 'status', 0) or 0)
    except Exception:
        return 0


def _get_event(service, calendar_id, event_id):
    """予定を読む。なければ（消されている・取り消し済み）None。"""
    try:
        ev = service.events().get(calendarId=calendar_id, eventId=event_id).execute()
    except Exception as e:
        if _http_status(e) in (404, 410):
            return None
        raise
    if not ev or ev.get('status') == 'cancelled':
        return None
    return ev


def _delete_event(service, calendar_id, event_id) -> str:
    try:
        service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
        return 'deleted'
    except Exception as e:
        if _http_status(e) in (404, 410):
            return 'already_gone'
        raise


def _verify_calendar_job(job_text: str, sig: str) -> bool:
    """業務管理のサーバーに、この指示が本物（自分が署名したもの・期限内）かを確かめてもらう。
    確かめられないときは書き換えない（安全側）。"""
    try:
        result = call_hakobite_reservation_api({"action": "verifyCalendarJob", "job": job_text, "sig": sig}, timeout=8)
        return result.get("valid") is True
    except Exception as e:
        print(f"Calendar job verification failed: {e}")
        return False


def _overlap_permitted(permit, busy_intervals, start, end) -> bool:
    """重ねて予約してよいか。業務管理のサーバーの署名があり、開始・終了が同じで、
    いま重なっている予定がすべて「承知した予定」に入っているときだけ True。
    （確認している間に入った別の予約とは重ねない。同じ許可の使い回しも、入れた予約自体と重なるので通らない）"""
    if not isinstance(permit, dict):
        return False
    job_text, sig = permit.get('job'), permit.get('sig')
    if not isinstance(job_text, str) or not isinstance(sig, str) or len(job_text.encode('utf-8')) > CALENDAR_JOB_MAX_BYTES:
        return False
    if not _verify_calendar_job(job_text, sig):
        return False
    try:
        job = json.loads(job_text)
        ms = lambda dt: int(dt.timestamp()) * 1000
        if job.get('op') != 'overlap' or job.get('startMs') != ms(start) or job.get('endMs') != ms(end):
            return False
        known = [tuple(pair) for pair in job['known']]
        for b_start, b_end in busy_intervals:
            if start < b_end and end > b_start:
                known.remove((ms(b_start), ms(b_end)))  # 承知していない予定なら ValueError
        return True
    except (ValueError, TypeError, KeyError, AttributeError):
        return False


@app.route('/api/calendar-sync', methods=['POST'])
def calendar_sync():
    data = request.get_json(silent=True) or {}
    job_text = data.get('job')
    sig = data.get('sig')
    if not isinstance(job_text, str) or not isinstance(sig, str) or len(job_text.encode('utf-8')) > CALENDAR_JOB_MAX_BYTES:
        return jsonify({"ok": False, "error": "bad_request"}), 400
    if not _verify_calendar_job(job_text, sig):
        return jsonify({"ok": False, "error": "forbidden"}), 403
    try:
        job = json.loads(job_text)
        now_ms = datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000
        if not isinstance(job, dict) or float(job.get('exp') or 0) < now_ms:
            return jsonify({"ok": False, "error": "expired"}), 403
        op = job.get('op')
        event_id = str(job.get('eventId') or '')
        travel_id = str(job.get('travelEventId') or '')
        if op not in ('update', 'delete') or not EVENT_ID_RE.match(event_id) or (travel_id and not EVENT_ID_RE.match(travel_id)):
            return jsonify({"ok": False, "error": "bad_job"}), 400

        service = get_service()
        calendar_id = os.environ.get("CALENDAR_ID", "chikara8841986@gmail.com")

        if op == 'delete':
            main = _delete_event(service, calendar_id, event_id)
            travel = _delete_event(service, calendar_id, travel_id) if travel_id else 'none'
            return jsonify({"ok": True, "main": main, "travel": travel})

        minutes = int(job.get('minutes') or 0)
        if not (15 <= minutes <= 720):
            return jsonify({"ok": False, "error": "bad_minutes"}), 400
        start_dt = datetime.datetime.fromisoformat(str(job.get('start')).replace('Z', '+00:00')).astimezone(JST)
        end_dt = start_dt + datetime.timedelta(minutes=minutes)
        name = str(job.get('name') or 'お客様').strip()[:100]
        fields = job.get('fields') if isinstance(job.get('fields'), list) else []
        fields = [(str(f[0])[:30], str(f[1])[:1000]) for f in fields[:20] if isinstance(f, list) and len(f) == 2]
        stamp = '業務管理アプリで修正（' + datetime.datetime.now(JST).strftime('%Y/%m/%d %H:%M') + '）'

        ev = _get_event(service, calendar_id, event_id)
        if ev is None:
            main = 'missing'
            marks = calendar_marks({'wheelchair': job.get('wheelchair'), 'from': job.get('from')})
        else:
            marks = calendar_marks({'wheelchair': job.get('wheelchair'), 'from': job.get('from')})
            # 車いすの種類がこちらで分からないときは、いま付いている印（【リ】など）を残す
            if not WHEELCHAIR_MARK_RE.match(marks):
                kept = WHEELCHAIR_MARK_RE.match(ev.get('summary') or '')
                if kept:
                    marks = kept.group(1) + marks
            body = {
                'summary': marks + f'【予約】{name}様 ({duration_label(minutes)})',
                'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Asia/Tokyo'},
                'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'Asia/Tokyo'},
                'description': merge_description(ev.get('description', ''), fields, stamp),
            }
            service.events().patch(calendarId=calendar_id, eventId=event_id, body=body).execute()
            main = 'updated'

        travel = 'none'
        if travel_id:
            tev = _get_event(service, calendar_id, travel_id)
            if tev is None:
                travel = 'missing'
            else:
                tbody = {
                    'summary': marks + f'【移動】{name}様のお迎え準備',
                    'start': {'dateTime': (start_dt - datetime.timedelta(minutes=30)).isoformat(), 'timeZone': 'Asia/Tokyo'},
                    'end': {'dateTime': start_dt.isoformat(), 'timeZone': 'Asia/Tokyo'},
                }
                service.events().patch(calendarId=calendar_id, eventId=travel_id, body=tbody).execute()
                travel = 'updated'
        return jsonify({"ok": True, "main": main, "travel": travel})
    except Exception as e:
        print(f"Calendar sync error: {e}")
        return jsonify({"ok": False, "error": "calendar_error"}), 502
