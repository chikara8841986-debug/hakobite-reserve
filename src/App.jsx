import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

// ============================================================
// 運賃設定
// ============================================================
const FARE = {
  baseFare: 750, meterFare: 80, meterDistance: 0.250,
  welfareFee: 1000, careFee: 500,
  wheelchair: { normal: 500, reclining: 700 }
};
function calculateFare(distKm, opts = {}) {
  if (distKm <= 0) return null;
  const { needsCare = false, wheelchairType = "none" } = opts;
  let meterFare = FARE.baseFare;
  meterFare += Math.ceil(distKm / FARE.meterDistance) * FARE.meterFare;
  const welfareFee = FARE.welfareFee;
  const careFee = needsCare ? FARE.careFee : 0;
  let wf = 0;
  if (wheelchairType === "normal") wf = FARE.wheelchair.normal;
  if (wheelchairType === "reclining") wf = FARE.wheelchair.reclining;
  return { meterFare, welfareFee, careFee, wheelchairFee: wf, total: meterFare + welfareFee + careFee + wf };
}
const fmt = n => n.toLocaleString();

// ============================================================
// カラー
// ============================================================
const C = {
  green: "#5b8c3e", greenLight: "#6fa34a", greenBg: "#eef5e6",
  orange: "#e88634", orangeBg: "#fef5eb",
  cream: "#faf7f2", white: "#ffffff",
  border: "#e5ddd2", borderLight: "#f0ebe3",
  text: "#3d3529", textMid: "#6b5e4f", textLight: "#8a7d6e",
  red: "#c0392b", redBg: "#fdecea",
  purple: "#7b5ea7", purpleBg: "#f3eff8"
};

const GlobalStyle = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; touch-action: manipulation; }
    body {
      background: ${C.cream};
      color: ${C.text};
      font-family: 'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif;
      overflow-x: hidden; width: 100%; max-width: 100vw;
      font-size: 14px; line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    input, select, textarea, button { font-family: inherit; font-size: 16px; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    input::placeholder, textarea::placeholder { color: #b5a99a; }
    a { color: inherit; }
  `}</style>
);

// ============================================================
// 共通スタイル
// ============================================================
const inputStyle = {
  width: "100%", padding: "11px 12px", background: C.cream,
  border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
  fontSize: 16, outline: "none", boxSizing: "border-box"
};
const cardStyle = {
  background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
  padding: "20px 16px", marginBottom: 14,
  boxShadow: "0 2px 6px rgba(107,94,79,0.05)"
};
const btnGreen = {
  width: "100%", padding: 14, border: "none", borderRadius: 10,
  background: `linear-gradient(135deg, ${C.green}, ${C.greenLight})`,
  color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
  boxShadow: "0 3px 12px rgba(91,140,62,0.25)"
};
const btnOrange = {
  ...btnGreen,
  background: `linear-gradient(135deg, ${C.orange}, #f5a623)`,
  boxShadow: "0 3px 12px rgba(232,134,52,0.25)"
};

// ============================================================
// 共通コンポーネント
// ============================================================
function Header() {
  return (
    <header style={{
      background: `linear-gradient(135deg, ${C.green}, ${C.greenLight})`,
      padding: "14px 16px", textAlign: "center", position: "relative", overflow: "hidden"
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23fff' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        opacity: 0.5
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", letterSpacing: "0.12em", marginBottom: 2 }}>♿ 福祉タクシー</div>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "0.06em" }}>ハコビテ　総合システム</h1>
      </div>
    </header>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 22, height: 22, borderRadius: 5, background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{icon}</span>
      {title}
    </div>
  );
}

function FormField({ label, required: req, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.textMid, marginBottom: 4 }}>
        {label}
        {req && <span style={{ color: C.red, fontSize: 11, fontWeight: 700, marginLeft: 4 }}>（必須）</span>}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({ active, onToggle, icon, label, sub, color, activeBg }) {
  return (
    <div onClick={onToggle} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 12px", marginBottom: 8,
      background: active ? activeBg : C.cream,
      border: `1px solid ${active ? color + "50" : C.borderLight}`,
      borderRadius: 8, cursor: "pointer", userSelect: "none"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
          <div style={{ fontSize: 11, color: C.textLight }}>{sub}</div>
        </div>
      </div>
      <div style={{
        width: 40, height: 22, borderRadius: 11,
        background: active ? color : "#d1cbc2",
        position: "relative", transition: "background 0.3s", flexShrink: 0
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 2, left: active ? 20 : 2,
          transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
        }} />
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, bg, color, note }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 10px", marginBottom: 4,
      background: bg, borderRadius: 7, borderLeft: `3px solid ${color}`
    }}>
      <div>
        <span style={{ fontSize: 12, color: C.text }}>{label}</span>
        {note && <span style={{ fontSize: 10, color: C.textLight, marginLeft: 4 }}>({note})</span>}
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>¥{fmt(value)}</span>
    </div>
  );
}

function RadioGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {options.map(opt => {
        const val = typeof opt === "string" ? opt : opt.value;
        const lbl = typeof opt === "string" ? opt : opt.label;
        const active = value === val;
        return (
          <label key={val} onClick={() => onChange(val)} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 10px", borderRadius: 7, cursor: "pointer",
            background: active ? C.greenBg : C.cream,
            border: `1.5px solid ${active ? C.green : C.borderLight}`,
            transition: "all 0.15s"
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%",
              border: `2px solid ${active ? C.green : "#ccc"}`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              {active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green }} />}
            </div>
            <span style={{ fontSize: 13, color: active ? C.green : C.textMid, fontWeight: active ? 600 : 400 }}>{lbl}</span>
          </label>
        );
      })}
    </div>
  );
}

