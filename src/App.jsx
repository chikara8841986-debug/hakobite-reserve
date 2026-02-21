import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

// --- 共通設定・CSS ---
const C = { green: "#006400", orange: "#FF8C00", cream: "#FFFDF5", white: "#fff" };

const GlobalStyle = () => (
  <style>{`
    body { background-color: ${C.cream}; color: #333; font-family: "Helvetica Neue", Arial, sans-serif; margin: 0; }
    .page-container { max-width: 1000px; margin: 0 auto; padding: 20px; box-sizing: border-box; }
    .nav-info { background-color: #E8F5E9; border: 1px solid #006400; color: #006400; padding: 8px 12px; border-radius: 5px; font-size: 0.88em; text-align: center; margin-bottom: 12px; font-weight: bold; }
    .legend-box { display: flex; gap: 18px; font-size: 0.85em; color: #555; margin: 8px 0 12px 0; align-items: center; justify-content: center; }
    .legend-circle { color: #e0004e; font-weight: bold; font-size: 1.1em; }
    .legend-x { color: #bbb; font-size: 1.1em; }
    
    .booking-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .booking-table { border-collapse: collapse; min-width: 600px; width: 100%; font-size: 0.82em; }
    .booking-table th { background-color: #E8F5E9; color: #006400; border: 1px solid #ccc; padding: 6px 4px; text-align: center; white-space: nowrap; font-weight: bold; }
    .booking-table th.time-header { background-color: #006400; color: white; min-width: 60px; position: sticky; left: 0; z-index: 3; }
    .booking-table td { border: 1px solid #ddd; padding: 2px 4px; text-align: center; vertical-align: middle; white-space: nowrap; height: 32px; }
    .booking-table td.time-col { position: sticky; left: 0; background-color: #f9f9f9; color: #555; font-weight: bold; z-index: 2; border-right: 2px solid #ccc; font-size: 0.85em; }
    
    .btn-available { background-color: #fff0f5; color: #e0004e; border: none; padding: 0; font-weight: bold; cursor: pointer; width: 100%; height: 100%; font-size: 1.3em; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
    .btn-available:hover { background-color: #ffe4ee; color: #ff6699; }
    .cell-past { background-color: #f0f0f0; color: #ccc; font-size: 1.1em; }
    .cell-booked { background-color: #f8f8f8; color: #bbb; font-size: 1.1em; }
    
    .form-section { background: white; padding: 25px; border-radius: 12px; border: 1px solid #eee; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .form-section h5 { color: #006400; border-left: 4px solid #FF8C00; padding-left: 10px; margin: 0 0 20px 0; font-size: 1.1rem; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; font-size: 0.9rem; color: #333; margin-bottom: 6px; font-weight: bold; }
    .required:after { content: " *"; color: #FF8C00; }
    .form-input { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ccc; box-sizing: border-box; font-size: 1rem; transition: border 0.2s; }
    .form-input:focus { border-color: #006400; outline: none; }
    .form-radio-group { display: flex; flex-direction: column; gap: 10px; margin-top: 5px; }
    .form-radio-label { display: flex; align-items: center; gap: 10px; font-size: 0.95rem; cursor: pointer; padding: 8px; border-radius: 6px; transition: background 0.2s; }
    .form-radio-label:hover { background-color: #f0f7f0; }
    
    .submit-btn { width: 100%; padding: 18px; background-color: #FF8C00; color: white; border: none; border-radius: 10px; font-weight: bold; font-size: 1.2rem; cursor: pointer; transition: 0.3s; margin-top: 20px; box-shadow: 0 4px 6px rgba(255,140,0,0.3); }
    .submit-btn:hover { background-color: #E07B00; transform: translateY(-1px); }
  `}</style>
);

// --- 1: トップメニュー ---
function Home() {
  return (
    <div className="page-container" style={{ textAlign: "center", paddingTop: "40px" }}>
      <h2 style={{ color: C.green, marginBottom: "30px" }}>ハコビテ 総合メニュー</h2>
      <div style={{ display: "grid", gap: "25px", maxWidth: "450px", margin: "0 auto" }}>
        <Link to="/price" style={{ textDecoration: "none" }}>
          <button style={{ width: "100%", padding: "25px", background: C.white, border: `2px solid ${C.green}`, borderRadius: "18px", color: C.green, fontSize: "1.2rem", fontWeight: "bold", cursor: "pointer", transition: "0.2s" }}>
            🧮 料金を試算する
          </button>
        </Link>
        <Link to="/reserve" style={{ textDecoration: "none" }}>
          <button style={{ width: "100%", padding: "25px", background: C.orange, border: "none", borderRadius: "18px", color: "#fff", fontSize: "1.2rem", fontWeight: "bold", boxShadow: "0 6px 12px rgba(0,0,0,0.1)", cursor: "pointer", transition: "0.2s" }}>
            📅 今すぐ予約する
          </button>
        </Link>
      </div>
    </div>
  );
}

