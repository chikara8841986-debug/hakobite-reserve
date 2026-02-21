import { useState, useEffect } from "react";

const FARE_CONFIG = {
  baseFare: 750, welfareFee: 1000, careFee: 500,
  meterFare: 80, meterDistance: 0.250,
  nightSurcharge: 1.2, wheelchair: { normal: 500, reclining: 700 }
};

export default function HakobiteApp() {
  const [tripKm, setTripKm] = useState("");
  const [isNight, setIsNight] = useState(false);
  const [needsCare, setNeedsCare] = useState(false);
  const [wheelchairType, setWheelchairType] = useState("none");
  const [nights, setNights] = useState("0");
  const [result, setResult] = useState(null);

  // 予約システム用の状態
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // カレンダー情報の取得（VercelのPython APIを叩く）
  useEffect(() => {
    async function fetchSlots() {
      try {
        const start = new Date().toISOString().split('T')[0];
        const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const res = await fetch(`/api/slots?start=${start}&end=${end}`);
        const data = await res.json();
        setSlots(data);
      } catch (e) {
        console.error("カレンダー取得失敗", e);
      } finally {
        setLoading(false);
      }
    }
    fetchSlots();
  }, []);

  const calculate = () => {
    const dist = parseFloat(tripKm) || 0;
    if (dist <= 0) return alert("走行距離を入力してください。");
    const units = Math.ceil(dist / FARE_CONFIG.meterDistance);
    let meter = FARE_CONFIG.baseFare + (units * FARE_CONFIG.meterFare);
    if (isNight) meter = Math.ceil(meter * FARE_CONFIG.nightSurcharge / 10) * 10;
    const body = needsCare ? FARE_CONFIG.careFee : 0;
    const n = parseInt(nights) || 0;
    let wc = 0;
    if (n >= 1) {
      if (wheelchairType === "normal") wc = FARE_CONFIG.wheelchair.normal * n;
      if (wheelchairType === "reclining") wc = FARE_CONFIG.wheelchair.reclining * n;
    }
    setResult({ meter, fukushi: FARE_CONFIG.welfareFee, body, wc, total: meter + FARE_CONFIG.welfareFee + body + wc, dist, n });
  };

  const C = {
    green: "#5b8c3e", greenLight: "#6fa34a", greenBg: "#eef5e6",
    orange: "#e88634", orangeBg: "#fef5eb", cream: "#faf7f2",
    cardBg: "#ffffff", border: "#e5ddd2", text: "#333333"
  };

  const base = { boxSizing: "border-box" };

  return (
    <div style={{ ...base, minHeight: "100vh", background: C.cream, fontFamily: "sans-serif", color: C.text, width: "100%", margin: 0, padding: 0 }}>
      <style>{`
        body, html, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: none !important; display: block !important; }
        .slot-btn { width: 100%; padding: 8px; border: 1px solid #ddd; background: #fff; cursor: pointer; border-radius: 4px; }
        .slot-booked { background: #eee; color: #bbb; cursor: not-allowed; }
      `}</style>

      <div style={{ ...base, background: `linear-gradient(135deg, ${C.green}, ${C.greenLight})`, padding: "24px 16px", textAlign: "center", color: "#fff", width: "100%" }}>
        <h1 style={{ margin: 0, fontSize: "20px" }}>🚕 ハコビテ 総合システム</h1>
      </div>

      <div style={{ ...base, maxWidth: "600px", width: "100%", margin: "0 auto", padding: "16px" }}>
        {/* --- 料金シミュレーターセクション --- */}
        <h2 style={{ fontSize: "16px", color: C.green }}>🧮 概算料金を計算する</h2>
        <div style={{ ...base, background: C.cardBg, padding: "20px", borderRadius: "12px", border: `1px solid ${C.border}`, marginBottom: "24px" }}>
           <label style={{ fontSize: "14px", fontWeight: "bold" }}>走行距離 (km)</label>
           <input type="number" step="0.1" value={tripKm} onChange={e => setTripKm(e.target.value)} style={{ width: "100%", padding: "12px", marginTop: "8px" }} />
           <button onClick={calculate} style={{ width: "100%", padding: "16px", background: C.green, color: "#fff", border: "none", borderRadius: "10px", marginTop: "16px", fontWeight: "bold" }}>計算する</button>
           {result && <div style={{ marginTop: "16px", fontSize: "24px", fontWeight: "bold", textAlign: "center", color: C.green }}>¥{result.total.toLocaleString()}</div>}
        </div>

        {/* --- 予約カレンダーセクション --- */}
        <h2 style={{ fontSize: "16px", color: C.green }}>📅 空き状況の確認・予約</h2>
        <div style={{ ...base, background: C.cardBg, padding: "20px", borderRadius: "12px", border: `1px solid ${C.border}` }}>
          {loading ? <p>カレンダーを読み込み中...</p> : (
            <div>
              <p style={{ fontSize: "12px", color: "#666" }}>※○印をタップすると詳細入力に進みます</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                {/* 簡易的なスロット表示例 */}
                {["09:00", "11:00", "13:00", "15:00"].map(time => (
                  <button key={time} className="slot-btn">○ {time}</button>
                ))}
              </div>
              <p style={{ marginTop: "16px", fontSize: "12px" }}>実際にはここに1週間の詳細な○×表が表示されます。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}