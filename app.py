import streamlit as st
import streamlit.components.v1 as components
import datetime
import smtplib
import json
import urllib.request
from email.mime.text import MIMEText
from google.oauth2 import service_account
from googleapiclient.discovery import build

# ページ設定
st.set_page_config(page_title="ハコビテ 予約システム", page_icon="🚕", layout="wide")

# ---------------------------------------------------------
# 設定エリア & Secrets読み込み
# ---------------------------------------------------------
try:
    CALENDAR_ID = st.secrets.get("target_calendar_id")
    if not CALENDAR_ID:
         CALENDAR_ID = 'chikara8841986@gmail.com'
except:
    CALENDAR_ID = 'chikara8841986@gmail.com'

# 日本時間（JST）の定義
JST = datetime.timezone(datetime.timedelta(hours=9))

# ---------------------------------------------------------
# CSSスタイル定義
# ---------------------------------------------------------
st.markdown("""
<style>
/* 1. 基本設定 */
.stApp {
    background-color: #FFFDF5 !important;
    color: #333333 !important;
}
p, div, label, span, h1, h2, h3, h4, h5, h6 {
    color: #333333;
}
h1, h2, h3, h4, h5, h6, .stTextInput > label, .stTextArea > label, .stSelectbox > label, .stRadio > label {
    color: #006400 !important;
    font-family: "Helvetica Neue", Arial, sans-serif;
}
div.stButton > button {
    width: 100%;
    border-radius: 8px;
    font-weight: bold;
    border: 2px solid #006400; 
    background-color: #E8F5E9; 
    color: #006400; 
    transition: all 0.3s;
}
div.stButton > button:hover {
    background-color: #006400;
    color: white;
}
[data-testid="stForm"] button {
    background-color: #FF8C00 !important;
    color: white !important;
    border: none !important;
}
[data-testid="stForm"] button:hover {
    background-color: #E07B00 !important;
}
.stTextInput > div > div > input, 
.stTextArea > div > div > textarea, 
.stSelectbox > div > div > div {
    background-color: #FFFFFF !important;
    color: #333333 !important;
}
.required-label:after {
    content: " *";
    color: #FF8C00;
}
div[data-baseweb="select"] > div {
    background-color: #FFFFFF !important;
    color: #333333 !important;
    border-color: #ccc !important;
}
div[data-baseweb="popover"],
div[data-baseweb="menu"],
div[data-baseweb="popover"] div {
    background-color: #FFFFFF !important;
    color: #333333 !important;
}
li[role="option"] {
    color: #333333 !important;
    background-color: #FFFFFF !important;
}
li[role="option"]:hover, li[role="option"][aria-selected="true"] {
    background-color: #E8F5E9 !important;
    color: #006400 !important;
}
.stRadio label p {
    color: #333333 !important;
}
div[role="radiogroup"] > label > div:first-child {
    border-color: #009688 !important;
    background-color: #009688 !important;
}
div[role="radiogroup"] > label > div:first-child > div {
    border-color: #009688 !important;
}

/* ===== 予約テーブル専用スタイル ===== */
.booking-table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 10px;
}
.booking-table {
    border-collapse: collapse;
    min-width: 520px;
    width: 100%;
    background: #fff;
    font-size: 0.82em;
}
.booking-table th {
    background-color: #E8F5E9;
    color: #006400;
    border: 1px solid #ccc;
    padding: 6px 4px;
    text-align: center;
    white-space: nowrap;
    font-weight: bold;
}
.booking-table th.time-header {
    background-color: #006400;
    color: white;
    min-width: 52px;
    position: sticky;
    left: 0;
    z-index: 3;
}
.booking-table td {
    border: 1px solid #ddd;
    padding: 3px 4px;
    text-align: center;
    vertical-align: middle;
    white-space: nowrap;
}
.booking-table td.time-col {
    position: sticky;
    left: 0;
    background-color: #f9f9f9;
    color: #555;
    font-size: 0.85em;
    font-weight: bold;
    z-index: 2;
    min-width: 52px;
    border-right: 2px solid #ccc;
}
.booking-table td.available {
    background-color: #fff0f5;
}
.booking-table td.available a {
    color: #e0004e;
    text-decoration: none;
    font-size: 1.3em;
    font-weight: bold;
    display: block;
    padding: 2px 0;
}
.booking-table td.available a:hover {
    color: #ff6699;
}
.booking-table td.booked {
    background-color: #f8f8f8;
    color: #bbb;
    font-size: 1.1em;
}
.booking-table td.past {
    background-color: #f0f0f0;
    color: #ccc;
    font-size: 1.1em;
}
.booking-table tr:nth-child(even) td.time-col {
    background-color: #f3f3f3;
}
.legend-box {
    display: flex;
    gap: 18px;
    font-size: 0.85em;
    color: #555;
    margin: 8px 0 12px 0;
    align-items: center;
}
.legend-circle { color: #e0004e; font-weight: bold; font-size: 1.1em; }
.legend-x { color: #bbb; font-size: 1.1em; }
.nav-info {
    background-color: #E8F5E9;
    border: 1px solid #006400;
    color: #006400;
    padding: 8px 12px;
    border-radius: 5px;
    font-size: 0.88em;
    text-align: center;
    margin-bottom: 12px;
    font-weight: bold;
}
</style>
""", unsafe_allow_html=True)

