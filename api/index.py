from flask import Flask, request, jsonify
import datetime, json, os, smtplib, urllib.request
from email.mime.text import MIMEText
from google.oauth2 import service_account
from googleapiclient.discovery import build

app = Flask(__name__)
JST = datetime.timezone(datetime.timedelta(hours=9))

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

@app.route('/api/reserve', methods=['POST'])
def reserve():
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
        service.events().insert(calendarId=calendar_id, body=event).execute()

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
        service.events().insert(calendarId=calendar_id, body=travel_event).execute()

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
            gas_payload = json.dumps({"addReservation": reservation_item}).encode("utf-8")
            gas_req = urllib.request.Request(
                gas_url,
                data=gas_payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(gas_req, timeout=10) as gas_res:
                print(f"GAS sync: {gas_res.status}")
        except Exception as e:
            print(f"GAS Sync Error (non-fatal): {e}")

        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Reserve API Error: {e}")
        return jsonify({"error": str(e)}), 500