function PageFooter() {
  return (
    <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: C.textMid, lineHeight: 1.9, paddingBottom: 16 }}>
      <div>香川県内限定サービス ・ 迎車料金は含まれません</div>
      <div style={{ fontSize: 10, color: C.textLight }}>ハコビテ — 移動と暮らしを、支える</div>
    </div>
  );
}

function PriceLinkCard() {
  return (
    <a href="https://hakobite-reserve.vercel.app/price" style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        ...cardStyle, marginBottom: 0, padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 10,
        borderLeft: `4px solid ${C.green}`, cursor: "pointer"
      }}>
        <span style={{ fontSize: 20 }}>🧮</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>料金の試算はこちら →</div>
          <div style={{ fontSize: 10, color: C.textLight, marginTop: 1 }}>距離とオプションから概算料金を確認</div>
        </div>
      </div>
    </a>
  );
}

// ============================================================
// 1. トップメニュー
// ============================================================
function Home() {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 14px", textAlign: "center" }}>
      <h2 style={{ color: C.green, marginBottom: 6, fontSize: 18 }}>🚕 ようこそ</h2>
      <p style={{ color: C.textMid, fontSize: 12, marginBottom: 24 }}>ご利用になるサービスをお選びください</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Link to="/price" style={{ textDecoration: "none" }}>
          <div style={{ ...cardStyle, marginBottom: 0, padding: "18px 16px", display: "flex", alignItems: "center", gap: 14, borderLeft: `4px solid ${C.green}` }}>
            <span style={{ fontSize: 28 }}>🧮</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>料金を試算する</div>
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>距離とオプションから概算料金を計算</div>
            </div>
          </div>
        </Link>
        <Link to="/reserve" style={{ textDecoration: "none" }}>
          <div style={{ ...cardStyle, marginBottom: 0, padding: "18px 16px", display: "flex", alignItems: "center", gap: 14, borderLeft: `4px solid ${C.orange}`, background: `linear-gradient(135deg, ${C.orangeBg}, #fff8f0)` }}>
            <span style={{ fontSize: 28 }}>📅</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.orange }}>今すぐ予約する</div>
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>空き状況を確認してそのまま予約</div>
            </div>
          </div>
        </Link>
      </div>
      <PageFooter />
    </div>
  );
}

