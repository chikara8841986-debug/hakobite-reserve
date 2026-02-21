import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

// ============================================================
// 運賃設定
// ============================================================
const FARE = {
  baseFare: 750, meterFare: 80, meterDistance: 0.250,
  welfareFee: 1000, careFee: 500, nightSurcharge: 1.2,
  wheelchair: { normal: 500, reclining: 700 }
};

function calculateFare(distKm, opts = {}) {
  if (distKm <= 0) return null;
  const { isNight = false, needsCare = false, wheelchairType = "none" } = opts;
  let meterFare = FARE.baseFare;
  meterFare += Math.ceil(distKm / FARE.meterDistance) * FARE.meterFare;
  if (isNight) meterFare = Math.ceil(meterFare * FARE.nightSurcharge / 10) * 10;
  const welfareFee = FARE.welfareFee;
  const careFee = needsCare ? FARE.careFee : 0;
  let wheelchairFee = 0;
  if (wheelchairType === "normal") wheelchairFee = FARE.wheelchair.normal;
  if (wheelchairType === "reclining") wheelchairFee = FARE.wheelchair.reclining;
  return { meterFare, welfareFee, careFee, wheelchairFee, total: meterFare + welfareFee + careFee + wheelchairFee };
}
const fmt = n => n.toLocaleString();

