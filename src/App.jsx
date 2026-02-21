import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

// --- 共通設定・CSS ---
const C = { green: "#006400", orange: "#FF8C00", cream: "#FFFDF5", white: "#fff" };

const GlobalStyle = () => (
  <style>{`
    body { background-color: ${C.cream}; color: #333; font-family: "Helvetica Neue", Arial, sans-serif; margin: 0; }
    .nav-info { background-color: #E8F5E9; border: 1px solid #006400; color: #006400; padding: 8px 12px; border-radius: 5px; font-size: 0.88em; text-align: center; margin-bottom: 12px; font-weight: bold; }
    .legend-box { display: flex; gap: 18px; font-size: 0.85em; color: #555; margin: 8px 0 12px 0; align-items: center; justify-content: center; }
    .legend-circle { color: #e0004e; font-weight: bold; font-size: 1.1em; }
    .legend-x { color: #bbb; font-size: 1.1em; }
    .booking-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px; background: #fff; }
    .booking-table { border-collapse: collapse; min-width: 520px; width: 100%; font-size: 0.85em; }
    .booking-table th { background-color: #E8F5E9; color: #006400; border: 1px solid #ccc; padding: 8px 4px; text-align: center; white-space: nowrap; font-weight: bold; }
    .booking-table th.time-header { background-color: #006400; color: white; min-width: 52px; position: sticky; left: 0; z-index: 3; }
    .booking-table td { border: 1px solid #ddd; padding: 4px; text-align: center; vertical-align: middle; white-space: nowrap; }
    .booking-table td.time-col { position: sticky; left: 0; background-color: #f9f9f9; color: #555; font-weight: bold; z-index: 2; border-right: 2px solid #ccc; }
    .btn-available { background-color: #fff0f5; color: #e0004e; border: none; padding: 4px 10px; font-weight: bold; cursor: pointer; width: 100%; font-size: 1.3em; text-decoration: none; }
    .btn-available:hover { color: #ff6699; }
    .cell-past { background-color: #f0f0f0; color: #ccc; font-size: 1.1em; }
    .cell-booked { background-color: #f8f8f8; color: #bbb; font-size: 1.1em; }
    
    .form-section h5 { color: #006400; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin: 20px 0 10px 0; font-size: 1.1em; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; font-size: 0.9rem; color: #333; margin-bottom: 5px; font-weight: bold; }
    .required:after { content: " *"; color: #FF8C00; }
    .form-input { width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc; box-sizing: border-box; font-size: 1rem; }
    .form-radio-group { display: flex; flex-direction: column; gap: 8px; margin-top: 5px; }
    .form-radio-label { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; cursor: pointer; }
    .submit-btn { width: 100%; padding: 15px; background-color: #FF8C00; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 1.1rem; cursor: pointer; transition: 0.3s; margin-top: 20px; }
    .submit-btn:hover { background-color: #E07B00; }
  `}</style>
);

