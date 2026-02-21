import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

// --- 共通設定 ---
const C = { green: "#006400", orange: "#FF8C00", cream: "#FFFDF5", white: "#fff" };

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
        <input type="number" placeholder="距離 (km)" style={{ width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }} value={tripKm} onChange={e => setTripKm(e.target.value)} />
        <button onClick={calculateFare} style={{ width: "100%", padding: "12px", background: C.green, color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}>計算する</button>
        {simResult && <div style={{ marginTop: "20px", textAlign: "center", fontSize: "2rem", fontWeight: "bold", color: C.green }}>¥{simResult.toLocaleString()}~</div>}
      </section>
    </div>
  );
}

// --- コンポーネント3: 予約システム ---
function ReservationSystem() {
  const [step, setStep] = useState("slots"); // slots, form, success
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0); // 週の切り替え用
  
  // 予約フォーム用ステート
  const [booking, setBooking] = useState({
    duration: "30分", name: "", tel: "", email: "",
    serviceType: "介護タクシー（保険外）外出支援",
    from: "", to: "", wheelchair: "利用なし",
    payment: "現金", note: ""
  });

  // カレンダー表示用の日付と時間を生成
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + (weekOffset * 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    return d;
  });
  const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  useEffect(() => {
    // API連携が完了するまではダミーで即時ローディング完了とする
    setLoading(false);
  }, [weekOffset]);

  const handleReserve = async (e) => {
    e.preventDefault();
    const payload = {
      summary: `【予約】${booking.name}様 (${booking.duration})`,
      details: `日時: ${new Date(selectedSlot).toLocaleString('ja-JP')}\n電話: ${booking.tel}\nお迎え場所: ${booking.from}`,
      start: selectedSlot, name: booking.name, email: booking.email
    };
    
    // API連携時はコメントアウトを解除
    /*
    const res = await fetch('/api/reserve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) setStep("success");
    */
    
    // テスト用に強制成功
    console.log("予約送信:", payload);
    setStep("success");
  };

  if (step === "success") return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2 style={{ color: C.green }}>✅ 予約完了</h2>
      <p>確認メールをお送りしました。</p>
      <Link to="/" style={{ display: "inline-block", marginTop: "20px", padding: "10px 20px", background: C.green, color: "#fff", textDecoration: "none", borderRadius: "8px" }}>トップへ戻る</Link>
    </div>
  );

  if (step === "form") return (
    <div style={{ padding: "15px", maxWidth: "600px", margin: "0 auto" }}>
      <button onClick={() => setStep("slots")} style={{ color: C.green, border: "none", background: "none", fontWeight: "bold", cursor: "pointer", marginBottom: "10px" }}>← 日時選択に戻る</button>
      <div style={{ background: C.white, padding: "20px", borderRadius: "15px", border: `2px solid ${C.orange}`, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <h3 style={{ color: C.green, textAlign: "center", marginTop: 0 }}>📝 予約情報の入力</h3>
        <p style={{ textAlign: "center", fontWeight: "bold", fontSize: "1.1rem" }}>{new Date(selectedSlot).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        <form onSubmit={handleReserve} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div>
            <label style={{ fontSize: "0.9rem", color: "#555" }}>お名前 *</label>
            <input type="text" required onChange={e => setBooking({...booking, name: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: "0.9rem", color: "#555" }}>電話番号 *</label>
            <input type="tel" required onChange={e => setBooking({...booking, tel: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: "0.9rem", color: "#555" }}>お迎え場所 *</label>
            <input type="text" required onChange={e => setBooking({...booking, from: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: "0.9rem", color: "#555" }}>ご利用時間</label>
            <select value={booking.duration} onChange={e => setBooking({...booking, duration: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" }}>
              {["30分", "1時間", "2時間", "3時間"].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <button type="submit" style={{ padding: "15px", background: C.orange, color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "1.1rem", cursor: "pointer", marginTop: "10px" }}>予約を確定する</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <Link to="/" style={{ color: C.green, fontWeight: "bold", textDecoration: "none" }}>← メニューへ戻る</Link>
      <h2 style={{ fontSize: "1.3rem", color: C.green, textAlign: "center", marginTop: "20px" }}>📅 予約カレンダー</h2>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <button onClick={() => setWeekOffset(prev => prev - 1)} disabled={weekOffset <= 0} style={{ padding: "8px 15px", background: weekOffset <= 0 ? "#ccc" : C.green, color: "#fff", border: "none", borderRadius: "5px", cursor: weekOffset <= 0 ? "not-allowed" : "pointer" }}>前の週</button>
        <span style={{ fontWeight: "bold" }}>{weekDays[0].toLocaleDateString('ja-JP')} - {weekDays[6].toLocaleDateString('ja-JP')}</span>
        <button onClick={() => setWeekOffset(prev => prev + 1)} style={{ padding: "8px 15px", background: C.green, color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>次の週</button>
      </div>

      {loading ? <p style={{ textAlign: "center" }}>読み込み中...</p> : (
        <div style={{ overflowX: "auto", background: C.white, borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", minWidth: "500px", borderCollapse: "collapse", textAlign: "center" }}>
            <thead>
              <tr>
                <th style={{ padding: "10px", background: "#f0f0f0", borderBottom: "2px solid #ddd" }}>時間</th>
                {weekDays.map((d, i) => (
                  <th key={i} style={{ padding: "10px", background: "#f0f0f0", borderBottom: "2px solid #ddd", minWidth: "60px" }}>
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>{d.getMonth() + 1}/{d.getDate()}</div>
                    <div>{dayNames[d.getDay()]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time}>
                  <td style={{ padding: "10px", borderBottom: "1px solid #eee", fontWeight: "bold", color: "#555", background: "#fafafa" }}>{time}</td>
                  {weekDays.map((d, i) => {
                    const slotDate = new Date(d);
                    const [hours, minutes] = time.split(':');
                    slotDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    
                    // 過去の日時は選択不可（グレーアウト）
                    const isPast = slotDate < new Date();

                    return (
                      <td key={i} style={{ padding: "5px", borderBottom: "1px solid #eee" }}>
                        <button 
                          disabled={isPast}
                          onClick={() => { setSelectedSlot(slotDate.toISOString()); setStep("form"); }}
                          style={{ 
                            width: "100%", padding: "10px 0", 
                            background: isPast ? "#f5f5f5" : "#fff", 
                            color: isPast ? "#ccc" : C.green, 
                            border: isPast ? "1px solid #eee" : `1px solid ${C.green}`, 
                            borderRadius: "5px", cursor: isPast ? "not-allowed" : "pointer",
                            fontWeight: "bold"
                          }}>
                          {isPast ? "-" : "○"}
                        </button>
                      </td>
                    );
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

// --- メインアプリ (ルーティング定義) ---
export default function App() {
  return (
    <BrowserRouter>
      <div style={{ background: C.cream, minHeight: "100vh", fontFamily: "sans-serif" }}>
        <header style={{ background: C.green, padding: "15px", color: "#fff", textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: "1.2rem" }}>🚕 ハコビテ 総合システム</h1>
        </header>
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/price" element={<PriceCalculator />} />
          <Route path="/reserve" element={<ReservationSystem />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
