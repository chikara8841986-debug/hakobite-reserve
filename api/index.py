from flask import Flask, request, jsonify
import datetime, json, os, smtplib, urllib.request
from email.mime.text import MIMEText
from google.oauth2 import service_account
from googleapiclient.discovery import build

app = Flask(__name__)
JST = datetime.timezone(datetime.timedelta(hours=9))

def get_service():
    try:
        # Vercelの環境変数に保存したJSONを読み込む設定
        info = json.loads(os.environ.get("GCP_SERVICE_ACCOUNT_JSON", "{}"))
        creds = service_account.Credentials.from_service_account_info(
            info, 
            scopes=['https://www.googleapis.com/auth/calendar']
        )
        # cache_discovery=False を追加し、Vercel環境でのファイル書き込みエラーを回避
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
        
        # パラメータ指定がない場合は現在時刻から60日分を取得
        if start and end:
            t_min = f"{start}T00:00:00+09:00"
            t_max = f"{end}T23:59:59+09:00"
        else:
            now = datetime.datetime.now(JST)
            t_min = now.isoformat()
            t_max = (now + datetime.timedelta(days=60)).isoformat()

        events_result = service.events().list(
            calendarId=os.environ.get("CALENDAR_ID"), 
            timeMin=t_min, 
            timeMax=t_max, 
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        # フロントエンドの照合用（includes）にUTCのISO文字列配列に変換して返す
        busy_slots = []
        for event in events:
            start_time = event['start'].get('dateTime')
            if start_time:
                # タイムゾーン情報を考慮してパース
                dt = datetime.datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                utc_iso = dt.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
                busy_slots.append(utc_iso)

        return jsonify(busy_slots)

    except Exception as e:
        print(f"API Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/reserve', methods=['POST'])
def reserve():
    data = request.json
    # ここに予約実行、LINE通知、メール送信のロジックを記述

    return jsonify({"status": "success"})