# ---------------------------------------------------------
# 認証・API初期化
# ---------------------------------------------------------
if "gcp_service_account" in st.secrets:
    creds_dict = dict(st.secrets["gcp_service_account"])
    creds = service_account.Credentials.from_service_account_info(
        creds_dict,
        scopes=['https://www.googleapis.com/auth/calendar']
    )
    service = build('calendar', 'v3', credentials=creds)
else:
    st.error("Secretsに認証情報(gcp_service_account)が設定されていません。")
    st.stop()

# ---------------------------------------------------------
# 関数定義
# ---------------------------------------------------------
def to_calendar():
    st.session_state.selected_slot = None
    st.session_state.booking_success = False
    st.session_state.page = 'calendar'

def to_booking(target_dt):
    st.session_state.selected_slot = target_dt
    st.session_state.page = 'booking'
    st.session_state.booking_success = False

def get_events(start_date, end_date):
    t_min = datetime.datetime.combine(start_date, datetime.time.min).replace(tzinfo=JST).isoformat()
    t_max = datetime.datetime.combine(end_date, datetime.time.max).replace(tzinfo=JST).isoformat()
    try:
        events_result = service.events().list(
            calendarId=CALENDAR_ID, timeMin=t_min, timeMax=t_max,
            singleEvents=True, orderBy='startTime'
        ).execute()
        return events_result.get('items', [])
    except Exception as e:
        st.error(f"カレンダー情報の取得に失敗しました: {e}")
        return []

def check_conflict(start_dt, end_dt):
    try:
        events_result = service.events().list(
            calendarId=CALENDAR_ID, timeMin=start_dt.isoformat(), timeMax=end_dt.isoformat(),
            singleEvents=True, orderBy='startTime'
        ).execute()
        items = events_result.get('items', [])
        return len(items) > 0 
    except Exception as e:
        st.error(f"重複チェックエラー: {e}")
        return True

def add_event(summary, start_dt, end_dt, description=""):
    event = {
        'summary': summary,
        'description': description,
        'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Asia/Tokyo'},
        'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'Asia/Tokyo'},
    }
    service.events().insert(calendarId=CALENDAR_ID, body=event).execute()

def send_line_notification(message):
    if "line" not in st.secrets: return False
    url = "https://api.line.me/v2/bot/message/push"
    token = st.secrets["line"]["channel_access_token"]
    user_id = st.secrets["line"]["user_id"]
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    data = {
        "to": user_id,
        "messages": [{"type": "text", "text": message}]
    }
    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode("utf-8"), 
            headers=headers, 
            method="POST"
        )
        with urllib.request.urlopen(req) as res:
            return True
    except Exception as e:
        st.error(f"LINE送信エラー: {e}")
        return False

def send_confirmation_email(to_email, name, booking_details):
    if "email" not in st.secrets: return False
    sender_email = st.secrets["email"]["sender_address"] 
    sender_password = st.secrets["email"]["sender_password"]
    subject = "【ハコビテ】ご予約ありがとうございます"
    body = f"""
{name} 様

この度は「ハコビテ」をご予約いただき、誠にありがとうございます。
以下の内容でご予約を承りました。

--------------------------------------------------
{booking_details}
--------------------------------------------------

ご不明な点がございましたら、お気軽にご連絡ください。

介護タクシー・生活支援 ハコビテ
電話: 080-4950-6821
"""
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
        return True
    except Exception as e:
        st.error(f"メール送信エラー: {e}")
        return False