// ============================================================
// 2. 料金試算
// ============================================================
function PriceCalculator() {
  const [tripKm, setTripKm] = useState("");
  const [needsCare, setNeedsCare] = useState(false);
  const [wheelchairType, setWheelchairType] = useState("none");
  const [fareResult, setFareResult] = useState(null);

  const handleCalc = () => {
    const d = parseFloat(tripKm);
    if (!d || d <= 0) return;
    setFareResult(calculateFare(d, { needsCare, wheelchairType }));
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 14px 40px" }}>
      <Link to="/" style={{ color: C.green, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>← メニューへ戻る</Link>

      <div style={{ ...cardStyle, marginTop: 10, padding: "12px 16px", background: C.orangeBg, borderLeft: `4px solid ${C.orange}` }}>
        <div style={{ fontSize: 11, color: C.orange, fontWeight: 600 }}>⚠ 料金はあくまで概算です。実際の料金は走行ルート・交通状況により変動します。</div>
      </div>

      <div style={cardStyle}>
        <SectionTitle icon="🧮" title="料金試算" />
        <FormField label="走行距離（km）" required>
          <input type="number" step="0.1" min="0" inputMode="decimal" placeholder="例: 5.2" value={tripKm} onChange={e => setTripKm(e.target.value)} style={inputStyle} />
        </FormField>

        <ToggleRow active={needsCare} onToggle={() => setNeedsCare(!needsCare)}
          icon="🤝" label="身体介護等あり" sub="＋500円" color={C.orange} activeBg={C.orangeBg} />

        <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, margin: "12px 0 6px" }}>🦽 車椅子レンタル（日をまたぐ場合）</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[
            { value: "none", label: "なし", sub: "" },
            { value: "normal", label: "普通型", sub: "＋500円" },
            { value: "reclining", label: "リクライニング", sub: "＋700円" }
          ].map(opt => (
            <button key={opt.value} type="button" onClick={() => setWheelchairType(opt.value)}
              style={{
                flex: 1, padding: "10px 4px",
                background: wheelchairType === opt.value ? C.greenBg : C.cream,
                border: `2px solid ${wheelchairType === opt.value ? C.green : C.borderLight}`,
                borderRadius: 8, cursor: "pointer", textAlign: "center", fontSize: 16
              }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: wheelchairType === opt.value ? C.green : C.textMid }}>{opt.label}</div>
              {opt.sub && <div style={{ fontSize: 10, color: C.textLight, marginTop: 1 }}>{opt.sub}</div>}
            </button>
          ))}
        </div>

        <button type="button" onClick={handleCalc} style={btnGreen}>🚕 料金を計算する</button>

        {fareResult && (
          <div style={{ marginTop: 14, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, animation: "fadeIn 0.3s ease-out" }}>
            <div style={{ padding: "16px 14px", textAlign: "center", background: `linear-gradient(135deg, ${C.greenBg}, #f0f7e8)`, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, color: C.textLight, letterSpacing: "0.1em", marginBottom: 3 }}>推定合計料金（片道）</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: C.green, lineHeight: 1.1 }}>¥{fmt(fareResult.total)}</div>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textLight, marginBottom: 6 }}>📋 内訳</div>
              <BreakdownRow label={`メーター運賃（${parseFloat(tripKm).toFixed(1)}km）`} value={fareResult.meterFare} bg={C.greenBg} color={C.green} />
              <BreakdownRow label="福祉車両代" value={fareResult.welfareFee} bg={C.orangeBg} color={C.orange} />
              {fareResult.careFee > 0 && <BreakdownRow label="身体介護等" value={fareResult.careFee} bg={C.redBg} color={C.red} />}
              {fareResult.wheelchairFee > 0 && <BreakdownRow label={`車椅子（${wheelchairType === "reclining" ? "リクライニング" : "普通型"}）`} value={fareResult.wheelchairFee} bg={C.purpleBg} color={C.purple} note="日またぎ" />}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", marginTop: 6, borderTop: `2px solid ${C.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>合計</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: C.green }}>¥{fmt(fareResult.total)}</span>
              </div>
            </div>
            <div style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}`, background: C.cream, fontSize: 10, color: C.textMid, lineHeight: 1.6 }}>
              初乗り: {FARE.baseFare}円 ｜ 加算: {FARE.meterFare}円/{FARE.meterDistance * 1000}m（全距離適用）<br />
              福祉車両代{fmt(FARE.welfareFee)}円は基本に含まれます
              <div style={{ color: C.textLight, marginTop: 2 }}>※ 交通状況等により変動します</div>
            </div>
          </div>
        )}
      </div>

      <Link to="/reserve" style={{ textDecoration: "none", display: "block" }}>
        <div style={{ ...cardStyle, padding: "14px 16px", marginBottom: 0, display: "flex", alignItems: "center", gap: 12, borderLeft: `4px solid ${C.orange}`, background: `linear-gradient(135deg, ${C.orangeBg}, #fff8f0)` }}>
          <span style={{ fontSize: 24 }}>📅</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.orange }}>予約はこちら →</div>
            <div style={{ fontSize: 10, color: C.textLight, marginTop: 1 }}>空き状況を確認してそのまま予約</div>
          </div>
        </div>
      </Link>
      <PageFooter />
    </div>
  );
}

