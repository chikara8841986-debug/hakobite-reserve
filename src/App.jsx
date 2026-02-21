import { useState, useEffect } from "react";

const FARE_CONFIG = {
  baseFare: 750, welfareFee: 1000, careFee: 500,
  meterFare: 80, meterDistance: 0.250,
  nightSurcharge: 1.2, wheelchair: { normal: 500, reclining: 700 }
};

export default function HakobiteApp() {
  // 状態管理：ページ切り替え、計算、予約データ
  const [view, setView] = useState("main"); // "main" or "booking" or "success"
  const [tripKm, setTripKm] = useState("");
  const [result, setResult] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState({
    name: "", tel: "", email: "", service: "介護タクシー（保険外）外出支援",
    duration: "30分", from: "", to: "", wheelchair: "利用なし", care: "見守りのみ",
    passengers: "１名のみ", samePerson: "はい", payment: "現金", note: ""
  });
  const [selectedSlot, setSelectedSlot] = useState(null);

  // カレンダー情報の取得
  useEffect(() => {
    async function fetchSlots() {
      try {
        const start = new Date().toISOString().split('T')[0];
        const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const res = await fetch(`/api/slots?start=${start}&end=${end}`);
        const data = await res.json();
        setSlots(data);
      } catch (e) { console.error("取得失敗", e); }
      finally { setLoading(false); }
    }
    if (view === "main") fetchSlots();
  }, [view]);

  // 料金計算ロジック
  const calculate = () => {
    const dist = parseFloat(tripKm) || 0;
    if (dist <= 0) return alert("距離を入力してください");
    const units = Math.ceil(dist / FARE_CONFIG.meterDistance);
    let meter = FARE_CONFIG.baseFare + (units * FARE_CONFIG.meterFare);
    setResult({ total: meter + FARE_CONFIG.welfareFee }); // 簡易表示
  };

  // 予約実行
  const handleReserve = async (e) => {
    e.preventDefault();
    const startDt = new Date(selectedSlot);
    const endDt = new Date(startDt.getTime() + 30 * 60000); // 30分後
    const payload = {
      summary: `【予約】${bookingData.name}様 (${bookingData.service})`,
      details: `名前: ${bookingData.name}\n電話: ${bookingData.tel}\nサービス: ${bookingData.service}\n場所: ${bookingData.from} → ${bookingData.to}\n車椅子: ${bookingData.wheelchair}\n備考: ${bookingData.note}`,
      start: startDt.toISOString(),
      end: endDt.toISOString(),
      email: bookingData.email,
      name: bookingData.name
    };

    const res = await fetch('/api/reserve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) setView("success");
    else alert("送信に失敗しました");
  };

  // デザイン定義
  const C = { green: "#5b8c3e", orange: "#e88634", cream: "#faf7f2", white: "#fff", text: "#333" };

  // --- UI: 完了画面 ---
  if (view === "success") {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", background: C.cream, minHeight: "100vh" }}>
        <h2 style={{ color: C.green }}>✅ 予約が完了しました！</h2>
        <p>確認メールをお送りしましたのでご確認ください。</p>
        <button onClick={() => setView("main")} style={{ padding: "12px 24px", background: C.green, color: "#fff", border: "none", borderRadius: "8px" }}>トップへ戻る</button>
      </div>
    );
  }

  // --- UI: 入力フォーム画面 ---
  if (view === "booking") {
    return (
      <div style={{ padding: "20px", background: C.cream, minHeight: "100vh" }}>
        <button onClick={() => setView("main")} style={{ marginBottom: "20px", border: "none", background: "none", color: C.green }}>← カレンダーに戻る</button>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", border: `1px solid ${C.green}` }}>
          <h3>📝 予約情報の入力</h3>
          <p style={{ fontWeight: "bold", color: C.orange }}>日時: {new Date(selectedSlot).toLocaleString()}</p>
          <form onSubmit={handleReserve}>
            <label>お名前 *</label>
            <input type="text" required style={{ width: "100%", padding: "10px", marginBottom: "12px" }} value={bookingData.name} onChange={e => setBookingData({...bookingData, name: e.target.value})} />
            <label>電話番号 *</label>
            <input type="tel" required style={{ width: "100%", padding: "10px", marginBottom: "12px" }} value={bookingData.tel} onChange={e => setBookingData({...bookingData, tel: e.target.value})} />
            <label>お迎え場所 *</label>
            <textarea required style={{ width: "100%", padding: "10px", marginBottom: "12px" }} value={bookingData.from} onChange={e => setBookingData({...bookingData, from: e.target.value})} />
            <button type="submit" style={{ width: "100%", padding: "16px", background: C.orange, color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold" }}>予約を確定する</button>
          </form>
        </div>
      </div>
    );
  }

  // --- UI: メイン画面（シミュレーター + カレンダー） ---
  return (
    <div style={{ background: C.cream, minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ background: C.green, padding: "20px", color: "#fff", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "1.2rem" }}>🚕 ハコビテ 総合予約システム</h1>
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
        {/* シミュレーター */}
        <section style={{ background: "#fff", padding: "20px", borderRadius: "12px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1rem", color: C.green }}>🧮 料金シミュレーター</h2>
          <input type="number" placeholder="距離 (km)" style={{ width: "100%", padding: "12px", marginBottom: "10px" }} value={tripKm} onChange={e => setTripKm(e.target.value)} />
          <button onClick={calculate} style={{ width: "100%", padding: "12px", background: C.green, color: "#fff", border: "none", borderRadius: "8px" }}>計算</button>
          {result && <p style={{ textAlign: "center", fontSize: "1.5rem", fontWeight: "bold", color: C.green }}>¥{result.total.toLocaleString()}</p>}
        </section>

        {/* カレンダー */}
        <section style={{ background: "#fff", padding: "20px", borderRadius: "12px" }}>
          <h2 style={{ fontSize: "1rem", color: C.green }}>📅 予約状況</h2>
          {loading ? <p>読込中...</p> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {["09:00", "10:00", "11:00", "13:00", "14:00", "15:00"].map(time => {
                const now = new Date();
                const slotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(time), 0);
                return (
                  <button key={time} onClick={() => { setSelectedSlot(slotDate.toISOString()); setView("booking"); }}
                    style={{ padding: "10px", border: `1px solid ${C.green}`, background: "#fff", borderRadius: "6px", cursor: "pointer" }}>
                    ○ {time}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