// --- 2: 料金試算 ---
function PriceCalculator() {
  const [tripKm, setTripKm] = useState("");
  const [simResult, setSimResult] = useState(null);

  const calculateFare = () => {
    const dist = parseFloat(tripKm) || 0;
    if (dist <= 0) return;
    setSimResult(Math.ceil(750 + (dist / 0.25 * 80) + 1000));
  };

  return (
    <div className="page-container">
      <Link to="/" style={{ color: C.green, fontWeight: "bold", textDecoration: "none" }}>← メニューへ戻る</Link>
      <div className="form-section" style={{ marginTop: "20px" }}>
        <h2 style={{ fontSize: "1.4rem", color: C.green, textAlign: "center", marginTop: 0 }}>🧮 料金シミュレーション</h2>
        <div className="form-group">
          <label>走行距離 (km)</label>
          <input type="number" placeholder="例: 4.5" className="form-input" value={tripKm} onChange={e => setTripKm(e.target.value)} />
        </div>
        <button onClick={calculateFare} className="submit-btn" style={{ backgroundColor: C.green, boxShadow: "none" }}>料金を計算する</button>
        {simResult && <div style={{ marginTop: "30px", textAlign: "center", fontSize: "2.4rem", fontWeight: "bold", color: C.green }}>¥{simResult.toLocaleString()}~</div>}
      </div>
    </div>
  );
}