# ---------------------------------------------------------
# メイン処理
# ---------------------------------------------------------
today = datetime.date.today()

# ★ クエリパラメータで予約スロットが渡された場合は予約ページへ遷移
if "slot" in st.query_params:
    try:
        slot_str = st.query_params["slot"]
        slot_dt = datetime.datetime.fromisoformat(slot_str)
        st.query_params.clear()
        to_booking(slot_dt)
        st.rerun()
    except Exception:
        st.query_params.clear()

if 'current_date' not in st.session_state:
    st.session_state.current_date = today 
if 'selected_slot' not in st.session_state:
    st.session_state.selected_slot = None
if 'page' not in st.session_state:
    st.session_state.page = 'calendar'
if 'booking_success' not in st.session_state:
    st.session_state.booking_success = False

# ---------------------------------------------------------
# ページ1: カレンダー画面（テーブル形式）
# ---------------------------------------------------------
if st.session_state.page == 'calendar':
    st.markdown("<h1 style='text-align: center;'>ハコビテ 予約フォーム</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #555;'>丸亀・善通寺の介護タクシー＆生活支援</p>", unsafe_allow_html=True)

    # --- ナビゲーション ---
    max_future_date = today + datetime.timedelta(days=60)
    col_nav1, col_nav2, col_nav3 = st.columns([1, 4, 1])

    with col_nav1:
        if st.session_state.current_date > today:
            if st.button("← 前の週", key="prev_week", use_container_width=True):
                st.session_state.current_date -= datetime.timedelta(days=7)
                if st.session_state.current_date < today:
                    st.session_state.current_date = today
                st.rerun()
        else:
            st.button("← 前の週", key="prev_week_dis", disabled=True, use_container_width=True)

    with col_nav3:
        if st.session_state.current_date + datetime.timedelta(days=7) <= max_future_date:
            if st.button("次の週 →", key="next_week", use_container_width=True):
                st.session_state.current_date += datetime.timedelta(days=7)
                st.rerun()
        else:
            st.button("次の週 →", key="next_week_dis", disabled=True, use_container_width=True)

    # 表示する7日間を計算
    start_display_date = st.session_state.current_date
    week_dates = [start_display_date + datetime.timedelta(days=i) for i in range(7)]
    week_label_start = start_display_date.strftime('%m/%d')
    week_label_end = week_dates[-1].strftime('%m/%d')

    with col_nav2:
        st.markdown(
            f"<h3 style='text-align: center;'>{week_label_start} ～ {week_label_end} の空き状況</h3>",
            unsafe_allow_html=True
        )

    # スマホ向け案内
    st.markdown(
        '<div class="nav-info">📱 スマートフォンの方は表を左右にスクロールできます</div>',
        unsafe_allow_html=True
    )

    # 凡例
    st.markdown(
        '<div class="legend-box">'
        '<span class="legend-circle">○</span> 予約できます&nbsp;&nbsp;'
        '<span class="legend-x">×</span> 予約不可・満席'
        '</div>',
        unsafe_allow_html=True
    )

    # カレンダーデータ取得
    existing_events = get_events(week_dates[0], week_dates[-1])

    # 時間スロット生成（8:00〜18:30、30分刻み）
    times = []
    for h in range(8, 19):
        times.append(datetime.time(hour=h, minute=0))
        if h < 18:
            times.append(datetime.time(hour=h, minute=30))

    weekdays_ja = ["月", "火", "水", "木", "金", "土", "日"]

    # --- HTMLテーブルを生成 ---
    html = ['<div class="booking-table-wrapper"><table class="booking-table">']

    # ヘッダー行：時間列＋各日付
    html.append('<thead><tr>')
    html.append('<th class="time-header">時間</th>')
    for d in week_dates:
        day_str = weekdays_ja[d.weekday()]
        color = ""
        if d.weekday() == 5:   # 土
            color = "color:#1a6bcc;"
        elif d.weekday() == 6: # 日
            color = "color:#cc1a1a;"
        html.append(
            f'<th style="{color}">{d.month}/{d.day}<br>({day_str})</th>'
        )
    html.append('</tr></thead>')

    # データ行：各時間 × 各日付
    html.append('<tbody>')
    now_jst = datetime.datetime.now(JST)

    for time in times:
        html.append('<tr>')
        html.append(f'<td class="time-col">{time.hour}:{time.minute:02d}</td>')

        for d in week_dates:
            slot_start = datetime.datetime.combine(d, time).replace(tzinfo=JST)
            slot_end   = slot_start + datetime.timedelta(minutes=30)
            is_past    = slot_start < now_jst

            # 予約済み判定
            is_booked = False
            for event in existing_events:
                start_str = event['start'].get('dateTime')
                end_str   = event['end'].get('dateTime')
                if start_str and end_str:
                    ev_start = datetime.datetime.fromisoformat(start_str).astimezone(JST)
                    ev_end   = datetime.datetime.fromisoformat(end_str).astimezone(JST)
                    if ev_end > slot_start and ev_start < slot_end:
                        is_booked = True
                        break

            if is_past:
                html.append('<td class="past">×</td>')
            elif is_booked:
                html.append('<td class="booked">×</td>')
            else:
                # ○ をクリックするとクエリパラメータ経由で予約ページへ
                slot_iso = slot_start.strftime('%Y-%m-%dT%H:%M:%S')
                html.append(
                    f'<td class="available"><a href="?slot={slot_iso}">○</a></td>'
                )

        html.append('</tr>')

    html.append('</tbody></table></div>')

    st.markdown('\n'.join(html), unsafe_allow_html=True)

