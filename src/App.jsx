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
  let mf = FARE.baseFare + Math.ceil(distKm / FARE.meterDistance) * FARE.meterFare;
  const cf = needsCare ? FARE.careFee : 0;
  let wf = 0;
  if (wheelchairType === "normal") wf = FARE.wheelchair.normal;
  if (wheelchairType === "reclining") wf = FARE.wheelchair.reclining;
  return { meterFare: mf, welfareFee: FARE.welfareFee, careFee: cf, wheelchairFee: wf, total: mf + FARE.welfareFee + cf + wf };
}
const fmt = n => n.toLocaleString();

// ============================================================
// 移動時間計算ユーティリティ
// ============================================================
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};
const minutesToTime = (mins) => {
  let total = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

// ============================================================
// カラー
// ============================================================
const C = {
  green: "#5b8c3e", greenLight: "#6fa34a", greenBg: "#eef5e6",
  orange: "#e88634", orangeBg: "#fef5eb",
  cream: "#faf7f2", white: "#fff",
  border: "#e5ddd2", borderLight: "#f0ebe3",
  text: "#3d3529", textMid: "#6b5e4f", textLight: "#8a7d6e",
  red: "#c0392b", redBg: "#fdecea",
  purple: "#7b5ea7", purpleBg: "#f3eff8",
  pink: "#e0004e", pinkBg: "#fff0f5", pinkLight: "#fce4ec",
  blue: "#1a6bcc", blueBg: "#e8f1fd"
};

// ============================================================
// グローバルCSS
// ============================================================
const GlobalStyle = () => (
  <style>{`
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{-webkit-text-size-adjust:100%;text-size-adjust:100%;touch-action:manipulation}
    body{background:${C.cream};color:${C.text};font-family:'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif;overflow-x:hidden;width:100%;max-width:100vw;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
    input,select,textarea,button{font-family:inherit;font-size:16px}
    @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    input::placeholder,textarea::placeholder{color:#b5a99a}
    a{color:inherit}
  `}</style>
);

// ============================================================
// 共通スタイル
// ============================================================
const inp = { width: "100%", padding: "11px 12px", background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 16, outline: "none", boxSizing: "border-box" };
const card = { background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 16px", marginBottom: 14, boxShadow: "0 2px 6px rgba(107,94,79,0.05)" };
const bGreen = { width: "100%", padding: 14, border: "none", borderRadius: 10, background: `linear-gradient(135deg,${C.green},${C.greenLight})`, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 12px rgba(91,140,62,0.25)" };
const bOrange = { ...bGreen, background: `linear-gradient(135deg,${C.orange},#f5a623)`, boxShadow: "0 3px 12px rgba(232,134,52,0.25)" };

// ============================================================
// 共通コンポーネント
// ============================================================
function Header() {
  return (
    <header style={{ background: `linear-gradient(135deg,${C.green},${C.greenLight})`, padding: "14px 16px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23fff' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", opacity: 0.5 }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", letterSpacing: "0.12em", marginBottom: 2 }}>♿ 福祉タクシー</div>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "0.06em" }}>ハコビテ　ふじ介護タクシー</h1>
      </div>
    </header>
  );
}
function ST({ icon, title }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 22, height: 22, borderRadius: 5, background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{icon}</span>{title}</div>;
}
function FF({ label, required: r, children, error }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: error ? C.red : C.textMid, marginBottom: 4 }}>
        {label}{r && <span style={{ color: C.red, fontSize: 11, fontWeight: 700, marginLeft: 4 }}>（必須）</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>⚠ {error}</div>}
    </div>
  );
}
function Toggle({ active, onToggle, icon, label, sub, color, abg }) {
  return (
    <div onClick={onToggle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", marginBottom: 8, background: active ? abg : C.cream, border: `1px solid ${active ? color + "50" : C.borderLight}`, borderRadius: 8, cursor: "pointer", userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 16 }}>{icon}</span><div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div><div style={{ fontSize: 11, color: C.textLight }}>{sub}</div></div></div>
      <div style={{ width: 40, height: 22, borderRadius: 11, background: active ? color : "#d1cbc2", position: "relative", transition: "background 0.3s", flexShrink: 0 }}><div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: active ? 20 : 2, transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} /></div>
    </div>
  );
}
function BR({ label, value, bg, color, note }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", marginBottom: 4, background: bg, borderRadius: 7, borderLeft: `3px solid ${color}` }}><div><span style={{ fontSize: 12, color: C.text }}>{label}</span>{note && <span style={{ fontSize: 10, color: C.textLight, marginLeft: 4 }}>({note})</span>}</div><span style={{ fontSize: 14, fontWeight: 700, color }}>¥{fmt(value)}</span></div>;
}
function RG({ options, value, onChange }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{options.map(o => { const v = typeof o === "string" ? o : o.value, l = typeof o === "string" ? o : o.label, a = value === v; return <label key={v} onClick={() => onChange(v)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 7, cursor: "pointer", background: a ? C.greenBg : C.cream, border: `1.5px solid ${a ? C.green : C.borderLight}` }}><div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${a ? C.green : "#ccc"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{a && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green }} />}</div><span style={{ fontSize: 13, color: a ? C.green : C.textMid, fontWeight: a ? 600 : 400 }}>{l}</span></label>; })}</div>;
}
function Footer() {
  return <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: C.textMid, lineHeight: 1.9, paddingBottom: 16 }}><div>香川県内限定サービス ・ 迎車料金は含まれません</div><div style={{ fontSize: 10, color: C.textLight }}>ハコビテ — 移動と暮らしを、支える</div></div>;
}
function PriceLink() {
  return <a href="https://hakobite-reserve.vercel.app/price" style={{ textDecoration: "none", display: "block" }}><div style={{ ...card, marginBottom: 0, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, borderLeft: `4px solid ${C.green}`, cursor: "pointer" }}><span style={{ fontSize: 20 }}>🧮</span><div><div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>料金の試算はこちら →</div><div style={{ fontSize: 10, color: C.textLight, marginTop: 1 }}>距離とオプションから概算料金を確認</div></div></div></a>;
}

