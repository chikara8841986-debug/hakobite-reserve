import { useState, useEffect } from "react";

// 料金設定（シミュレーター用）
const FARE_CONFIG = {
  baseFare: 750, welfareFee: 1000, careFee: 500,
  meterFare: 80, meterDistance: 0.250,
  wheelchair: { normal: 500, reclining: 700 }
};

export default function HakobiteApp() {
  const [view, setView] = useState("main"); // main, booking, success
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // シミュレーター用状態
  const [tripKm, setTripKm] = useState("");
  const [simResult, setSimResult] = useState(null);

  // 予約フォーム用状態（Streamlitの全項目を網羅）
  const [booking, setBooking] = useState({
    duration: "30分",
    name: "",
    tel: "",
    email: "",
    serviceType: "介護タクシー（保険外）外出支援",
    from: "",
    to: "",
    wheelchair: "利用なし",
    careReq: "見守りのみ",
    passengers: "１名のみ",
    isSamePerson: "はい",
    payment: "現金",
    note: ""
  });

  // スロット取得
  useEffect(() => {
    async function fetchSlots() {
      try {
        const res = await fetch('/api/slots');
        // 本来はここでカレンダーの空きをAPIから取得
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    if (view === "main") fetchSlots();
  }, [view]);

  // 料金計算
  const calculateFare = () => {
    const dist = parseFloat(tripKm) || 0;
    if (dist <= 0) return;
    const units = Math.ceil(dist / FARE_CONFIG.meterDistance);
    const meter = FARE_CONFIG.baseFare + (units * FARE_CONFIG.meterFare);
    setSimResult(meter + 1000);
  };

  // 予約送信処理
  const handleReserve = async (e) => {
    e.preventDefault();
    const payload = {
      summary: `【予約】${booking.name}様 (${booking.duration}) - ${booking.serviceType}`,
      details: `
■日時: ${new Date(selectedSlot).toLocaleString()} (${booking.duration})
■サービス: ${booking.serviceType}
■お名前: ${booking.name}
■電話: ${booking.tel}
■メール: ${booking.email}
■お迎え: ${booking.from}
■行先: ${booking.to}
■車椅子: ${booking.wheelchair}
■介助: ${booking.careReq}
■同乗: ${booking.passengers}
■本人確認: ${booking.isSamePerson === 'はい' ? '同じ' : '異なる'}
■支払い: ${booking.payment}
■備考: ${booking.note}
      `,
      start: selectedSlot,
      name: booking.name,
      email: booking.email
    };

    const res = await fetch('/api/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) setView("success");
    else alert("送信に失敗しました。環境変数を確認してください。");
  };

  const C = { green: "#006400", orange: "#FF8C00", cream: "#FFFDF5", white: "#fff" };

  if (view === "success") return (
    <div style={{ padding: "40px", textAlign: "center", background: C.cream, minHeight: "100vh" }}>
      <h2 style={{ color: C.green }}>✅ 予約が完了しました！</h2>
      <p>確認メールとLINE通知を送信しました。</p>
      <button onClick={() => setView("main")} style={{ padding: "12px 24px", background: C.green, color: "#fff", border: "none", borderRadius: "8px" }}>戻る</button>
    </div>
  );

  // --- 予約入力画面 ---
  if (view === "booking") return (
    <div style={{ padding: "15px", background: C.cream, minHeight: "100vh" }}>
      <button onClick={() => setView("main")} style={{ marginBottom: "15px", color: C.green, fontWeight: "bold", border: "none", background: "none" }}>← カレンダーに戻る</button>
      <div style={{ background: C.white, padding: "20px", borderRadius: "15px", border: `2px solid ${C.orange}`, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <h2 style={{ color: C.green, textAlign: "center", fontSize: "1.2rem" }}>📝 予約情報の入力</h2>
        <p style={{ textAlign: "center", fontWeight: "bold" }}>開始日時: <span style={{ color: C.orange }}>{new Date(selectedSlot).toLocaleString()}</span></p>
        
        <form onSubmit={handleReserve} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div>
            <label style={{ fontWeight: "bold", display: "block" }}>1. ご利用時間（目安） *</label>
            <select style={{ width: "100%", padding: "10px" }} value={booking.duration} onChange={e => setBooking({...booking, duration: e.target.value})}>
              {["30分", "1時間", "1時間30分", "2時間", "3時間"].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontWeight: "bold", display: "block" }}>2. お客様情報 *</label>
            <input type="text" placeholder="お名前" required style={{ width: "100%", padding: "10px", marginBottom: "5px" }} onChange={e => setBooking({...booking, name: e.target.value})} />
            <input type="tel" placeholder="電話番号" required style={{ width: "100%", padding: "10px", marginBottom: "5px" }} onChange={e => setBooking({...booking, tel: e.target.value})} />
            <input type="email" placeholder="メールアドレス（空欄可）" style={{ width: "100%", padding: "10px" }} onChange={e => setBooking({...booking, email: e.target.value})} />
          </div>

          <div>
            <label style={{ fontWeight: "bold", display: "block" }}>3. サービス内容 *</label>
            {["介護タクシー（保険外）外出支援", "買い物支援", "お手伝い支援", "安否確認"].map(s => (
              <label key={s} style={{ display: "block", fontSize: "0.9rem" }}><input type="radio" name="service" checked={booking.serviceType === s} onChange={() => setBooking({...booking, serviceType: s})} /> {s}</label>
            ))}
          </div>

          <div>
            <label style={{ fontWeight: "bold", display: "block" }}>4. 行程 *</label>
            <textarea placeholder="お迎え場所" required style={{ width: "100%", padding: "10px", marginBottom: "5px" }} onChange={e => setBooking({...booking, from: e.target.value})} />
            <textarea placeholder="行き先（タクシー利用時）" style={{ width: "100%", padding: "10px" }} onChange={e => setBooking({...booking, to: e.target.value})} />
          </div>

          <div>
            <label style={{ fontWeight: "bold", display: "block" }}>5. 詳細オプション</label>
            <p style={{ fontSize: "0.8rem", margin: "5px 0" }}>車椅子:</p>
            {["利用なし", "自分の車いす", "レンタル希望", "リクライニング希望"].map(w => (
              <label key={w} style={{ marginRight: "10px", fontSize: "0.8rem" }}><input type="radio" checked={booking.wheelchair === w} onChange={() => setBooking({...booking, wheelchair: w})} /> {w}</label>
            ))}
          </div>

          <div>
            <label style={{ fontWeight: "bold", display: "block" }}>6. お支払い方法 *</label>
            {["現金", "銀行振込", "請求書払い"].map(p => (
              <label key={p} style={{ marginRight: "10px" }}><input type="radio" checked={booking.payment === p} onChange={() => setBooking({...booking, payment: p})} /> {p}</label>
            ))}
          </div>

          <button type="submit" style={{ padding: "15px", background: C.orange, color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "1.1rem", cursor: "pointer" }}>予約を確定する</button>
        </form>
      </div>
    </div>
  );

  // --- メイン画面 ---
  return (
    <div style={{ background: C.cream, minHeight: "100vh", fontFamily: "sans-serif" }}>
      <header style={{ background: C.green, padding: "20px", color: "#fff", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "1.2rem" }}>🚕 ハコビテ 総合予約システム</h1>
      </header>

      <main style={{ maxWidth: "500px", margin: "0 auto", padding: "15px" }}>
        <section style={{ background: C.white, padding: "20px", borderRadius: "15px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "1rem", color: C.green }}>🧮 概算料金計算</h2>
          <input type="number" placeholder="距離 (km)" style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd" }} value={tripKm} onChange={e => setTripKm(e.target.value)} />
          <button onClick={calculateFare} style={{ width: "100%", padding: "12px", background: C.green, color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold" }}>計算する</button>
          {simResult && <div style={{ marginTop: "15px", textAlign: "center", fontSize: "1.8rem", fontWeight: "bold", color: C.green }}>¥{simResult.toLocaleString()}</div>}
        </section>

        <section style={{ background: C.white, padding: "20px", borderRadius: "15px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "1rem", color: C.green }}>📅 予約空き状況</h2>
          <p style={{ fontSize: "0.8rem", color: "#666" }}>○をタップして詳細入力へ進みます</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "10px" }}>
            {["09:00", "11:00", "13:00", "15:00", "17:00"].map(time => {
              const d = new Date(); d.setHours(parseInt(time), 0, 0, 0);
              return (
                <button key={time} onClick={() => { setSelectedSlot(d.toISOString()); setView("booking"); }}
                  style={{ padding: "12px", border: `1px solid ${C.green}`, background: "#fff", borderRadius: "8px", color: C.green, fontWeight: "bold", cursor: "pointer" }}>
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