// ============================================================
// カラー・共通
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
    html, body { overflow-x: hidden; }
    body { background: linear-gradient(180deg, ${C.cream} 0%, #f5f0e8 100%); color: ${C.text};
      font-family: 'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif;
      -webkit-text-size-adjust: 100%; }
    input, select, textarea, button { font-family: inherit; font-size: 16px; } /* スマホのズーム防止に16px */
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    input::placeholder, textarea::placeholder { color: #b5a99a; }
    
    /* モバイル向け調整 */
    @media (max-width: 480px) {
      .card-padding { padding: 16px 14px !important; }
      .text-title { font-size: 17px !important; }
      .text-small { font-size: 12px !important; }
    }
  `}</style>
);

const inputStyle = {
  width: "100%", padding: "12px 14px", background: C.cream,
  border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
  fontSize: "16px", outline: "none", boxSizing: "border-box", appearance: "none"
};
const cardStyle = {
  background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
  padding: "24px 20px", marginBottom: 16, width: "100%",
  boxShadow: "0 2px 8px rgba(107,94,79,0.06)", boxSizing: "border-box"
};
const btnGreen = {
  width: "100%", padding: 15, border: "none", borderRadius: 10,
  background: `linear-gradient(135deg, ${C.green}, ${C.greenLight})`,
  color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
  boxShadow: "0 4px 16px rgba(91,140,62,0.3)"
};
const btnOrange = {
  ...btnGreen,
  background: `linear-gradient(135deg, ${C.orange}, #f5a623)`,
  boxShadow: "0 4px 16px rgba(232,134,52,0.3)"
};

// ============================================================
// 共通パーツ
// ============================================================
function Header() {
  return (
    <header style={{
      background: `linear-gradient(135deg, ${C.green}, ${C.greenLight})`,
      padding: "18px 16px", textAlign: "center", position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", letterSpacing: "0.12em", marginBottom: 3 }}>♿ 福祉タクシー</div>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: "0.06em" }}>ハコビテ　総合システム</h1>
      </div>
    </header>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 24, height: 24, borderRadius: 6, background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{icon}</span>
      {title}
    </div>
  );
}

function FormField({ label, required: req, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.textMid, marginBottom: 5 }}>
        {label}{req && <span style={{ color: C.orange, marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({ active, onToggle, icon, label, sub, color, activeBg }) {
  return (
    <div onClick={onToggle} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 14px", marginBottom: 8,
      background: active ? activeBg : C.cream,
      border: `1px solid ${active ? color + "50" : C.borderLight}`,
      borderRadius: 8, cursor: "pointer", userSelect: "none"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
          <div style={{ fontSize: 11, color: C.textLight }}>{sub}</div>
        </div>
      </div>
      <div style={{
        width: 42, height: 24, borderRadius: 12,
        background: active ? color : "#d1cbc2",
        position: "relative", transition: "background 0.3s", flexShrink: 0
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: "50%", background: "#fff",
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
      padding: "9px 12px", marginBottom: 5,
      background: bg, borderRadius: 8, borderLeft: `3px solid ${color}`
    }}>
      <div style={{ flex: 1, paddingRight: 8 }}>
        <div style={{ fontSize: 13, color: C.text }}>{label}</div>
        {note && <div style={{ fontSize: 10, color: C.textLight }}>({note})</div>}
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, color, whiteSpace: "nowrap" }}>¥{fmt(value)}</span>
    </div>
  );
}

function PageFooter() {
  return (
    <div style={{ marginTop: 28, textAlign: "center", fontSize: 12, color: C.textMid, lineHeight: 2, paddingBottom: 20 }}>
      <div>香川県内限定サービス ・ 迎車料金は含まれません</div>
      <div style={{ fontSize: 11, color: C.textLight }}>ハコビテ — 移動と暮らしを、支える</div>
    </div>
  );
}

// ============================================================
// 1. トップメニュー
// ============================================================
function Home() {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 16px", textAlign: "center", boxSizing: "border-box" }}>
      <h2 className="text-title" style={{ color: C.green, marginBottom: 8, fontSize: 20 }}>🚕 ようこそ</h2>
      <p style={{ color: C.textMid, fontSize: 13, marginBottom: 28 }}>ご利用になるサービスをお選びください</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Link to="/price" style={{ textDecoration: "none" }}>
          <div className="card-padding" style={{
            ...cardStyle, marginBottom: 0, padding: "22px 20px",
            display: "flex", alignItems: "center", gap: 16, cursor: "pointer",
            borderLeft: `4px solid ${C.green}`
          }}>
            <span style={{ fontSize: 32 }}>🧮</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>料金を試算する</div>
              <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>距離とオプションから概算料金を計算</div>
            </div>
          </div>
        </Link>
        <Link to="/reserve" style={{ textDecoration: "none" }}>
          <div className="card-padding" style={{
            ...cardStyle, marginBottom: 0, padding: "22px 20px",
            display: "flex", alignItems: "center", gap: 16, cursor: "pointer",
            borderLeft: `4px solid ${C.orange}`,
            background: `linear-gradient(135deg, ${C.orangeBg}, #fff8f0)`
          }}>
            <span style={{ fontSize: 32 }}>📅</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.orange }}>今すぐ予約する</div>
              <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>空き状況を確認してそのまま予約</div>
            </div>
          </div>
        </Link>
      </div>
      <PageFooter />
    </div>
  );
}

// ============================================================
// 2. 料金試算（フル版）
// ============================================================
function PriceCalculator() {
  const [tripKm, setTripKm] = useState("");
  const [needsCare, setNeedsCare] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [wheelchairType, setWheelchairType] = useState("none");
  const [fareResult, setFareResult] = useState(null);

  const handleCalc = () => {
    const dist = parseFloat(tripKm);
    if (!dist || dist <= 0) return;
    setFareResult(calculateFare(dist, { isNight, needsCare, wheelchairType }));
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 16px 48px", boxSizing: "border-box" }}>
      <Link to="/" style={{ color: C.green, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← メニューへ戻る</Link>

      <div className="card-padding" style={{
        ...cardStyle, marginTop: 12, padding: "16px 20px",
        background: C.orangeBg, borderLeft: `4px solid ${C.orange}`
      }}>
        <div style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>
          ⚠ 料金はあくまで概算です。実際の料金は走行ルート・交通状況により変動します。
        </div>
      </div>

      <div className="card-padding" style={cardStyle}>
        <SectionTitle icon="🧮" title="料金試算" />

        <FormField label="走行距離（km）" required>
          <input type="number" step="0.1" min="0" inputMode="decimal"
            placeholder="例: 5.2" value={tripKm}
            onChange={e => setTripKm(e.target.value)} style={inputStyle} />
        </FormField>

        <ToggleRow active={needsCare} onToggle={() => setNeedsCare(!needsCare)}
          icon="🤝" label="身体介護等あり" sub="＋500円"
          color={C.orange} activeBg={C.orangeBg} />

        <ToggleRow active={isNight} onToggle={() => setIsNight(!isNight)}
          icon="🌙" label="深夜割増（22:00〜5:00）" sub="メーター2割増"
          color={C.purple} activeBg={C.purpleBg} />

        <div style={{ fontSize: 13, fontWeight: 600, color: C.textMid, margin: "14px 0 8px" }}>
          🦽 車椅子レンタル（日をまたぐ場合）
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
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
                borderRadius: 8, cursor: "pointer", textAlign: "center"
              }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: wheelchairType === opt.value ? C.green : C.textMid }}>{opt.label}</div>
              {opt.sub && <div style={{ fontSize: 9, color: C.textLight, marginTop: 2 }}>{opt.sub}</div>}
            </button>
          ))}
        </div>

        <button type="button" onClick={handleCalc} style={btnGreen}>🚕 料金を計算する</button>

        {fareResult && (
          <div style={{ marginTop: 16, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, animation: "fadeIn 0.3s ease-out" }}>
            <div style={{ padding: "20px 16px", textAlign: "center", background: `linear-gradient(135deg, ${C.greenBg}, #f0f7e8)`, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.textLight, letterSpacing: "0.1em", marginBottom: 4 }}>推定合計料金（片道）</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.green, lineHeight: 1.1 }}>¥{fmt(fareResult.total)}</div>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, marginBottom: 8 }}>📋 内訳</div>
              <BreakdownRow label={`メーター運賃（${parseFloat(tripKm).toFixed(1)}km）`} value={fareResult.meterFare} bg={C.greenBg} color={C.green} note={isNight ? "深夜割増込" : ""} />
              <BreakdownRow label="福祉車両代" value={fareResult.welfareFee} bg={C.orangeBg} color={C.orange} />
              {fareResult.careFee > 0 && <BreakdownRow label="身体介護等料" value={fareResult.careFee} bg={C.redBg} color={C.red} />}
              {fareResult.wheelchairFee > 0 && <BreakdownRow label={`車椅子レンタル（${wheelchairType === "reclining" ? "リクライニング" : "普通型"}）`} value={fareResult.wheelchairFee} bg={C.purpleBg} color={C.purple} note="日またぎ" />}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", marginTop: 8, borderTop: `2px solid ${C.border}` }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>合計</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: C.green }}>¥{fmt(fareResult.total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

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
    careReq: "乗降介助程度（＋0円）", passengers: "1名",
    isSamePerson: "はい", payment: "現金", note: ""
  });

  const durationMap = { "30分": 30, "1時間": 60, "1時間30分": 90, "2時間": 120, "2時間30分": 150, "3時間": 180, "4時間": 240, "5時間": 300 };
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  const baseDate = new Date();
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
    fetch("/api/slots")
      .then(r => r.ok ? r.json() : [])
      .then(d => setBusySlots(d || []))
      .catch(() => setBusySlots([]))
      .finally(() => setLoading(false));
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
    if (conflict) { alert(`選択された時間帯は既に予約があります。`); return; }

    try {
      const res = await fetch("/api/reserve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: `【予約】${booking.name}様 (${booking.duration}) - ${booking.serviceType}`,
          description: `サービス: ${booking.serviceType}\n介助: ${booking.careReq}\n場所: ${booking.from}→${booking.to}\n備考: ${booking.note}`, 
          start: selectedSlot,
          duration_minutes: durationMap[booking.duration],
          name: booking.name, email: booking.email
        })
      });
      if (res.ok) setStep("success"); else alert("送信に失敗しました。");
    } catch { alert("通信エラーが発生しました。"); }
  };

  if (step === "success") return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 16px", textAlign: "center" }}>
      <div style={cardStyle} className="card-padding">
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h2 style={{ color: C.green, marginBottom: 8 }}>ご予約ありがとうございます</h2>
        <p style={{ color: C.textMid, fontSize: 14, marginBottom: 20 }}>内容を確認し、折り返しご連絡を差し上げます。</p>
        <button onClick={() => { setStep("slots"); setWeekOffset(0); }} style={btnGreen}>カレンダーに戻る</button>
      </div>
    </div>
  );

  if (step === "form") {
    const slotD = selectedSlot ? new Date(selectedSlot) : null;
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 16px 48px", boxSizing: "border-box" }}>
        <button onClick={() => setStep("slots")} style={{
          background: "none", border: "none", color: C.green,
          fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 12, padding: 0
        }}>← 空き状況に戻る</button>

        <div className="card-padding" style={{ ...cardStyle, padding: "14px 20px", background: C.greenBg, borderLeft: `4px solid ${C.green}` }}>
          <div style={{ fontSize: 11, color: C.textLight, marginBottom: 3 }}>選択した日時</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>
            📅 {slotD ? slotD.toLocaleString("ja-JP", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }) : ""}
          </div>
        </div>

        <form onSubmit={handleReserve}>
          <div className="card-padding" style={cardStyle}>
            <SectionTitle icon="⏱" title="詳細設定" />
            <FormField label="ご利用時間" required>
              <select value={booking.duration} onChange={e => updateBooking("duration", e.target.value)} style={inputStyle}>
                {Object.keys(durationMap).map(d => <option key={d}>{d}</option>)}
              </select>
            </FormField>
            <FormField label="サービス種別" required>
              <select value={booking.serviceType} onChange={e => updateBooking("serviceType", e.target.value)} style={inputStyle}>
                {["介護タクシー", "買い物代行・付き添い", "お手伝い支援", "安否確認サービス"].map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
          </div>

          <div className="card-padding" style={cardStyle}>
            <SectionTitle icon="👤" title="お客様情報" />
            <FormField label="お名前" required>
              <input type="text" required placeholder="例: 山田 太郎" value={booking.name} onChange={e => updateBooking("name", e.target.value)} style={inputStyle} />
            </FormField>
            <FormField label="電話番号" required>
              <input type="tel" required placeholder="090-1234-5678" value={booking.tel} onChange={e => updateBooking("tel", e.target.value)} style={inputStyle} />
            </FormField>
          </div>

          <div className="card-padding" style={cardStyle}>
            <SectionTitle icon="📍" title="行程" />
            <FormField label="お迎え場所" required>
              <textarea required placeholder="住所や施設名" value={booking.from} onChange={e => updateBooking("from", e.target.value)} style={{ ...inputStyle, minHeight: 60 }} />
            </FormField>
            <FormField label="目的地">
              <textarea placeholder="行き先（決まっていれば）" value={booking.to} onChange={e => updateBooking("to", e.target.value)} style={{ ...inputStyle, minHeight: 60 }} />
            </FormField>
          </div>

          <div className="card-padding" style={cardStyle}>
            <SectionTitle icon="♿" title="介助・車椅子" />
            <FormField label="介助の内容" required>
              <select value={booking.careReq} onChange={e => updateBooking("careReq", e.target.value)} style={inputStyle}>
                {["乗降介助程度（＋0円）", "身体介護等あり（＋500円）"].map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="車椅子の利用">
              <select value={booking.wheelchair} onChange={e => updateBooking("wheelchair", e.target.value)} style={inputStyle}>
                {["利用なし", "自分の車椅子を使用", "普通型レンタル", "リクライニング型レンタル"].map(w => <option key={w}>{w}</option>)}
              </select>
            </FormField>
            <FormField label="備考">
              <textarea placeholder="特記事項があればご記入ください" value={booking.note} onChange={e => updateBooking("note", e.target.value)} style={{ ...inputStyle, minHeight: 80 }} />
            </FormField>
          </div>

          <button type="submit" style={btnOrange}>📩 この内容で予約する</button>
        </form>

        <PageFooter />
      </div>
    );
  }

  const now = new Date();

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 12px 48px", boxSizing: "border-box" }}>
      <Link to="/" style={{ color: C.green, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← メニューへ戻る</Link>
      <h2 style={{ textAlign: "center", color: C.green, margin: "16px 0", fontSize: 19 }}>📅 予約カレンダー</h2>

      {/* 案内 */}
      <div className="card-padding" style={{ ...cardStyle, padding: "12px", background: C.orangeBg, borderLeft: `4px solid ${C.orange}` }}>
        <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.6 }}>
          「<span style={{ color: "#e0004e", fontWeight: 700 }}>○</span>」をタップして予約を進めてください。<br />
          <span style={{ fontSize: 11, color: C.textLight }}>※ 表は左右にスクロールして確認できます</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0" }}>
        <button onClick={() => setWeekOffset(p => p - 1)} disabled={weekOffset <= 0} style={{ padding: "8px 12px", border: "none", borderRadius: 6, background: weekOffset <= 0 ? "#ddd" : C.green, color: "#fff", fontSize: 13 }}>前の週</button>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{weekDays[0].getMonth()+1}/{weekDays[0].getDate()}～</div>
        <button onClick={() => setWeekOffset(p => p + 1)} style={{ padding: "8px 12px", border: "none", borderRadius: 6, background: C.green, color: "#fff", fontSize: 13 }}>次の週</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>読み込み中...</div>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", border: `1px solid ${C.border}`, borderRadius: 10, background: "#fff" }}>
          <table style={{ borderCollapse: "collapse", minWidth: 540, width: "100%" }}>
            <thead>
              <tr>
                <th style={{ background: C.green, color: "#fff", padding: "10px 4px", fontSize: 12, position: "sticky", left: 0, zIndex: 10 }}>時間</th>
                {weekDays.map((d, i) => (
                  <th key={i} style={{ background: C.greenBg, color: d.getDay() === 0 ? C.red : d.getDay() === 6 ? "#1a6bcc" : C.green, padding: "8px 4px", fontSize: 12, border: `1px solid ${C.border}` }}>
                    {d.getDate()}({dayNames[d.getDay()]})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, idx) => (
                <tr key={idx}>
                  <td style={{ position: "sticky", left: 0, background: "#f9f9f7", padding: "8px 4px", fontSize: 12, textAlign: "center", border: `1px solid ${C.border}`, fontWeight: 600 }}>
                    {time.hour}:{time.minute.toString().padStart(2, "0")}
                  </td>
                  {weekDays.map((d, i) => {
                    const slotDate = new Date(d);
                    slotDate.setHours(time.hour, time.minute, 0, 0);
                    const isPast = slotDate < now;
                    const slotStartMs = slotDate.getTime();
                    const slotEndMs = slotStartMs + 30 * 60 * 1000;
                    const isBusy = busySlots.some(b => {
                      const bS = new Date(b.start).getTime(), bE = new Date(b.end).getTime();
                      return slotStartMs < bE && slotEndMs > bS;
                    });
                    return (
                      <td key={i} style={{ border: `1px solid ${C.border}`, textAlign: "center", padding: 0 }}>
                        {isPast || isBusy ? (
                          <span style={{ color: "#bbb", fontSize: 14 }}>×</span>
                        ) : (
                          <button onClick={() => { setSelectedSlot(slotDate.toISOString()); setStep("form"); }}
                            style={{ background: "#fff5f8", color: "#e0004e", border: "none", width: "100%", padding: "10px 0", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>○</button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