// ============================================================
// 確認行ラベルコンポーネント
// ============================================================
function ConfirmRow({ label, value, highlight }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.borderLight}` }}>
      <div style={{ fontSize: 11, color: C.textLight, minWidth: 120, flexShrink: 0, paddingTop: 1 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: highlight ? 700 : 400, color: highlight ? C.green : C.text, flex: 1 }}>{value || "—"}</div>
    </div>
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
          <div style={{ ...card, marginBottom: 0, padding: "18px 16px", display: "flex", alignItems: "center", gap: 14, borderLeft: `4px solid ${C.green}` }}>
            <span style={{ fontSize: 28 }}>🧮</span>
            <div style={{ textAlign: "left" }}><div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>料金を試算する</div><div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>距離とオプションから概算料金を計算</div></div>
          </div>
        </Link>
        <Link to="/reserve" style={{ textDecoration: "none" }}>
          <div style={{ ...card, marginBottom: 0, padding: "18px 16px", display: "flex", alignItems: "center", gap: 14, borderLeft: `4px solid ${C.orange}`, background: `linear-gradient(135deg,${C.orangeBg},#fff8f0)` }}>
            <span style={{ fontSize: 28 }}>📅</span>
            <div style={{ textAlign: "left" }}><div style={{ fontSize: 15, fontWeight: 700, color: C.orange }}>今すぐ予約する</div><div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>空き状況を確認してそのまま予約</div></div>
          </div>
        </Link>
      </div>
      <Footer />
    </div>
  );
}