// --- 3: 予約システム ---
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
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

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
    const startMs = new Date(selectedSlot).getTime();
    const endMs = startMs + durationMap[booking.duration] * 60 * 1000;
    const isConflict = busySlots.some(busy => {
      const bStart = new Date(busy.start).getTime();
      const bEnd = new Date(busy.end).getTime();
      return startMs < bEnd && endMs > bStart;
    });

    if (isConflict) {
      alert(`選択された時間帯（${booking.duration}）は既に予約が入っております。別の時間をご検討ください。`);
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
    const payload = { summary, description: details_text, start: selectedSlot, duration_minutes: durationMap[booking.duration], name: booking.name, email: booking.email };
    
    try {
      const res = await fetch('/api/reserve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) setStep("success");
      else alert("送信に失敗しました。");
    } catch (e) {
      alert("通信エラーが発生しました。");
    }
  };

  if (step === "success") return (
    <div className="page-container" style={{ textAlign: "center", paddingTop: "60px" }}>
      <div className="form-section">
        <h3 style={{ color: C.green }}>✅ ご予約ありがとうございます</h3>
        <p>確認メールをお送りしましたのでご確認ください。</p>
        <button onClick={() => window.location.reload()} className="submit-btn" style={{ width: "auto", padding: "12px 30px" }}>カレンダーへ戻る</button>
      </div>
    </div>
  );

  if (step === "form") {
    const slotD = new Date(selectedSlot);
    return (
      <div className="page-container">
        <button onClick={() => setStep("slots")} style={{ color: C.green, border: "none", background: "none", fontWeight: "bold", cursor: "pointer", marginBottom: "15px", fontSize: "1.1rem" }}>← カレンダーに戻る</button>
        <div className="form-section" style={{ textAlign: "center", border: `1px solid ${C.orange}` }}>
          <h2 style={{ marginTop: 0, color: C.green }}>📝 予約情報の入力</h2>
          <p style={{ fontSize: "1.2rem", margin: 0 }}>開始日時: <span style={{ color: C.orange, fontWeight: "bold", fontSize: "1.4rem" }}>{slotD.getFullYear()}/{slotD.getMonth()+1}/{slotD.getDate()} ({dayNames[slotD.getDay()]}) {slotD.getHours()}:{slotD.getMinutes().toString().padStart(2, '0')} ～</span></p>
        </div>

        <form onSubmit={handleReserve}>
          <div className="form-section">
            <h5>1. ご利用時間（目安）</h5>
            <div className="form-group">
              <label className="required">ご利用予定時間</label>
              <select className="form-input" value={booking.duration} onChange={e => setBooking({...booking, duration: e.target.value})}>
                {Object.keys(durationMap).map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="form-section">
            <h5>2. お客様情報</h5>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div className="form-group"><label className="required">お名前</label><input type="text" required className="form-input" value={booking.name} onChange={e => setBooking({...booking, name: e.target.value})} /></div>
              <div className="form-group"><label className="required">電話番号</label><input type="tel" required className="form-input" value={booking.tel} onChange={e => setBooking({...booking, tel: e.target.value})} /></div>
            </div>
            <div className="form-group"><label>メールアドレス</label><input type="email" className="form-input" value={booking.email} onChange={e => setBooking({...booking, email: e.target.value})} /></div>
          </div>

          <div className="form-section">
            <h5>3. サービス・行程</h5>
            <div className="form-group"><label className="required">お迎え・ご利用場所</label><textarea required className="form-input" rows="3" value={booking.locationFrom} onChange={e => setBooking({...booking, locationFrom: e.target.value})}></textarea></div>
            <div className="form-group"><label>行き先（介護タクシー）</label><textarea className="form-input" rows="2" value={booking.locationTo} onChange={e => setBooking({...booking, locationTo: e.target.value})}></textarea></div>
          </div>

          <div className="form-section">
            <h5>4. オプション・詳細</h5>
            <div className="form-group">
              <label className="required">車いすについて</label>
              <div className="form-radio-group">
                {["自分の車いすを使用", "普通車いすレンタル ￥500", "リクライニング車いす ￥700", "利用なし"].map(opt => (
                  <label key={opt} className="form-radio-label"><input type="radio" checked={booking.wheelchair === opt} onChange={() => setBooking({...booking, wheelchair: opt})} /> {opt}</label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="required">お支払い方法</label>
              <div className="form-radio-group">
                {["現金", "銀行振込", "請求書払い（法人）"].map(opt => (
                  <label key={opt} className="form-radio-label"><input type="radio" checked={booking.payment === opt} onChange={() => setBooking({...booking, payment: opt})} /> {opt}</label>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className="submit-btn">予約を確定する</button>
        </form>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Link to="/" style={{ color: C.green, fontWeight: "bold", textDecoration: "none" }}>← メニューへ戻る</Link>
      <h1 style={{ textAlign: "center", color: C.green, marginTop: "20px" }}>ハコビテ 予約フォーム</h1>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "25px 0" }}>
        <button onClick={() => setWeekOffset(prev => prev - 1)} disabled={weekOffset <= 0} style={{ padding: "10px 18px", backgroundColor: weekOffset <= 0 ? "#ccc" : C.green, color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>← 前の週</button>
        <h3 style={{ margin: 0, color: C.green }}>{weekDays[0].toLocaleDateString('ja-JP')} ～</h3>
        <button onClick={() => setWeekOffset(prev => prev + 1)} style={{ padding: "10px 18px", backgroundColor: C.green, color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>次の週 →</button>
      </div>

      <div className="nav-info">📱 スマートフォンの方は表を左右にスクロールできます</div>
      <div className="legend-box">
        <span><span className="legend-circle">○</span> 予約できます</span>
        <span><span className="legend-x">×</span> 予約不可・満席</span>
      </div>

      {loading ? <p style={{ textAlign: "center" }}>読み込み中...</p> : (
        <div className="booking-table-wrapper">
          <table className="booking-table">
            <thead>
              <tr>
                <th className="time-header">時間</th>
                {weekDays.map((d, i) => {
                  const dayStr = dayNames[d.getDay()];
                  const color = d.getDay() === 6 ? "#cc1a1a" : d.getDay() === 5 ? "#1a6bcc" : C.green;
                  return <th key={i} style={{ color }}>{d.getMonth() + 1}/{d.getDate()}<br/>({dayStr})</th>;
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

                    if (isPast) return <td key={i} className="cell-past">×</td>;
                    if (isBusy) return <td key={i} className="cell-booked">×</td>;
                    return <td key={i} style={{ backgroundColor: "#fff0f5", padding: "0" }}><button className="btn-available" onClick={() => { setSelectedSlot(slotDate.toISOString()); setStep("form"); }}>○</button></td>;
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

export default function App() {
  return (
    <BrowserRouter>
      <GlobalStyle />
      <header style={{ backgroundColor: C.green, padding: "15px", color: "white", textAlign: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <h1 style={{ margin: 0, fontSize: "1.3rem" }}>🚕 ハコビテ 総合システム</h1>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/price" element={<PriceCalculator />} />
        <Route path="/reserve" element={<ReservationSystem />} />
      </Routes>
    </BrowserRouter>
  );
}