// --- コンポーネント1: トップメニュー ---
function Home() {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <h2 style={{ color: C.green, marginBottom: "30px" }}>ハコビテ 総合メニュー</h2>
      <div style={{ display: "grid", gap: "20px", maxWidth: "400px", margin: "0 auto" }}>
        <Link to="/price" style={{ textDecoration: "none" }}>
          <button style={{ width: "100%", padding: "20px", background: C.white, border: `2px solid ${C.green}`, borderRadius: "15px", color: C.green, fontSize: "1.1rem", fontWeight: "bold", cursor: "pointer" }}>
            🧮 料金を試算する
          </button>
        </Link>
        <Link to="/reserve" style={{ textDecoration: "none" }}>
          <button style={{ width: "100%", padding: "20px", background: C.orange, border: "none", borderRadius: "15px", color: "#fff", fontSize: "1.1rem", fontWeight: "bold", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", cursor: "pointer" }}>
            📅 今すぐ予約する
          </button>
        </Link>
      </div>
    </div>
  );
}

// --- コンポーネント2: 料金試算 ---
function PriceCalculator() {
  const [tripKm, setTripKm] = useState("");
  const [simResult, setSimResult] = useState(null);

  const calculateFare = () => {
    const dist = parseFloat(tripKm) || 0;
    if (dist <= 0) return;
    setSimResult(Math.ceil(750 + (dist / 0.25 * 80) + 1000));
  };

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <Link to="/" style={{ color: C.green, fontWeight: "bold", textDecoration: "none" }}>← メニューへ戻る</Link>
      <section style={{ background: C.white, padding: "20px", borderRadius: "15px", marginTop: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        <h2 style={{ fontSize: "1.2rem", color: C.green, textAlign: "center" }}>🧮 料金シミュレーション</h2>
        <input type="number" placeholder="距離 (km)" className="form-input" value={tripKm} onChange={e => setTripKm(e.target.value)} />
        <button onClick={calculateFare} className="submit-btn" style={{ backgroundColor: C.green }}>計算する</button>
        {simResult && <div style={{ marginTop: "20px", textAlign: "center", fontSize: "2rem", fontWeight: "bold", color: C.green }}>¥{simResult.toLocaleString()}~</div>}
      </section>
    </div>
  );
}

// --- コンポーネント3: 予約システム ---
function ReservationSystem() {
  const [step, setStep] = useState("slots"); 
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0); 
  const [busySlots, setBusySlots] = useState([]); 
  
  const [booking, setBooking] = useState({
    duration: "30分", name: "", tel: "", email: "",
    serviceType: "介護タクシー（保険外）外出支援",
    locationFrom: "", locationTo: "", wheelchair: "利用なし",
    careReq: "見守りのみ", passengers: "１名のみ", isSamePerson: "はい",
    payment: "現金", note: ""
  });

  const durationMap = { "30分": 30, "1時間": 60, "1時間30分": 90, "2時間": 120, "2時間30分": 150, "3時間": 180, "4時間": 240, "5時間": 300 };

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + (weekOffset * 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const timeSlots = [];
  for (let h = 8; h <= 18; h++) {
    timeSlots.push({ hour: h, minute: 0 });
    if (h < 18) timeSlots.push({ hour: h, minute: 30 });
  }

  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  useEffect(() => {
    async function fetchSlots() {
      setLoading(true);
      try {
        const res = await fetch('/api/slots');
        if (res.ok) {
          const data = await res.json();
          setBusySlots(data || []);
        }
      } catch (e) {
        console.error("API読み込みエラー:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchSlots();
  }, []);

  const handleReserve = async (e) => {
    e.preventDefault();
    
    // 予約時の重複チェック
    const startMs = new Date(selectedSlot).getTime();
    const endMs = startMs + durationMap[booking.duration] * 60 * 1000;
    const isConflict = busySlots.some(busy => {
      const bStart = new Date(busy.start).getTime();
      const bEnd = new Date(busy.end).getTime();
      return startMs < bEnd && endMs > bStart;
    });

    if (isConflict) {
      alert(`申し訳ありません。選択された時間帯（${booking.duration}）だと、途中で他の予約が入っているため予約できません。時間を短くするか、別の開始時間をお試しください。`);
      return;
    }

    const dateStr = new Date(selectedSlot).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const endDate = new Date(endMs);
    const endDateStr = `${endDate.getHours()}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    
    const details_text = `
■日時: ${dateStr} ～ ${endDateStr} (${booking.duration})
■サービス: ${booking.serviceType}
■お名前: ${booking.name}
■電話: ${booking.tel}
■場所: ${booking.locationFrom}
■行先: ${booking.locationTo}
■車椅子: ${booking.wheelchair}
■介助: ${booking.careReq}
■同乗: ${booking.passengers}
■本人確認: ご予約者と${booking.isSamePerson}
■支払い: ${booking.payment}
■備考: ${booking.note}
`.trim();

    const summary = `【予約】${booking.name}様 (${booking.duration}) - ${booking.serviceType}`;

    const payload = {
      summary: summary,
      description: details_text,
      start: selectedSlot,
      duration_minutes: durationMap[booking.duration],
      name: booking.name,
      email: booking.email
    };
    
    try {
      const res = await fetch('/api/reserve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) setStep("success");
      else alert("予約の送信に失敗しました。");
    } catch (e) {
      console.error("送信エラー:", e);
      alert("通信エラーが発生しました。");
    }
  };

  if (step === "success") return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "10px", border: `2px solid ${C.green}`, textAlign: "center" }}>
        <h3 style={{ color: C.green }}>✅ ご予約ありがとうございます</h3>
        <p>確認メールをお送りしましたのでご確認ください。</p>
        <p style={{ fontSize: "0.9em", color: "#666" }}>※メールが届かない場合は、迷惑メールフォルダもご確認ください。</p>
        <button onClick={() => { setStep("slots"); window.location.reload(); }} className="submit-btn" style={{ width: "auto", padding: "10px 20px" }}>トップページ（カレンダー）へ戻る</button>
      </div>
    </div>
  );

  if (step === "form") {
    const slotD = new Date(selectedSlot);
    const date_str = `${slotD.getFullYear()}/${slotD.getMonth()+1}/${slotD.getDate()} (${dayNames[slotD.getDay()]}) ${slotD.getHours()}:${slotD.getMinutes().toString().padStart(2, '0')} ～`;

    return (
      <div style={{ padding: "15px", maxWidth: "800px", margin: "0 auto" }}>
        <button onClick={() => setStep("slots")} style={{ color: C.green, border: "none", background: "none", fontWeight: "bold", cursor: "pointer", marginBottom: "15px", fontSize: "1.1rem" }}>← カレンダーに戻る</button>
        
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "10px", border: `1px solid ${C.orange}`, boxShadow: "0 4px 6px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
          <h2 style={{ marginTop: 0, color: C.green, textAlign: "center" }}>📝 予約情報の入力</h2>
          <hr />
          <p style={{ fontSize: "1.2em", textAlign: "center" }}>開始日時: <span style={{ color: C.orange, fontWeight: "bold", fontSize: "1.3em" }}>{date_str}</span></p>
        </div>

        <form onSubmit={handleReserve}>
          <div className="form-section">
            <h5>1. ご利用時間（目安）</h5>
            <div className="form-group">
              <label className="required">ご利用予定時間を選択してください</label>
              <select className="form-input" value={booking.duration} onChange={e => setBooking({...booking, duration: e.target.value})}>
                {Object.keys(durationMap).map(d => <option key={d}>{d}</option>)}
              </select>
              <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "5px" }}>※「介護タクシー」「お手伝い支援」以外のサービスをご利用の場合は、「30分」を選択してください。</div>
            </div>
          </div>

          <div className="form-section">
            <h5>2. お客様情報</h5>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div className="form-group">
                <label className="required">お名前</label>
                <input type="text" required className="form-input" value={booking.name} onChange={e => setBooking({...booking, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="required">電話番号</label>
                <input type="tel" required placeholder="090-0000-0000" className="form-input" value={booking.tel} onChange={e => setBooking({...booking, tel: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>メールアドレス</label>
              <input type="email" placeholder="予約完了通知を受け取る場合に記入" className="form-input" value={booking.email} onChange={e => setBooking({...booking, email: e.target.value})} />
            </div>
          </div>

          <div className="form-section">
            <h5>3. サービス内容</h5>
            <div className="form-group">
              <label className="required">ご利用を希望されるサービスを選択してください</label>
              <div className="form-radio-group">
                {["介護タクシー（保険外）外出支援", "買い物支援（リカーショップはやし限定）", "お手伝い支援", "安否確認サービス ￥2,000(税込)"].map(opt => (
                  <label key={opt} className="form-radio-label">
                    <input type="radio" name="service" value={opt} checked={booking.serviceType === opt} onChange={e => setBooking({...booking, serviceType: e.target.value})} /> {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h5>4. 行程</h5>
            <div className="form-group">
              <label className="required">お迎え場所・ご利用場所 (150字まで)</label>
              <textarea required maxLength="150" className="form-input" rows="3" value={booking.locationFrom} onChange={e => setBooking({...booking, locationFrom: e.target.value})}></textarea>
            </div>
            <div className="form-group">
              <label>行き先（介護タクシーご利用の場合） (150字まで)</label>
              <textarea maxLength="150" className="form-input" rows="2" value={booking.locationTo} onChange={e => setBooking({...booking, locationTo: e.target.value})}></textarea>
            </div>
          </div>

          <div className="form-section">
            <h5>5. 詳細オプション</h5>
            <div className="form-group">
              <label className="required">車いすの利用について</label>
              <div className="form-radio-group">
                {["自分の車いすを使用", "普通車いすをレンタル希望 ￥500(税込)", "リクライニング車いすを希望 ￥700(税込)", "ストレッチャー希望（要相談）", "利用なし"].map(opt => (
                  <label key={opt} className="form-radio-label">
                    <input type="radio" name="wheelchair" value={opt} checked={booking.wheelchair === opt} onChange={e => setBooking({...booking, wheelchair: e.target.value})} /> {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginTop: "15px" }}>
              <label>介助は必要ですか？</label>
              <div className="form-radio-group">
                {["見守りのみ", "移乗介助が必要（ベッドから車椅子への移動手伝い）", "階段介助あり（要事前相談）"].map(opt => (
                  <label key={opt} className="form-radio-label">
                    <input type="radio" name="careReq" value={opt} checked={booking.careReq === opt} onChange={e => setBooking({...booking, careReq: e.target.value})} /> {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginTop: "15px" }}>
              <label>同乗者の人数</label>
              <div className="form-radio-group" style={{ flexDirection: "row", gap: "20px" }}>
                {["１名のみ", "２名", "３名"].map(opt => (
                  <label key={opt} className="form-radio-label">
                    <input type="radio" name="passengers" value={opt} checked={booking.passengers === opt} onChange={e => setBooking({...booking, passengers: e.target.value})} /> {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginTop: "15px" }}>
              <label className="required">ご利用者とご予約者は同じですか？</label>
              <div className="form-radio-group" style={{ flexDirection: "row", gap: "20px" }}>
                {["はい", "いいえ"].map(opt => (
                  <label key={opt} className="form-radio-label">
                    <input type="radio" name="samePerson" value={opt} checked={booking.isSamePerson === opt} onChange={e => setBooking({...booking, isSamePerson: e.target.value})} /> {opt}
                  </label>
                ))}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "5px" }}>※「いいえ」の場合は、備考欄に当日伺う先のお名前とご住所を記載ください</div>
            </div>
          </div>

          <div className="form-section">
            <h5>6. お支払い方法</h5>
            <div className="form-group">
              <label className="required">お支払い方法を選択してください</label>
              <div className="form-radio-group">
                {["現金", "銀行振込", "請求書払い（法人）", "掛け払い"].map(opt => (
                  <label key={opt} className="form-radio-label">
                    <input type="radio" name="payment" value={opt} checked={booking.payment === opt} onChange={e => setBooking({...booking, payment: e.target.value})} /> {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-group">
              <label>備考・ご要望 (150字まで)</label>
              <textarea className="form-input" rows="3" placeholder="何か気になることがあればご自由にどうぞ！" maxLength="150" value={booking.note} onChange={e => setBooking({...booking, note: e.target.value})}></textarea>
            </div>
          </div>

          <button type="submit" className="submit-btn">予約を確定する</button>
        </form>
      </div>
    );
  }

  // --- カレンダー画面の描画 ---
  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <Link to="/" style={{ color: C.green, fontWeight: "bold", textDecoration: "none" }}>← メニューへ戻る</Link>
      <h1 style={{ textAlign: "center", color: C.green, marginTop: "20px" }}>ハコビテ 予約フォーム</h1>
      <p style={{ textAlign: "center", color: "#555" }}>丸亀・善通寺の介護タクシー＆生活支援</p>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0" }}>
        <button onClick={() => setWeekOffset(prev => prev - 1)} disabled={weekOffset <= 0} style={{ padding: "10px", backgroundColor: weekOffset <= 0 ? "#ccc" : C.green, color: "white", border: "none", borderRadius: "5px", cursor: weekOffset <= 0 ? "not-allowed" : "pointer", fontWeight: "bold" }}>← 前の週</button>
        <h3 style={{ margin: 0, textAlign: "center", color: C.green }}>{weekDays[0].toLocaleDateString('ja-JP', {month:'numeric', day:'numeric'})} ～ {weekDays[6].toLocaleDateString('ja-JP', {month:'numeric', day:'numeric'})} の空き状況</h3>
        <button onClick={() => setWeekOffset(prev => prev + 1)} style={{ padding: "10px", backgroundColor: C.green, color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>次の週 →</button>
      </div>

      <div className="nav-info">📱 スマートフォンの方は表を左右にスクロールできます</div>
      <div className="legend-box">
        <span><span className="legend-circle">○</span> 予約できます</span>
        <span><span className="legend-x">×</span> 予約不可・満席</span>
      </div>

      {loading ? <p style={{ textAlign: "center" }}>カレンダーを読み込み中...</p> : (
        <div className="booking-table-wrapper">
          <table className="booking-table">
            <thead>
              <tr>
                <th className="time-header">時間</th>
                {weekDays.map((d, i) => {
                  const dayStr = dayNames[d.getDay()];
                  const color = d.getDay() === 6 ? "#cc1a1a" : d.getDay() === 5 ? "#1a6bcc" : C.green;
                  return (
                    <th key={i} style={{ color: color }}>{d.getMonth() + 1}/{d.getDate()}<br/>({dayStr})</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, idx) => (
                <tr key={idx}>
                  <td className="time-col">{time.hour}:{time.minute.toString().padStart(2, '0')}</td>
                  {weekDays.map((d, i) => {
                    const slotDate = new Date(d);
                    slotDate.setHours(time.hour, time.minute, 0, 0);
                    
                    const isPast = slotDate < new Date();
                    
                    const slotStartMs = slotDate.getTime();
                    const slotEndMs = slotStartMs + 30 * 60 * 1000;
                    
                    const isBusy = busySlots.some(busy => {
                      const bStart = new Date(busy.start).getTime();
                      const bEnd = new Date(busy.end).getTime();
                      return slotStartMs < bEnd && slotEndMs > bStart;
                    });

                    if (isPast) {
                      return <td key={i} className="cell-past">×</td>;
                    } else if (isBusy) {
                      return <td key={i} className="cell-booked">×</td>;
                    } else {
                      return (
                        <td key={i} style={{ backgroundColor: "#fff0f5", padding: "0" }}>
                          <button className="btn-available" onClick={() => { setSelectedSlot(slotDate.toISOString()); setStep("form"); }}>○</button>
                        </td>
                      );
                    }
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- メインアプリ ---
export default function App() {
  return (
    <BrowserRouter>
      <GlobalStyle />
      <header style={{ backgroundColor: C.green, padding: "15px", color: "white", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "1.2rem" }}>🚕 ハコビテ 総合システム</h1>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/price" element={<PriceCalculator />} />
        <Route path="/reserve" element={<ReservationSystem />} />
      </Routes>
    </BrowserRouter>
  );
}