// ============================================================
// 2. 料金試算
// ============================================================
function PriceCalculator() {
  const [km, setKm] = useState("");
  const [care, setCare] = useState(false);
  const [wc, setWc] = useState("none");
  const [res, setRes] = useState(null);
  const calc = () => { const d = parseFloat(km); if (d > 0) setRes(calculateFare(d, { needsCare: care, wheelchairType: wc })); };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 14px 40px" }}>
      <Link to="/" style={{ color: C.green, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>← メニューへ戻る</Link>
      <div style={{ ...card, marginTop: 10, padding: "12px 16px", background: C.orangeBg, borderLeft: `4px solid ${C.orange}` }}>
        <div style={{ fontSize: 11, color: C.orange, fontWeight: 600 }}>⚠ 料金はあくまで概算です。実際の料金は走行ルート・交通状況により変動します。</div>
      </div>
      <div style={card}>
        <ST icon="🧮" title="料金試算" />
        <FF label="走行距離（km）" required><input type="number" step="0.1" min="0" inputMode="decimal" placeholder="例: 5.2" value={km} onChange={e => setKm(e.target.value)} style={inp} /></FF>
        <Toggle active={care} onToggle={() => setCare(!care)} icon="🤝" label="身体介護等あり" sub="＋500円" color={C.orange} abg={C.orangeBg} />
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, margin: "12px 0 6px" }}>🦽 車椅子レンタル（日をまたぐ場合）</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[{ v: "none", l: "なし", s: "" }, { v: "normal", l: "普通型", s: "＋500円" }, { v: "reclining", l: "リクライニング", s: "＋700円" }].map(o => (
            <button key={o.v} type="button" onClick={() => setWc(o.v)} style={{ flex: 1, padding: "10px 4px", background: wc === o.v ? C.greenBg : C.cream, border: `2px solid ${wc === o.v ? C.green : C.borderLight}`, borderRadius: 8, cursor: "pointer", textAlign: "center", fontSize: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: wc === o.v ? C.green : C.textMid }}>{o.l}</div>
              {o.s && <div style={{ fontSize: 10, color: C.textLight, marginTop: 1 }}>{o.s}</div>}
            </button>
          ))}
        </div>
        <button type="button" onClick={calc} style={bGreen}>🚕 料金を計算する</button>
        {res && (
          <div style={{ marginTop: 14, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, animation: "fadeIn 0.3s ease-out" }}>
            <div style={{ padding: "16px 14px", textAlign: "center", background: `linear-gradient(135deg,${C.greenBg},#f0f7e8)`, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, color: C.textLight, letterSpacing: "0.1em", marginBottom: 3 }}>推定合計料金（片道）</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: C.green, lineHeight: 1.1 }}>¥{fmt(res.total)}</div>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textLight, marginBottom: 6 }}>📋 内訳</div>
              <BR label={`メーター運賃（${parseFloat(km).toFixed(1)}km）`} value={res.meterFare} bg={C.greenBg} color={C.green} />
              <BR label="福祉車両代" value={res.welfareFee} bg={C.orangeBg} color={C.orange} />
              {res.careFee > 0 && <BR label="身体介護等" value={res.careFee} bg={C.redBg} color={C.red} />}
              {res.wheelchairFee > 0 && <BR label={`車椅子（${wc === "reclining" ? "リクライニング" : "普通型"}）`} value={res.wheelchairFee} bg={C.purpleBg} color={C.purple} note="日またぎ" />}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", marginTop: 6, borderTop: `2px solid ${C.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>合計</span><span style={{ fontSize: 18, fontWeight: 800, color: C.green }}>¥{fmt(res.total)}</span>
              </div>
            </div>
            <div style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}`, background: C.cream, fontSize: 10, color: C.textMid, lineHeight: 1.6 }}>
              初乗り: {FARE.baseFare}円 ｜ 加算: {FARE.meterFare}円/{FARE.meterDistance * 1000}m（全距離適用）<br />福祉車両代{fmt(FARE.welfareFee)}円は基本に含まれます
              <div style={{ color: C.textLight, marginTop: 2 }}>※ 交通状況等により変動します</div>
            </div>
          </div>
        )}
      </div>
      <Link to="/reserve" style={{ textDecoration: "none", display: "block" }}>
        <div style={{ ...card, padding: "14px 16px", marginBottom: 0, display: "flex", alignItems: "center", gap: 12, borderLeft: `4px solid ${C.orange}`, background: `linear-gradient(135deg,${C.orangeBg},#fff8f0)` }}>
          <span style={{ fontSize: 24 }}>📅</span><div><div style={{ fontSize: 14, fontWeight: 700, color: C.orange }}>予約はこちら →</div><div style={{ fontSize: 10, color: C.textLight, marginTop: 1 }}>空き状況を確認してそのまま予約</div></div>
        </div>
      </Link>
      <Footer />
    </div>
  );
}

