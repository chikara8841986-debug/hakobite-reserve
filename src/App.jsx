import { useState, useEffect } from "react";

const FARE_CONFIG = {
  baseFare: 750, welfareFee: 1000, careFee: 500,
  meterFare: 80, meterDistance: 0.250,
  wheelchair: { normal: 500, reclining: 700 }
};

export default function App() { // 名前を HakobiteApp から App に変更
  const [view, setView] = useState("main"); 
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [tripKm, setTripKm] = useState("");
  const [simResult, setSimResult] = useState(null);

  // 予約情報の全項目
  const [booking, setBooking] = useState({
    duration: "30分", name: "", tel: "", email: "",
    serviceType: "介護タクシー（保険外）外出支援",
    from: "", to: "", wheelchair: "利用なし",
    careReq: "見守りのみ", passengers: "１名のみ",
    isSamePerson: "はい", payment: "現金", note: ""
  });

  useEffect(() => {
    async function fetchSlots() {
      try { await fetch('/api/slots'); } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    if (view === "main") fetchSlots();
  }, [view]);

  const calculateFare = () => {
    const dist = parseFloat(tripKm) || 0;
    if (dist <= 0) return;
    setSimResult(Math.ceil(750 + (dist / 0.25 * 80) + 1000));
  };

  const handleReserve = async (e) => {
    e.preventDefault();
    const payload = {
      summary: `【予約】${booking.name}様 (${booking.duration})`,
      details: `日時: ${new Date(selectedSlot).toLocaleString()}\nサービス: ${booking.serviceType}\n電話: ${booking.tel}\n場所: ${booking.from} → ${booking.to}\n車椅子: ${booking.wheelchair}\n支払い: ${booking.payment}\n備考: ${booking.note}`,
      start: selectedSlot, name: booking.name, email: booking.email
    };
    const res = await fetch('/api/reserve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) setView("success");
  };

  const C = { green: "#006400", orange: "#FF8C00", cream: "#FFFDF5", white: "#fff" };

  if (view === "success") return (
    <div style={{ padding: "40px", textAlign: "center", background: C.cream, minHeight: "100vh" }}>
      <h2 style={{ color: C.green }}>✅ 予約が完了しました</h2>
      <button onClick={() => setView("main")} style={{ padding: "10px 20px", background: C.green, color: "#fff", border: "none", borderRadius: "8px" }}>トップに戻る</button>
    </div>
  );

  if (view === "booking") return (
    <div style={{ padding: "15px", background: C.cream, minHeight: "100vh" }}>
      <button onClick={() => setView("main")} style={{ marginBottom: "15px", color: C.green, border: "none", background: "none", fontWeight: "bold" }}>← 戻る</button>
      <div style={{ background: C.white, padding: "20px", borderRadius: "15px", border: `2px solid ${C.orange}`, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <h3 style={{ color: C.green, textAlign: "center" }}>📝 予約情報の入力</h3>
        <p style={{ textAlign: "center" }}>日時: <span style={{ color: C.orange, fontWeight: "bold" }}>{new Date(selectedSlot).toLocaleString()}</span></p>
        <form onSubmit={handleReserve} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label>ご利用時間</label>
          <select value={booking.duration} onChange={e => setBooking({...booking, duration: e.target.value})} style={{ padding: "10px" }}>
            {["30分", "1時間", "2時間", "3時間"].map(d => <option key={d}>{d}</option>)}
          </select>
          <input type="text" placeholder="お名前 *" required onChange={e => setBooking({...booking, name: e.target.value})} style={{ padding: "10px" }} />
          <input type="tel" placeholder="電話番号 *" required onChange={e => setBooking({...booking, tel: e.target.value})} style={{ padding: "10px" }} />
          <textarea placeholder="お迎え場所 *" required onChange={e => setBooking({...booking, from: e.target.value})} style={{ padding: "10px" }} />
          <button type="submit" style={{ padding: "15px", background: C.orange, color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold" }}>予約を確定する</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.cream, minHeight: "100vh", fontFamily: "sans-serif" }}>
      <header style={{ background: C.green, padding: "15px", color: "#fff", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "1.2rem" }}>🚕 ハコビテ 総合システム</h1>
      </header>
      <main style={{ maxWidth: "500px", margin: "0 auto", padding: "15px" }}>
        <section style={{ background: C.white, padding: "20px", borderRadius: "15px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "1rem", color: C.green }}>🧮 料金計算</h2>
          <input type="number" placeholder="距離 (km)" style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd" }} value={tripKm} onChange={e => setTripKm(e.target.value)} />
          <button onClick={calculateFare} style={{ width: "100%", padding: "12px", background: C.green, color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold" }}>計算する</button>
          {simResult && <div style={{ marginTop: "15px", textAlign: "center", fontSize: "1.8rem", fontWeight: "bold", color: C.green }}>¥{simResult.toLocaleString()}</div>}
        </section>
        <section style={{ background: C.white, padding: "20px", borderRadius: "15px" }}>
          <h2 style={{ fontSize: "1rem", color: C.green }}>📅 予約状況</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {["09:00", "11:00", "13:00", "15:00"].map(time => {
              const d = new Date(); d.setHours(parseInt(time), 0, 0, 0);
              return (
                <button key={time} onClick={() => { setSelectedSlot(d.toISOString()); setView("booking"); }}
                  style={{ padding: "12px", border: `1px solid ${C.green}`, background: "#fff", borderRadius: "8px", color: C.green, fontWeight: "bold" }}>
                  ○ {time}
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
