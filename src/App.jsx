import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";

// --- 共通設定 ---
const C = { green: "#006400", orange: "#FF8C00", cream: "#FFFDF5", white: "#fff" };

// --- コンポーネント1: トップメニュー ---
function Home() {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <h2 style={{ color: C.green, marginBottom: "30px" }}>ハコビテ 総合メニュー</h2>
      <div style={{ display: "grid", gap: "20px", maxWidth: "400px", margin: "0 auto" }}>
        <Link to="/price" style={{ textDecoration: "none" }}>
          <button style={{ width: "100%", padding: "20px", background: C.white, border: `2px solid ${C.green}`, borderRadius: "15px", color: C.green, fontSize: "1.1rem", fontWeight: "bold" }}>
            🧮 料金を試算する
          </button>
        </Link>
        <Link to="/reserve" style={{ textDecoration: "none" }}>
          <button style={{ width: "100%", padding: "20px", background: C.orange, border: "none", borderRadius: "15px", color: "#fff", fontSize: "1.1rem", fontWeight: "bold", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
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
        <button onClick={calculateFare} style={{ width: "100%", padding: "12px", background: C.green, color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold" }}>計算する</button>
        {simResult && <div style={{ marginTop: "20px", textAlign: "center", fontSize: "2rem", fontWeight: "bold", color: C.green }}>¥{simResult.toLocaleString()}~</div>}
      </section>
    </div>
  );
}

// --- コンポーネント3: 予約システム ---
function ReservationSystem() {
  const [step, setStep] = useState("slots"); // slots, form, success
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // 予約フォーム用ステート
  const [booking, setBooking] = useState({
    duration: "30分", name: "", tel: "", email: "",
    serviceType: "介護タクシー（保険外）外出支援",
    from: "", to: "", wheelchair: "利用なし",
    payment: "現金", note: ""
  });

  useEffect(() => {
    // 本来はここで /api/slots を叩く
    // 今回は表示確認用にダミー処理にしています
    setLoading(false);
  }, []);

  const handleReserve = async (e) => {
    e.preventDefault();
    const payload = {
      summary: `【予約】${booking.name}様 (${booking.duration})`,
      details: `日時: ${new Date(selectedSlot).toLocaleString()}`, // 簡略化
      start: selectedSlot, name: booking.name, email: booking.email
    };
    
    // APIコール（実際はここのコメントアウトを外す）
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
    <div style={{ padding: "15px" }}>
      <button onClick={() => setStep("slots")} style={{ color: C.green, border: "none", background: "none", fontWeight: "bold" }}>← 日時選択に戻る</button>
      <div style={{ background: C.white, padding: "20px", borderRadius: "15px", marginTop: "10px", border: `2px solid ${C.orange}` }}>
        <h3 style={{ color: C.green, textAlign: "center" }}>📝 情報を入力</h3>
        <p style={{ textAlign: "center", fontWeight: "bold" }}>{new Date(selectedSlot).toLocaleString()}</p>
        <form onSubmit={handleReserve} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input type="text" placeholder="お名前" required onChange={e => setBooking({...booking, name: e.target.value})} style={{ padding: "10px" }} />
          <input type="tel" placeholder="電話番号" required onChange={e => setBooking({...booking, tel: e.target.value})} style={{ padding: "10px" }} />
          <button type="submit" style={{ padding: "15px", background: C.orange, color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold" }}>予約確定</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <Link to="/" style={{ color: C.green, fontWeight: "bold", textDecoration: "none" }}>← メニューへ戻る</Link>
      <h2 style={{ fontSize: "1.2rem", color: C.green, textAlign: "center", marginTop: "20px" }}>📅 日時を選択してください</h2>
      
      {loading ? <p>読み込み中...</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "20px" }}>
           {/* ダミーのボタン表示 */}
           {["09:00", "11:00", "13:00", "15:00"].map(time => {
              const d = new Date(); d.setHours(parseInt(time), 0, 0, 0);
              return (
                <button key={time} onClick={() => { setSelectedSlot(d.toISOString()); setStep("form"); }}
                  style={{ padding: "12px", border: `1px solid ${C.green}`, background: "#fff", borderRadius: "8px", color: C.green, fontWeight: "bold" }}>
                  {time}
                </button>
              );
            })}
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