// ============================================================
// 3. 予約システム
// ============================================================
function ReservationSystem() {
  const [step, setStep] = useState("slots");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slot, setSlot] = useState(null);
  const [wOff, setWOff] = useState(0);
  const [busy, setBusy] = useState([]);
  const [errors, setErrors] = useState({});
  const [bk, setBk] = useState({
    duration: "30分",
    name: "", tel: "", email: "",
    serviceType: "介護タクシー",
    from: "", to: "",
    wheelchair: "利用なし",
    careReq: "車の乗降介助程度",
    passengers: "1名",
    bookerType: "本人",
    bookerName: "",
    bookerTel: "",
    bookerTelSame: false,
    familyHospitalStaffName: "",
    careNotes: "",
    payment: "現金",
    note: ""
  });

  const durMap = { "30分": 30, "1時間": 60, "1時間30分": 90, "2時間": 120, "2時間30分": 150, "3時間": 180, "4時間": 240, "5時間": 300 };
  const dn = ["日", "月", "火", "水", "木", "金", "土"];
  const bd = new Date(); bd.setHours(0, 0, 0, 0); bd.setDate(bd.getDate() + wOff * 7);
  const wd = Array.from({ length: 7 }, (_, i) => { const d = new Date(bd); d.setDate(d.getDate() + i); return d; });
  const ts = []; for (let h = 8; h <= 18; h++) { ts.push({ h, m: 0 }); if (h < 18) ts.push({ h, m: 30 }); }
  const ub = (k, v) => setBk(p => ({ ...p, [k]: v }));

  const bookerRequiresName = ["ソーシャルワーカー", "ケアマネジャー", "家族・代理人", "施設担当者", "ふじ介護タクシー", "その他（本人以外）"].includes(bk.bookerType);
  const isFujiKaigo = bk.bookerType === "ふじ介護タクシー";

  useEffect(() => { setLoading(true); fetch("/api/slots").then(r => r.ok ? r.json() : []).then(d => setBusy(d || [])).catch(() => setBusy([])).finally(() => setLoading(false)); }, []);

  const validate = () => {
    const e = {};
    if (!bk.name.trim()) e.name = "お名前を入力してください";
    if (!bk.tel.trim()) e.tel = "電話番号を入力してください";
    if (!bk.from.trim()) e.from = "お迎え場所を入力してください";
    if (bookerRequiresName && !isFujiKaigo && !bk.bookerName.trim()) e.bookerName = "ご担当者のお名前を入力してください";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goConfirm = (e) => {
    e.preventDefault();
    if (validate()) setStep("confirm");
  };

  const submit = async () => {
    const sMs = new Date(slot).getTime(), eMs = sMs + durMap[bk.duration] * 60000;
    if (busy.some(b => sMs < new Date(b.end).getTime() && eMs > new Date(b.start).getTime())) {
      alert(`選択された時間帯（${bk.duration}）は既に予約があります。`);
      setStep("slots");
      return;
    }
    const sD = new Date(slot), eD = new Date(eMs);
    const dStr = sD.toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const eStr = `${eD.getHours()}:${eD.getMinutes().toString().padStart(2, "0")}`;

    // 移動時間（予約開始30分前）計算
    const startTimeStr = `${sD.getHours().toString().padStart(2, "0")}:${sD.getMinutes().toString().padStart(2, "0")}`;
    const startMins = timeToMinutes(startTimeStr);
    const travelStartTime = minutesToTime(startMins - 30);
    const travelEndTime = startTimeStr;
    const dateStr8 = `${sD.getFullYear()}/${(sD.getMonth()+1).toString().padStart(2,"0")}/${sD.getDate().toString().padStart(2,"0")}`;

    const bookerInfo = bookerRequiresName
      ? `■ご担当者のお名前: ${bk.bookerName}\n■ご担当者連絡先: ${bk.bookerTelSame ? bk.tel : bk.bookerTel}`
      : `■予約者区分: ${bk.bookerType}`;
    const familyInfo = isFujiKaigo ? `\n■家族・病院担当者名: ${bk.familyHospitalStaffName}` : "";
    const careNotesInfo = bk.careNotes ? `\n■ご利用に際しての留意事項: ${bk.careNotes}` : "";

    const det = [
      `■日時: ${dStr} ～ ${eStr} (${bk.duration})`,
      `■サービス: ${bk.serviceType}`,
      `■お名前（利用者）: ${bk.name}`,
      `■電話: ${bk.tel}`,
      `■メール: ${bk.email || "未入力"}`,
      bookerInfo + familyInfo + careNotesInfo,
      `■お迎え: ${bk.from}`,
      `■目的地: ${bk.to}`,
      `■車椅子: ${bk.wheelchair}`,
      `■介助: ${bk.careReq}`,
      `■人数: ${bk.passengers}`,
      `■支払: ${bk.payment}`,
      `■備考: ${bk.note || "なし"}`
    ].join("\n");

    setSubmitting(true);
    try {
      const r = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: `【予約】${bk.name}様 (${bk.duration})`,
          description: det,
          start: slot,
          duration_minutes: durMap[bk.duration],
          name: bk.name,
          email: bk.email,
          tel: bk.tel,
          from: bk.from,
          to: bk.to,
          wheelchair: bk.wheelchair,
          passengers: bk.passengers,
          payment: bk.payment,
          note: bk.note,
          serviceType: bk.serviceType,
          careReq: bk.careReq,
          bookerType: bk.bookerType,
          bookerName: bk.bookerName,
          bookerTel: bk.bookerTelSame ? bk.tel : bk.bookerTel,
          bookerTelSame: bk.bookerTelSame,
          familyHospitalStaffName: bk.familyHospitalStaffName,
          careNotes: bk.careNotes,
          gcalTravelSummary: `【移動】${bk.name}様のお迎え準備`,
          gcalTravelStart: `${dateStr8} ${travelStartTime}`,
          gcalTravelEnd: `${dateStr8} ${travelEndTime}`
        })
      });
      if (r.ok) setStep("success");
      else alert("送信に失敗しました。");
    } catch {
      alert("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  };

  // --- 完了 ---
  if (step === "success") return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "36px 14px", textAlign: "center" }}>
      <div style={{ ...card, animation: "slideUp 0.4s ease-out" }}>
        <div style={{ fontSize: 50, marginBottom: 12 }}>✅</div>
        <h2 style={{ color: C.green, marginBottom: 8, fontSize: 18 }}>ご予約ありがとうございます</h2>
        <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.8, marginBottom: 6 }}>ご予約内容を受け付けました。</p>
        {bk.email && (
          <div style={{ background: C.blueBg, border: `1px solid ${C.blue}30`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: C.blue }}>
            📧 <strong>{bk.email}</strong> 宛に予約内容をお送りしました
          </div>
        )}
        <p style={{ color: C.textMid, fontSize: 12, lineHeight: 1.7, marginBottom: 20 }}>確認のご連絡を差し上げます。</p>
        <button onClick={() => { setStep("slots"); setWOff(0); }} style={bGreen}>カレンダーに戻る</button>
      </div>
    </div>
  );

  // --- 確認画面 ---
  if (step === "confirm") {
    const sD = slot ? new Date(slot) : null;
    const eD = sD ? new Date(sD.getTime() + durMap[bk.duration] * 60000) : null;
    const dateStr = sD ? sD.toLocaleString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }) : "";
    const endStr = eD ? `${eD.getHours()}:${eD.getMinutes().toString().padStart(2, "0")}` : "";
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 14px 40px", animation: "slideUp 0.35s ease-out" }}>
        <button onClick={() => setStep("form")} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10, padding: 0 }}>← 入力内容を修正する</button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ background: C.greenBg, color: C.green, fontWeight: 700, padding: "3px 8px", borderRadius: 10, fontSize: 10 }}>① 日時選択 ✓</span>
          <span style={{ color: C.border, fontSize: 11 }}>→</span>
          <span style={{ background: C.greenBg, color: C.green, fontWeight: 700, padding: "3px 8px", borderRadius: 10, fontSize: 10 }}>② 詳細入力 ✓</span>
          <span style={{ color: C.border, fontSize: 11 }}>→</span>
          <span style={{ background: C.orangeBg, color: C.orange, fontWeight: 700, padding: "3px 8px", borderRadius: 10, fontSize: 10 }}>③ 内容確認</span>
          <span style={{ color: C.border, fontSize: 11 }}>→</span>
          <span style={{ color: C.textLight, fontSize: 10 }}>④ 完了</span>
        </div>

        <div style={{ ...card, borderTop: `4px solid ${C.orange}` }}>
          <ST icon="📋" title="予約内容の確認" />
          <div style={{ fontSize: 12, color: C.textMid, marginBottom: 14, padding: "8px 10px", background: C.orangeBg, borderRadius: 8 }}>
            以下の内容でよろしいですか？送信前に必ずご確認ください。
          </div>

          <div style={{ background: C.greenBg, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.textLight, marginBottom: 2 }}>📅 日時</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.green }}>{dateStr}</div>
            <div style={{ fontSize: 12, color: C.textMid, marginTop: 2 }}>〜 {endStr}（{bk.duration}）</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, marginBottom: 4, paddingBottom: 4, borderBottom: `2px solid ${C.borderLight}` }}>👤 お客様情報</div>
            <ConfirmRow label="利用者氏名" value={bk.name} highlight />
            <ConfirmRow label="電話番号" value={bk.tel} />
            <ConfirmRow label="メールアドレス" value={bk.email || "未入力"} />
            <ConfirmRow label="予約者区分" value={bk.bookerType} />
            {bookerRequiresName && !isFujiKaigo && <ConfirmRow label="ご担当者のお名前" value={bk.bookerName} highlight />}
            {bookerRequiresName && <ConfirmRow label="ご担当者連絡先" value={bk.bookerTelSame ? bk.tel + "（利用者と同じ）" : bk.bookerTel} />}
            {isFujiKaigo && bk.familyHospitalStaffName && <ConfirmRow label="家族・病院担当者名" value={bk.familyHospitalStaffName} />}
            {bk.careNotes && <ConfirmRow label="ご利用上の留意事項" value={bk.careNotes} />}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, marginBottom: 4, paddingBottom: 4, borderBottom: `2px solid ${C.borderLight}` }}>📍 サービス・行程</div>
            <ConfirmRow label="サービス種別" value={bk.serviceType} />
            <ConfirmRow label="お迎え場所" value={bk.from} />
            <ConfirmRow label="目的地" value={bk.to || "未入力"} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, marginBottom: 4, paddingBottom: 4, borderBottom: `2px solid ${C.borderLight}` }}>♿ 介助・車椅子</div>
            <ConfirmRow label="介助の必要性" value={bk.careReq} />
            <ConfirmRow label="車椅子" value={bk.wheelchair} />
            <ConfirmRow label="乗車人数" value={bk.passengers} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, marginBottom: 4, paddingBottom: 4, borderBottom: `2px solid ${C.borderLight}` }}>💳 お支払い・備考</div>
            <ConfirmRow label="支払方法" value={bk.payment} />
            <ConfirmRow label="備考" value={bk.note || "なし"} />
          </div>

          {/* キャンセル案内 */}
          <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: C.textMid, lineHeight: 1.7 }}>
            📞 <strong>ご予約のキャンセルは電話にて承ります。</strong>
          </div>

          {bk.email ? (
            <div style={{ background: C.blueBg, border: `1px solid ${C.blue}40`, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: C.blue, fontWeight: 600, marginBottom: 2 }}>📧 予約確認メールについて</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>
                ご予約が完了しましたら、入力いただいたメールアドレス<br />
                <strong style={{ color: C.blue }}>{bk.email}</strong><br />
                宛に予約内容をお送りします。
              </div>
            </div>
          ) : (
            <div style={{ background: C.cream, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.7 }}>
                💡 メールアドレスを入力いただくと、予約内容をメールでお送りできます。<br />
                <button onClick={() => setStep("form")} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0, textDecoration: "underline" }}>← 戻って入力する</button>
              </div>
            </div>
          )}

          <button onClick={submit} disabled={submitting} style={{ ...bOrange, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "送信中..." : "✅ この内容で予約を確定する"}
          </button>
          <button onClick={() => setStep("form")} style={{ width: "100%", padding: 12, border: `1px solid ${C.border}`, borderRadius: 10, background: C.white, color: C.textMid, fontSize: 14, cursor: "pointer", marginTop: 8 }}>
            ← 入力内容を修正する
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // --- 予約フォーム ---
  if (step === "form") {
    const sD = slot ? new Date(slot) : null;
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 14px 40px" }}>
        <button onClick={() => setStep("slots")} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10, padding: 0 }}>← 空き状況に戻る</button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ background: C.greenBg, color: C.green, fontWeight: 700, padding: "3px 8px", borderRadius: 10, fontSize: 10 }}>① 日時選択 ✓</span>
          <span style={{ color: C.border, fontSize: 11 }}>→</span>
          <span style={{ background: C.orangeBg, color: C.orange, fontWeight: 700, padding: "3px 8px", borderRadius: 10, fontSize: 10 }}>② 詳細入力</span>
          <span style={{ color: C.border, fontSize: 11 }}>→</span>
          <span style={{ color: C.textLight, fontSize: 10 }}>③ 内容確認</span>
          <span style={{ color: C.border, fontSize: 11 }}>→</span>
          <span style={{ color: C.textLight, fontSize: 10 }}>④ 完了</span>
        </div>
        <div style={{ ...card, padding: "12px 16px", background: C.greenBg, borderLeft: `4px solid ${C.green}` }}>
          <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2 }}>選択した日時</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>📅 {sD ? sD.toLocaleString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }) : ""}</div>
        </div>
        <form onSubmit={goConfirm}>
          <div style={card}><ST icon="⏱" title="ご利用時間" /><FF label="ご利用予定時間" required><select value={bk.duration} onChange={e => ub("duration", e.target.value)} style={inp}>{Object.keys(durMap).map(d => <option key={d}>{d}</option>)}</select></FF></div>
          <div style={card}>
            <ST icon="👤" title="お客様情報" />
            <FF label="利用者のお名前" required error={errors.name}>
              <input type="text" placeholder="山田 太郎" value={bk.name} onChange={e => { ub("name", e.target.value); setErrors(p => ({ ...p, name: "" })); }} style={{ ...inp, borderColor: errors.name ? C.red : C.border }} />
            </FF>
            <FF label="電話番号" required error={errors.tel}>
              <input type="tel" placeholder="090-1234-5678" value={bk.tel} onChange={e => { ub("tel", e.target.value); setErrors(p => ({ ...p, tel: "" })); }} style={{ ...inp, borderColor: errors.tel ? C.red : C.border }} />
            </FF>
            <FF label="メールアドレス">
              <input type="email" placeholder="example@email.com（入力していただくと確認メールが届きます）" value={bk.email} onChange={e => ub("email", e.target.value)} style={inp} />
              {bk.email && (
                <div style={{ fontSize: 11, color: C.blue, marginTop: 4, padding: "6px 8px", background: C.blueBg, borderRadius: 6 }}>
                  📧 予約完了後に <strong>{bk.email}</strong> 宛へ予約内容をお送りします
                </div>
              )}
            </FF>
            {/* ご利用に際しての留意事項 */}
            <FF label="ご利用者様に関するご利用に際しての留意事項">
              <textarea
                placeholder="例：酸素ボンベ使用中、車椅子での乗降に時間がかかる、など"
                value={bk.careNotes}
                onChange={e => ub("careNotes", e.target.value)}
                style={{ ...inp, minHeight: 70, resize: "vertical" }}
              />
            </FF>
          </div>

          {/* 予約者情報 */}
          <div style={card}>
            <ST icon="🧑‍💼" title="予約者情報" />
            <FF label="予約者の区分" required>
              <RG
                options={[
                  { value: "本人", label: "本人" },
                  { value: "家族・代理人", label: "家族・代理人" },
                  { value: "ソーシャルワーカー", label: "ソーシャルワーカー" },
                  { value: "ケアマネジャー", label: "ケアマネジャー" },
                  { value: "施設担当者", label: "施設担当者" },
                  { value: "ふじ介護タクシー", label: "ふじ介護タクシー" },
                  { value: "その他（本人以外）", label: "その他（本人以外）" },
                ]}
                value={bk.bookerType}
                onChange={v => { ub("bookerType", v); setErrors(p => ({ ...p, bookerName: "" })); }}
              />
            </FF>
            {bookerRequiresName && (
              <>
                {!isFujiKaigo && (
                  <FF label="ご担当者のお名前" required error={errors.bookerName}>
                    <input
                      type="text"
                      placeholder="ご担当者のお名前を入力"
                      value={bk.bookerName}
                      onChange={e => { ub("bookerName", e.target.value); setErrors(p => ({ ...p, bookerName: "" })); }}
                      style={{ ...inp, borderColor: errors.bookerName ? C.red : C.border }}
                    />
                  </FF>
                )}
                <FF label="ご担当者連絡先">
                  <div style={{ marginBottom: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMid, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={bk.bookerTelSame}
                        onChange={e => ub("bookerTelSame", e.target.checked)}
                        style={{ width: 16, height: 16 }}
                      />
                      利用者と同じ電話番号
                    </label>
                  </div>
                  {!bk.bookerTelSame && (
                    <input
                      type="tel"
                      placeholder="ご担当者の電話番号"
                      value={bk.bookerTel}
                      onChange={e => ub("bookerTel", e.target.value)}
                      style={inp}
                    />
                  )}
                </FF>
                {isFujiKaigo && (
                  <FF label="家族・病院担当者名">
                    <input
                      type="text"
                      placeholder="家族または病院担当者のお名前"
                      value={bk.familyHospitalStaffName}
                      onChange={e => ub("familyHospitalStaffName", e.target.value)}
                      style={inp}
                    />
                  </FF>
                )}
              </>
            )}
          </div>

          <div style={card}>
            <ST icon="📍" title="サービス・行程" />
            <FF label="サービス種別" required><RG options={["介護タクシー", "買い物代行", "生活支援サービス", "安否確認・報告サービス", "その他"]} value={bk.serviceType} onChange={v => ub("serviceType", v)} /></FF>
            <FF label="お迎え・ご利用場所" required error={errors.from}><textarea placeholder="住所・施設名など" value={bk.from} onChange={e => { ub("from", e.target.value); setErrors(p => ({ ...p, from: "" })); }} style={{ ...inp, minHeight: 56, resize: "vertical", borderColor: errors.from ? C.red : C.border }} /></FF>
            <FF label="目的地"><textarea placeholder="住所・施設名など" value={bk.to} onChange={e => ub("to", e.target.value)} style={{ ...inp, minHeight: 56, resize: "vertical" }} /></FF>
          </div>
          <div style={card}>
            <ST icon="♿" title="介助・車椅子" />
            <FF label="介助の必要性" required><RG options={[{ value: "車の乗降介助程度", label: "車の乗降介助程度" }, { value: "身体介護等あり", label: "身体介護等あり（＋500円）" }]} value={bk.careReq} onChange={v => ub("careReq", v)} /></FF>
            <FF label="車椅子" required><RG options={[{ value: "利用なし", label: "利用なし" }, { value: "自分の車椅子を使用", label: "自分の車椅子を使用" }, { value: "普通型レンタル", label: "普通型をレンタル（日またぎ＋500円）" }, { value: "リクライニング型レンタル", label: "リクライニング型をレンタル（日またぎ＋700円）" }]} value={bk.wheelchair} onChange={v => ub("wheelchair", v)} /></FF>
            <FF label="乗車人数"><select value={bk.passengers} onChange={e => ub("passengers", e.target.value)} style={inp}>{["1名", "2名（付き添い1名）", "3名（付き添い2名）"].map(p => <option key={p}>{p}</option>)}</select></FF>
          </div>
          <div style={card}>
            <ST icon="💳" title="お支払い・備考" />
            <FF label="お支払い方法" required><RG options={["現金", "銀行振込", "請求書払い（法人）"]} value={bk.payment} onChange={v => ub("payment", v)} /></FF>
            <FF label="備考・ご要望"><textarea placeholder="何かあればご記入ください" value={bk.note} onChange={e => ub("note", e.target.value)} style={{ ...inp, minHeight: 70, resize: "vertical" }} /></FF>
          </div>

          {/* キャンセル案内 */}
          <div style={{ ...card, background: C.cream, borderLeft: `4px solid ${C.orange}`, padding: "12px 14px" }}>
            <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7 }}>
              📞 <strong>ご予約のキャンセルは電話にて承ります。</strong>
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <div style={{ ...card, background: C.redBg, borderColor: C.red + "40", borderLeft: `4px solid ${C.red}`, padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 4 }}>⚠ 入力内容をご確認ください</div>
              {Object.values(errors).map((e, i) => <div key={i} style={{ fontSize: 12, color: C.red }}>・{e}</div>)}
            </div>
          )}

          <div style={{ marginBottom: 14 }}><PriceLink /></div>
          <button type="submit" style={bOrange}>内容を確認する →</button>
        </form>
        <Footer />
      </div>
    );
  }

  // --- カレンダー ---
  const now = new Date();
  const yearMonth = `${wd[0].getFullYear()}年${wd[0].getMonth() + 1}月`;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 0 30px", overflow: "hidden" }}>
      <div style={{ padding: "8px 12px 0" }}>
        <div style={{ background: C.orangeBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.orange, marginBottom: 4 }}>📱 電話不要！3分でかんたん予約</div>
          <div style={{ fontSize: 15, color: C.textMid, lineHeight: 1.7 }}>
            ① 空いている「<span style={{ color: "#e0004e", fontWeight: 700 }}>{"○"}</span>」をタップ<br />
            ② お名前・行き先・介助内容などを入力<br />
            ③ 内容確認 → 予約完了！
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px 0" }}>
        <button onClick={() => setWOff(p => Math.max(0, p - 1))} disabled={wOff <= 0}
          style={{ padding: "7px 14px", border: `1px solid ${wOff <= 0 ? "#ddd" : "#ccc"}`, borderRadius: 6, background: C.white, color: wOff <= 0 ? "#bbb" : C.text, fontSize: 12, fontWeight: 600, cursor: wOff <= 0 ? "default" : "pointer" }}>
          ＜ 前の一週間
        </button>
        <button onClick={() => setWOff(p => p + 1)}
          style={{ padding: "7px 14px", border: "1px solid #ccc", borderRadius: 6, background: C.white, color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          次の一週間 ＞
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: C.textLight }}>読み込み中...</div>
      ) : (
        <div style={{ padding: "6px 6px 0", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 360, tableLayout: "fixed", fontSize: 11 }}>
            <colgroup>
              <col style={{ width: 42 }} />
              {wd.map((_, i) => <col key={i} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{ border: "1px solid #e0e0e0", background: "#fafafa", padding: 0 }} />
                <th colSpan={7} style={{ border: "1px solid #e0e0e0", background: "#fafafa", padding: "4px 0", fontSize: 11, fontWeight: 700, color: C.text }}>{yearMonth}</th>
              </tr>
              <tr>
                <th style={{ border: "1px solid #e0e0e0", background: "#f5f5f5", padding: "6px 2px", fontSize: 10, color: C.textMid, fontWeight: 600 }}>日時</th>
                {wd.map((d, i) => {
                  const dow = d.getDay();
                  const isSun = dow === 0, isSat = dow === 6;
                  return (
                    <th key={i} style={{ border: "1px solid #e0e0e0", background: isSun ? C.pinkLight : isSat ? "#e3f2fd" : "#fafafa", padding: "4px 0", textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isSun ? C.pink : isSat ? "#1a6bcc" : C.text }}>{d.getDate()}</div>
                      <div style={{ fontSize: 9, color: isSun ? C.pink : isSat ? "#1a6bcc" : C.text, fontWeight: 600 }}>({dn[dow]})</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ts.map((t, idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #e0e0e0", background: "#fafafa", padding: "5px 2px", fontWeight: 700, fontSize: 11, color: C.text, textAlign: "center" }}>
                    {t.h}:{t.m.toString().padStart(2, "0")}
                  </td>
                  {wd.map((d, i) => {
                    const sd = new Date(d); sd.setHours(t.h, t.m, 0, 0);
                    const isPast = sd < now;
                    const sMs = sd.getTime(), eMs = sMs + 1800000;
                    const isBusy = busy.some(b => sMs < new Date(b.end).getTime() && eMs > new Date(b.start).getTime());
                    const dow = d.getDay();
                    const baseBg = dow === 0 ? "#fff8fa" : dow === 6 ? "#f8fbff" : C.white;
                    if (isPast || isBusy) {
                      return <td key={i} style={{ border: "1px solid #e0e0e0", background: isPast ? "#f5f5f5" : baseBg, textAlign: "center", padding: "4px 0", color: "#ccc", fontSize: 12 }}>×</td>;
                    }
                    return (
                      <td key={i} style={{ border: "1px solid #e0e0e0", background: baseBg, padding: 0, textAlign: "center" }}>
                        <button onClick={() => { setSlot(sd.toISOString()); setStep("form"); }}
                          style={{ background: "transparent", border: "none", width: "100%", padding: "4px 0", cursor: "pointer", fontSize: 18, fontWeight: 900, color: "#e0004e", textShadow: "0 0 1px #e0004e" }}>
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

      <div style={{ padding: "8px 12px 0" }}>
        <div style={{ fontSize: 10, color: C.textLight, marginBottom: 8, textAlign: "center" }}>
          <span style={{ color: C.pink, fontWeight: 700 }}>○</span> 予約可（タップで入力へ）　<span style={{ color: "#ccc" }}>×</span> 予約不可　※横スクロール可
        </div>
        <PriceLink />
        <Link to="/" style={{ color: C.green, fontWeight: 700, fontSize: 12, textDecoration: "none", display: "block", textAlign: "center", padding: 8, marginTop: 4 }}>← メニューへ戻る</Link>
      </div>
      <Footer />
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