# ---------------------------------------------------------
# ページ2: 予約詳細入力フォーム（または完了画面）
# ---------------------------------------------------------
elif st.session_state.page == 'booking':
    components.html(
        """
            <script>
                try {
                    window.parent.scrollTo(0, 0);
                    var doc = window.parent.document;
                    var elements = doc.querySelectorAll('section.main, div[data-testid="stAppViewContainer"], body, html');
                    elements.forEach(function(el) {
                        el.scrollTop = 0;
                    });
                } catch(e) {}
            </script>
        """,
        height=0
    )

    if st.session_state.booking_success:
        st.success("予約が完了しました！")
        st.info("管理者へ通知を送信しました。") 
        st.balloons()
        
        st.markdown("""
        <div style="background-color: white; padding: 20px; border-radius: 10px; border: 2px solid #006400; text-align: center;">
            <h3 style="color: #006400;">ご予約ありがとうございます</h3>
            <p>確認メールをお送りしましたのでご確認ください。</p>
            <p>※メールが届かない場合は、迷惑メールフォルダもご確認ください。</p>
        </div>
        <br>
        """, unsafe_allow_html=True)

        st.button("トップページ（カレンダー）へ戻る", on_click=to_calendar)

    else:
        st.button("← カレンダーに戻る", on_click=to_calendar)

        if st.session_state.selected_slot:
            slot = st.session_state.selected_slot
            w_list = ['月', '火', '水', '木', '金', '土', '日']
            date_str = f"{slot.year}/{slot.month}/{slot.day} ({w_list[slot.weekday()]}) {slot.hour}:{slot.minute:02d} ～"

            st.markdown(
                f"""
                <div style="background-color: white; padding: 20px; border-radius: 10px; border: 1px solid #FF8C00; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px;">
                <h2 style="margin-top:0; color:#006400; text-align: center;">📝 予約情報の入力</h2>
                <hr>
                <p style="font-size:1.2em; text-align: center;">開始日時: <span style="color:#FF8C00; font-weight:bold; font-size: 1.3em;">{date_str}</span></p>
                </div>
                """, 
                unsafe_allow_html=True
            )
            
            with st.form("booking_form"):
                st.markdown("##### 1. ご利用時間（目安）")
                duration_options = {
                    "30分": 30, "1時間": 60, "1時間30分": 90, "2時間": 120,
                    "2時間30分": 150, "3時間": 180, "4時間": 240, "5時間": 300
                }
                selected_duration = st.selectbox("ご利用予定時間を選択してください *", list(duration_options.keys()))
                duration_minutes = duration_options[selected_duration]
                st.caption("※「介護タクシー」「お手伝い支援」以外のサービスをご利用の場合は、「30分」を選択してください。")

                st.markdown("---")
                st.markdown("##### 2. お客様情報")
                col_f1, col_f2 = st.columns(2)
                with col_f1:
                    name = st.text_input("お名前 *")
                with col_f2:
                    tel = st.text_input("電話番号 *", placeholder="090-0000-0000")
                email = st.text_input("メールアドレス", placeholder="予約完了通知を受け取る場合に記入")

                st.markdown("---")
                st.markdown("##### 3. サービス内容")
                service_options = [
                    "介護タクシー（保険外）外出支援", "買い物支援（リカーショップはやし限定）",
                    "お手伝い支援", "安否確認サービス ￥2,000(税込)"
                ]
                service_type = st.radio("ご利用を希望されるサービスを選択してください *", service_options)

                st.markdown("---")
                st.markdown("##### 4. 行程")
                location_from = st.text_area("お迎え場所・ご利用場所 * (150字まで)", max_chars=150)
                location_to = st.text_area("行き先（介護タクシーご利用の場合） (150字まで)", max_chars=150)

                st.markdown("---")
                st.markdown("##### 5. 詳細オプション")
                wheelchair_opts = [
                    "自分の車いすを使用", "普通車いすをレンタル希望 ￥500(税込)",
                    "リクライニング車いすを希望 ￥700(税込)", "ストレッチャー希望（要相談）", "利用なし"
                ]
                wheelchair = st.radio("車いすの利用について *", wheelchair_opts)
                care_opts = ["見守りのみ", "移乗介助が必要（ベッドから車椅子への移動手伝い）", "階段介助あり（要事前相談）"]
                care_req = st.radio("介助は必要ですか？", care_opts, index=0)
                passengers_opts = ["１名のみ", "２名", "３名"]
                passengers = st.radio("同乗者の人数", passengers_opts, index=0)
                is_same_person = st.radio("ご利用者とご予約者は同じですか？ *", ["はい", "いいえ"])
                st.caption("※「いいえ」の場合は、備考欄に当日伺う先のお名前とご住所を記載ください")

                st.markdown("---")
                st.markdown("##### 6. お支払い方法")
                payment_methods = ["現金", "銀行振込", "請求書払い（法人）", "掛け払い"]
                payment = st.radio("お支払い方法を選択してください *", payment_methods)

                st.markdown("---")
                note = st.text_area("備考・ご要望 (150字まで)", placeholder="何か気になることがあればご自由にどうぞ！", max_chars=150)
                st.markdown("<br>", unsafe_allow_html=True)
                
                submitted = st.form_submit_button("予約を確定する", use_container_width=True)

            if submitted:
                if not name or not tel or not location_from:
                    st.error("必須項目（名前、電話番号、お迎え場所）を入力してください。")
                else:
                    start_dt = slot.replace(tzinfo=JST)
                    end_dt = start_dt + datetime.timedelta(minutes=duration_minutes)
                    
                    with st.spinner('空き状況を最終確認中...'):
                        is_conflict = check_conflict(start_dt, end_dt)
                    
                    if is_conflict:
                        st.error(f"申し訳ありません。選択された時間帯（{selected_duration}）だと、途中で他の予約が入っているため予約できません。時間を短くするか、別の開始時間をお試しください。")
                    else:
                        final_date_str = f"{slot.year}/{slot.month}/{slot.day} {slot.hour}:{slot.minute:02d}～{end_dt.hour}:{end_dt.minute:02d}"
                        details_text = f"""
■日時: {final_date_str} ({selected_duration})
■サービス: {service_type}
■お名前: {name}
■電話: {tel}
■場所: {location_from}
■行先: {location_to}
■車椅子: {wheelchair}
■介助: {care_req}
■同乗: {passengers}
■本人確認: ご予約者と{'同じ' if is_same_person == 'はい' else '異なる'}
■支払い: {payment}
■備考: {note}
"""
                        summary = f"【予約】{name}様 ({selected_duration}) - {service_type}"
                        try:
                            with st.spinner('予約処理中...'):
                                add_event(summary, start_dt, end_dt, details_text)
                                if email:
                                    send_confirmation_email(email, name, details_text)
                                line_msg = f"🔔 新しい予約が入りました！\n\n{summary}\n\n{details_text}"
                                send_line_notification(line_msg)
                                st.session_state.booking_success = True
                                st.rerun()
                        except Exception as e:
                            st.error(f"システムエラーが発生しました: {e}")
