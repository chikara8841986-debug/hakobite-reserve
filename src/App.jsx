import { useState, useEffect } from "react";

const FARE_CONFIG = {
  baseFare: 750, welfareFee: 1000, careFee: 500,
  meterFare: 80, meterDistance: 0.250,
  nightSurcharge: 1.2, wheelchair: { normal: 500, reclining: 700 }
};

export default function HakobiteApp() {
  const [view, setView] = useState("main"); 
  const [tripKm, setTripKm] = useState("");
  const [isNight, setIsNight] = useState(false);
  const [needsCare, setNeedsCare] = useState(false);
  const [wheelchairType, setWheelchairType] = useState("none");
  const [result, setResult] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingData, setBookingData] = useState({ name: "", tel: "", from: "", note: "" });

  useEffect(() => {
    async function fetchSlots() {
      try {
        const start = new Date().toISOString().split('T')[0];
        const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const res = await fetch(`/api/slots?start=${start}&end=${end}`);
        const data = await res.json();
        setSlots(data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    if (view === "main") fetchSlots();
  }, [view]);

  const calculate = () => {
    const dist = parseFloat(tripKm) || 0;
    if (dist <= 0) return;
    const units = Math.ceil(dist / FARE_CONFIG.meterDistance);
    let meter = FARE_CONFIG.baseFare + (units * FARE_CONFIG.meterFare);
    if (isNight) meter = Math.ceil(meter * 1.2 / 10) * 10;
    const body = needsCare ? 500 : 0;
    const wc = wheelchairType === "normal" ? 500 : wheelchairType === "reclining" ? 700 : 0;
    setResult({ total: meter + 1000 + body + wc });
  };

  const handleReserve = async (e) => {
    e.preventDefault();
    const payload = {
      summary: `【予約】${bookingData.name}様`,
      details: `電話: ${bookingData.tel}\n場所: ${bookingData.from}\n備考: ${bookingData.note}`,
      start: selectedSlot,
      end: new Date(new Date(selectedSlot).getTime() + 30 * 60000).toISOString(),
      name: bookingData.name
    };
    const res = await fetch('/api/reserve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) setView("success");
  };

  const C = { green: "#76a454", cream: "#f9f8f2", white: "#fff" };

  if (view === "success") return (
    <div style={{ padding: "40px", textAlign: "center", background: C.cream, minHeight: "100vh" }}>
      <h2 style={{ color: C.green }}>✅ 予約完了</h2>
      <button onClick={() => setView("main")} style={{ padding: "10px 20px", background: C.green, color: "#fff", border: "none", borderRadius: "8px" }}>戻る</button>
    </div>
  );

  if (view === "booking") return (
    <div style={{ padding: "20px", background: C.cream, minHeight: "100vh" }}>
      <button onClick={() => setView("main")} style={{ marginBottom: "15px", color: C.green, border: "none", background: "none" }}>← 戻る</button>
      <div style={{ background: "#fff", padding: "20px", borderRadius: "15px", border: `1px solid ${C.green}` }}>
        <h3>📝 予約入力</h3>
        <p>日時: {new Date(selectedSlot).toLocaleString()}</p>
        <form onSubmit={handleReserve}>
          <input type="text" placeholder="お名前" required style={{ width: "100%", padding: "12px", marginBottom: "10px" }} onChange={e => setBookingData({...bookingData, name: e.target.value})} />
          <input type="tel" placeholder="電話番号" required style={{ width: "100%", padding: "12px", marginBottom: "10px" }} onChange={e => setBookingData({...bookingData, tel: e.target.value})} />
          <textarea placeholder="お迎え場所" required style={{ width: "100%", padding: "12px", marginBottom: "10px" }} onChange={e => setBookingData({...bookingData, from: e.target.value})} />
          <button type="submit" style={{ width: "100%", padding: "15px", background: "#e88634", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold" }}>予約を確定する</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.cream, minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ background: C.green, padding: "15px", color: "#fff", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "1.2rem" }}>🚕 ハコビテ 総合システム</h1>
      </div>

      <div style={{ maxWidth: "500px", margin: "0 auto", padding: "15px" }}>
        {/* 料金試算カード */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "15px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "1rem", color: C.green }}>🧮 料金試算</h2>
          <input type="number" placeholder="走行距離 (km)" style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd" }} value={tripKm} onChange={e => setTripKm(e.target.value)} />
          <button onClick={calculate} style={{ width: "100%", padding: "12px", background: C.green, color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold" }}>計算する</button>
          {result && <div style={{ marginTop: "15px", textAlign: "center", fontSize: "1.5rem", fontWeight: "bold", color: C.green }}>¥{result.total.toLocaleString()}</div>}
        </div>

        {/* 予約カレンダーカード */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "15px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "1rem", color: C.green }}>📅 予約（空き状況）</h2>
          <p style={{ fontSize: "0.8rem", color: "#666" }}>※○をタップして予約に進みます</p>
          {loading ? <p>読込中...</p> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {["09:00", "11:00", "13:00", "15:00"].map(time => {
                const d = new Date(); d.setHours(parseInt(time), 0, 0, 0);
                return (
                  <button key={time} onClick={() => { setSelectedSlot(d.toISOString()); setView("booking"); }}
                    style={{ padding: "10px", border: `1px solid ${C.green}`, background: "#fff", borderRadius: "8px", cursor: "pointer" }}>
                    ○ {time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}