// ============================================================
// 3. 予約システム
// ============================================================
function ReservationSystem() {
  const [step, setStep] = useState("slots");
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [busySlots, setBusySlots] = useState([]);

  const [booking, setBooking] = useState({
    duration: "30分", name: "", furigana: "", tel: "", email: "",
    serviceType: "介護タクシー",
    from: "", to: "", wheelchair: "利用なし",
    careReq: "車の乗降介助程度", passengers: "1名",
    isSamePerson: "はい", payment: "現金", note: ""
  });

  const durationMap = { "30分": 30, "1時間": 60, "1時間30分": 90, "2時間": 120, "2時間30分": 150, "3時間": 180, "4時間": 240, "5時間": 300 };
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate); d.setDate(d.getDate() + i); return d;
  });
  const timeSlots = [];
  for (let h = 8; h <= 18; h++) {
    timeSlots.push({ hour: h, minute: 0 });
    if (h < 18) timeSlots.push({ hour: h, minute: 30 });
  }

  useEffect(() => {
    setLoading(true);
    fetch("/api/slots").then(r => r.ok ? r.json() : []).then(d => setBusySlots(d || [])).catch(() => setBusySlots([])).finally(() => setLoading(false));
  }, []);

  const updateBooking = (k, v) => setBooking(prev => ({ ...prev, [k]: v }));

  const handleReserve = async (e) => {
    e.preventDefault();
    const startMs = new Date(selectedSlot).getTime();
    const endMs = startMs + durationMap[booking.duration] * 60 * 1000;
    const conflict = busySlots.some(b => {
      const bS = new Date(b.start).getTime(), bE = new Date(b.end).getTime();
      return startMs < bE && endMs > bS;
    });
    if (conflict) { alert(`選択された時間帯（${booking.duration}）は既に予約があります。別の時間をお選びください。`); return; }

    const slotD = new Date(selectedSlot);
    const endD = new Date(endMs);
    const dateStr = slotD.toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const endStr = `${endD.getHours()}:${endD.getMinutes().toString().padStart(2, "0")}`;
    const details = [
      `■日時: ${dateStr} ～ ${endStr} (${booking.duration})`, `■サービス: ${booking.serviceType}`,
      `■お名前: ${booking.name}（${booking.furigana}）`, `■電話: ${booking.tel}`,
      `■メール: ${booking.email || "未入力"}`, `■お迎え場所: ${booking.from}`,
      `■目的地: ${booking.to}`, `■車椅子: ${booking.wheelchair}`,
      `■介助: ${booking.careReq}`, `■乗車人数: ${booking.passengers}`,
      `■ご本人: ${booking.isSamePerson}`, `■支払い: ${booking.payment}`,
      `■備考: ${booking.note || "なし"}`
    ].join("\n");

    try {
      const res = await fetch("/api/reserve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: `【予約】${booking.name}様 (${booking.duration}) - ${booking.serviceType}`,
          description: details, start: selectedSlot,
          duration_minutes: durationMap[booking.duration],
          name: booking.name, email: booking.email
        })
      });
      if (res.ok) setStep("success"); else alert("送信に失敗しました。");
    } catch { alert("通信エラーが発生しました。"); }
  };

  // --- 完了 ---
  if (step === "success") return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "36px 14px", textAlign: "center" }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
        <h2 style={{ color: C.green, marginBottom: 6, fontSize: 18 }}>ご予約ありがとうございます</h2>
        <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.8, marginBottom: 18 }}>確認のご連絡を差し上げます。</p>
        <button onClick={() => { setStep("slots"); setWeekOffset(0); }} style={btnGreen}>カレンダーに戻る</button>
      </div>
    </div>
  );

  // --- 予約フォーム ---
  if (step === "form") {
    const slotD = selectedSlot ? new Date(selectedSlot) : null;
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 14px 40px" }}>
        <button onClick={() => setStep("slots")} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10, padding: 0 }}>← 空き状況に戻る</button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ background: C.greenBg, color: C.green, fontWeight: 700, padding: "3px 8px", borderRadius: 10, fontSize: 10 }}>① 日時選択 ✓</span>
          <span style={{ color: C.border, fontSize: 11 }}>→</span>
          <span style={{ background: C.orangeBg, color: C.orange, fontWeight: 700, padding: "3px 8px", borderRadius: 10, fontSize: 10 }}>② 詳細入力</span>
          <span style={{ color: C.border, fontSize: 11 }}>→</span>
          <span style={{ color: C.textLight, fontSize: 10 }}>③ 完了</span>
        </div>

        <div style={{ ...cardStyle, padding: "12px 16px", background: C.greenBg, borderLeft: `4px solid ${C.green}` }}>
          <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2 }}>選択した日時</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>
            📅 {slotD ? slotD.toLocaleString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }) : "未選択"}
          </div>
        </div>

        <form onSubmit={handleReserve}>
          <div style={cardStyle}>
            <SectionTitle icon="⏱" title="ご利用時間" />
            <FormField label="ご利用予定時間" required>
              <select value={booking.duration} onChange={e => updateBooking("duration", e.target.value)} style={inputStyle}>
                {Object.keys(durationMap).map(d => <option key={d}>{d}</option>)}
              </select>
            </FormField>
          </div>

          <div style={cardStyle}>
            <SectionTitle icon="👤" title="お客様情報" />
            <FormField label="お名前" required><input type="text" required placeholder="山田 太郎" value={booking.name} onChange={e => updateBooking("name", e.target.value)} style={inputStyle} /></FormField>
            <FormField label="ふりがな"><input type="text" placeholder="やまだ たろう" value={booking.furigana} onChange={e => updateBooking("furigana", e.target.value)} style={inputStyle} /></FormField>
            <FormField label="電話番号" required><input type="tel" required placeholder="090-1234-5678" value={booking.tel} onChange={e => updateBooking("tel", e.target.value)} style={inputStyle} /></FormField>
            <FormField label="メールアドレス"><input type="email" placeholder="example@email.com" value={booking.email} onChange={e => updateBooking("email", e.target.value)} style={inputStyle} /></FormField>
          </div>

          <div style={cardStyle}>
            <SectionTitle icon="📍" title="サービス・行程" />
            <FormField label="サービス種別" required>
              <RadioGroup options={["介護タクシー", "買い物代行・付き添い", "その他"]} value={booking.serviceType} onChange={v => updateBooking("serviceType", v)} />
            </FormField>
            <FormField label="お迎え場所" required><textarea required placeholder="住所・施設名など" value={booking.from} onChange={e => updateBooking("from", e.target.value)} style={{ ...inputStyle, minHeight: 56, resize: "vertical" }} /></FormField>
            <FormField label="目的地" required><textarea required placeholder="住所・施設名など" value={booking.to} onChange={e => updateBooking("to", e.target.value)} style={{ ...inputStyle, minHeight: 56, resize: "vertical" }} /></FormField>
          </div>

          <div style={cardStyle}>
            <SectionTitle icon="♿" title="介助・車椅子" />
            <FormField label="介助の必要性" required>
              <RadioGroup options={[
                { value: "車の乗降介助程度", label: "車の乗降介助程度" },
                { value: "身体介護等あり", label: "身体介護等あり（＋500円）" }
              ]} value={booking.careReq} onChange={v => updateBooking("careReq", v)} />
            </FormField>
            <FormField label="車椅子" required>
              <RadioGroup options={[
                { value: "利用なし", label: "利用なし" },
                { value: "自分の車椅子を使用", label: "自分の車椅子を使用" },
                { value: "普通型レンタル", label: "普通型をレンタル（日またぎ＋500円）" },
                { value: "リクライニング型レンタル", label: "リクライニング型をレンタル（日またぎ＋700円）" }
              ]} value={booking.wheelchair} onChange={v => updateBooking("wheelchair", v)} />
            </FormField>
            <FormField label="乗車人数">
              <select value={booking.passengers} onChange={e => updateBooking("passengers", e.target.value)} style={inputStyle}>
                {["1名", "2名（付き添い1名）", "3名（付き添い2名）"].map(p => <option key={p}>{p}</option>)}
              </select>
            </FormField>
            <FormField label="ご予約者はご本人ですか？">
              <RadioGroup options={["はい", "いいえ（代理予約）"]} value={booking.isSamePerson} onChange={v => updateBooking("isSamePerson", v)} />
            </FormField>
          </div>

          <div style={cardStyle}>
            <SectionTitle icon="💳" title="お支払い・備考" />
            <FormField label="お支払い方法" required>
              <RadioGroup options={["現金", "銀行振込", "請求書払い（法人）"]} value={booking.payment} onChange={v => updateBooking("payment", v)} />
            </FormField>
            <FormField label="備考・ご要望">
              <textarea placeholder="何かあればご記入ください" value={booking.note} onChange={e => updateBooking("note", e.target.value)} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />
            </FormField>
          </div>

          <div style={{ marginBottom: 14 }}><PriceLinkCard /></div>
          <button type="submit" style={btnOrange}>📩 この内容で予約する</button>
        </form>
        <PageFooter />
      </div>
    );
  }

  // --- カレンダー ---
  const now = new Date();

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 10px 40px", overflow: "hidden" }}>
      <Link to="/" style={{ color: C.green, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>← メニューへ戻る</Link>
      <h2 style={{ textAlign: "center", color: C.green, margin: "12px 0 8px", fontSize: 17 }}>📅 ハコビテ 予約フォーム</h2>

      <div style={{ ...cardStyle, padding: "12px 14px", borderLeft: `4px solid ${C.orange}`, background: C.orangeBg }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.orange, marginBottom: 3 }}>📱 かんたん3ステップ</div>
        <div style={{ fontSize: 11, color: C.textMid, lineHeight: 1.7 }}>
          ① 「<span style={{ color: "#e0004e", fontWeight: 700 }}>○</span>」をタップ → ② 詳細を入力 → ③ 予約完了！
        </div>
        <div style={{ fontSize: 10, color: C.textLight, marginTop: 4 }}>※ 表は左右にスクロールできます</div>
      </div>

      {/* 週送り */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0", gap: 4 }}>
        <button onClick={() => setWeekOffset(p => Math.max(0, p - 1))} disabled={weekOffset <= 0}
          style={{ padding: "8px 12px", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, background: weekOffset <= 0 ? "#ddd" : C.green, color: weekOffset <= 0 ? "#999" : "#fff", cursor: weekOffset <= 0 ? "default" : "pointer", whiteSpace: "nowrap" }}>
          ← 前週
        </button>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.green, textAlign: "center" }}>
          {weekDays[0].getMonth() + 1}/{weekDays[0].getDate()} ～ {weekDays[6].getMonth() + 1}/{weekDays[6].getDate()}
        </div>
        <button onClick={() => setWeekOffset(p => p + 1)}
          style={{ padding: "8px 12px", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, background: C.green, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
          次週 →
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", fontSize: 11, color: C.textMid, marginBottom: 6 }}>
        <span><span style={{ color: "#e0004e", fontWeight: 700 }}>○</span> 予約可</span>
        <span><span style={{ color: "#bbb" }}>×</span> 不可</span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 24, color: C.textLight, fontSize: 13 }}>読み込み中...</div>
      ) : (
        <div style={{
          overflowX: "auto", WebkitOverflowScrolling: "touch",
          border: `1px solid ${C.border}`, borderRadius: 8,
          background: C.white, marginBottom: 14, maxWidth: "100%"
        }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 420, fontSize: 11, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 44 }} />
              {weekDays.map((_, i) => <col key={i} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{ background: C.green, color: "#fff", padding: "5px 2px", border: `1px solid ${C.border}`, position: "sticky", left: 0, zIndex: 3, fontSize: 10, fontWeight: 700 }}>時間</th>
                {weekDays.map((d, i) => {
                  const dow = d.getDay();
                  const color = dow === 0 ? "#cc1a1a" : dow === 6 ? "#1a6bcc" : C.green;
                  return (
                    <th key={i} style={{ background: C.greenBg, color, padding: "4px 1px", border: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1.2 }}>
                      {d.getMonth() + 1}/{d.getDate()}<br /><span style={{ fontSize: 9 }}>({dayNames[dow]})</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, idx) => (
                <tr key={idx}>
                  <td style={{ position: "sticky", left: 0, background: "#faf9f7", padding: "4px 1px", border: `1px solid ${C.border}`, borderRight: `2px solid ${C.border}`, fontWeight: 600, fontSize: 10, color: C.textMid, textAlign: "center", zIndex: 2 }}>
                    {time.hour}:{time.minute.toString().padStart(2, "0")}
                  </td>
                  {weekDays.map((d, i) => {
                    const sd = new Date(d); sd.setHours(time.hour, time.minute, 0, 0);
                    const isPast = sd < now;
                    const sMs = sd.getTime(), eMs = sMs + 30 * 60 * 1000;
                    const isBusy = busySlots.some(b => {
                      const bS = new Date(b.start).getTime(), bE = new Date(b.end).getTime();
                      return sMs < bE && eMs > bS;
                    });
                    if (isPast) return <td key={i} style={{ background: "#f5f3f0", color: "#ccc", border: `1px solid ${C.border}`, textAlign: "center", fontSize: 12, padding: "5px 0" }}>×</td>;
                    if (isBusy) return <td key={i} style={{ background: "#fafafa", color: "#bbb", border: `1px solid ${C.border}`, textAlign: "center", fontSize: 12, padding: "5px 0" }}>×</td>;
                    return (
                      <td key={i} style={{ padding: 0, border: `1px solid ${C.border}` }}>
                        <button onClick={() => { setSelectedSlot(sd.toISOString()); setStep("form"); }}
                          style={{ background: "#fff5f8", color: "#e0004e", border: "none", width: "100%", padding: "5px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "block" }}>
                          ○
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

      <PriceLinkCard />
      <PageFooter />
    </div>
  );
}

// ============================================================
// ルーティング
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      <GlobalStyle />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/price" element={<PriceCalculator />} />
        <Route path="/reserve" element={<ReservationSystem />} />
      </Routes>
    </BrowserRouter>
  );
}
