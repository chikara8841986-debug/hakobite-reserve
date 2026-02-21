from flask import Flask, request, jsonify
import datetime, json, os, smtplib, urllib.request
from email.mime.text import MIMEText
from google.oauth2 import service_account
from googleapiclient.discovery import build

app = Flask(__name__)
JST = datetime.timezone(datetime.timedelta(hours=9))

def get_service():
    # Vercelの環境変数に保存したJSONを読み込む設定
    info = json.loads(os.environ.get("GCP_SERVICE_ACCOUNT_JSON"))
    creds = service_account.Credentials.from_service_account_info(info, 
        scopes=['https://www.googleapis.com/auth/calendar'])
    return build('calendar', 'v3', credentials=creds)

@app.route('/api/slots', methods=['GET'])
def get_slots():
    start = request.args.get('start')
    end = request.args.get('end')
    service = get_service()
    t_min = f"{start}T00:00:00+09:00"
    t_max = f"{end}T23:59:59+09:00"
    events = service.events().list(calendarId=os.environ.get("CALENDAR_ID"), 
        timeMin=t_min, timeMax=t_max, singleEvents=True).execute()
    return jsonify(events.get('items', []))

@app.route('/api/reserve', methods=['POST'])
def reserve():
    data = request.json
    # ここに予約実行、LINE通知、メール送信のロジックを記述
    return jsonify({"status": "success"})