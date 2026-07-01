import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sprout, Droplets, Sun, Recycle, Leaf,
  TrendingUp, Shield, Heart, Zap,
  CheckSquare, Share2,
} from 'lucide-react';
import { apiRequest } from '../lib/utils';
import { parseReportSections } from '../utils/reportParser';

// ── Design tokens (dark "Forest Void" theme) ─────────────────────────────────
const T = {
  bg:       '#0d1710',
  card:     '#111e15',
  card2:    '#142a1c',
  primary:  '#4ade80',
  water:    '#38bdf8',
  solar:    '#fbbf24',
  biogas:   '#2dd4bf',
  heading:  '#f4fbf5',
  body:     '#d7e8dd',
  muted:    '#93b6a2',
  faint:    '#6f8c7b',
  border:   '#1e3024',
  borderSt: '#2a4733',
};

const TIER_COLOR = {
  'Explorer':               '#f87171',
  'Getting Ready':          '#fbbf24',
  'Action Ready':           '#4ade80',
  'Sustainability Champion':'#2dd4bf',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtINR = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const fmtNum = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const stripMd = s => (s || '').replace(/\*{1,3}/g, '').trim();

function safeFmt(val, suffix = '') {
  return (val !== null && val !== undefined && !isNaN(Number(val)) && Number(val) > 0)
    ? `${Number(val).toLocaleString('en-IN')}${suffix}`
    : '—';
}

// ── DS Components (ported from Sus10 Design System) ──────────────────────────

function ScoreRing({ score = 0, max = 100, size = 160, stroke = 12, color = T.primary, label = 'Preparedness' }) {
  const [shown, setShown] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(score); return; }
    const steps = 30;
    let i = 0;
    const timers = [];
    const tick = () => {
      i++;
      setShown(Math.min(score, Math.round((score / steps) * i)));
      if (i < steps) timers.push(setTimeout(tick, 25));
    };
    timers.push(setTimeout(tick, 80));
    timers.push(setTimeout(() => setShown(score), steps * 25 + 300));
    return () => timers.forEach(clearTimeout);
  }, [score]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, shown / max));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${label}: ${score} of ${max}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: size * 0.27, fill: T.heading }}>
        {shown}
      </text>
      <text x="50%" y="64%" textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: size * 0.065, letterSpacing: '0.14em', fill: T.muted }}>
        {label.toUpperCase()}
      </text>
    </svg>
  );
}

function MeterBar({ label, score = 0, max = 100, color = T.primary, valueLabel = null }) {
  const [w, setW] = useState(0);
  const mounted = useRef(false);
  const target = Math.max(0, Math.min(100, (score / max) * 100));

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setW(target); return; }
    const steps = 24;
    let i = 0;
    const timers = [];
    const tick = () => {
      i++;
      setW(Math.min(target, (target / steps) * i));
      if (i < steps) timers.push(setTimeout(tick, 28));
    };
    timers.push(setTimeout(tick, 120));
    timers.push(setTimeout(() => setW(target), steps * 28 + 300));
    return () => timers.forEach(clearTimeout);
  }, [target]);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '7px', gap: '12px' }}>
        <span style={{ fontSize: '14px', color: T.body, fontFamily: "'Manrope', sans-serif" }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '12px', color, whiteSpace: 'nowrap' }}>
          {valueLabel != null ? valueLabel : `${score} / ${max}`}
        </span>
      </div>
      <div style={{ height: '8px', borderRadius: '4px', background: T.border, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '4px', background: color, width: `${w}%`, transition: 'width 0.1s linear' }} />
      </div>
    </div>
  );
}

function SectionLabel({ number, children, accent = T.primary }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '36px 0 20px' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
        fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase',
        color: accent, whiteSpace: 'nowrap',
      }}>
        {number != null && (
          <span style={{ opacity: 0.6, fontWeight: 700 }}>{String(number).padStart(2, '0')}</span>
        )}
        {number != null && <span aria-hidden>•</span>}
        {children}
      </span>
      <div style={{ flex: 1, height: '1px', background: T.border }} />
    </div>
  );
}

function StatFlow({ label, value, unit = null, hint = null, icon: Icon, accent = T.primary, divider = true }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 0',
      borderBottom: divider ? `1px solid ${T.border}` : 'none',
    }}>
      {Icon && (
        <div style={{
          width: '42px', height: '42px', flexShrink: 0, borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${accent}22`, color: accent,
        }}>
          <Icon size={20} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: T.muted, marginBottom: '2px',
        }}>{label}</span>
        {hint && <span style={{ fontSize: '13px', color: T.body, lineHeight: 1.5, marginTop: '2px' }}>{hint}</span>}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums',
          fontWeight: 700, fontSize: '22px', lineHeight: 1, color: accent,
        }}>{value}</span>
        {unit && (
          <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500, fontSize: '11px', color: T.muted, marginTop: '4px', textAlign: 'right' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Loading / Error states ────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <Leaf size={32} color={T.primary} />
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted }}>
        Loading your report…
      </div>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
      <div style={{ fontSize: '18px', color: '#f87171', fontFamily: "'Manrope', sans-serif" }}>Unable to load report</div>
      <div style={{ fontSize: '14px', color: T.muted, fontFamily: "'Manrope', sans-serif", textAlign: 'center' }}>{error || 'Report not found'}</div>
      <a href="/" style={{ padding: '10px 24px', background: T.primary, color: '#0a1a0e', borderRadius: '100px', fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
        Go Home
      </a>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportPage() {
  const { assessmentId } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    if (!assessmentId) return;
    apiRequest('/report/' + assessmentId)
      .then(d  => setAssessment(d))
      .catch(e => setError(e.detail || e.message || 'Report not found'))
      .finally(() => setLoading(false));
  }, [assessmentId]);

  if (loading) return <LoadingState />;
  if (error || !assessment) return <ErrorState error={error} />;

  // ── Unpack data ─────────────────────────────────────────────────────────────
  const answers  = assessment.answers           || {};
  const scores   = assessment.scores            || {};
  const flags    = assessment.conditional_flags || {};
  const tier     = assessment.readiness_tier    || 'Explorer';
  const tierColor = TIER_COLOR[tier] || T.primary;
  const reportText = assessment.report_text     || '';
  const sp       = assessment.sustenance_potential || {};
  const showBiogas = assessment.show_biogas || !!sp?.biogas;

  const firstName   = answers.first_name || 'You';
  const email       = answers.email      || '';
  const city        = answers.city       || '';
  const displayCity = city ? city.charAt(0).toUpperCase() + city.slice(1) : '';
  const terraceArea = answers.terrace_area_sqft || 1000;
  const buildingType = answers.Q1 || 'Independent House';
  const overallScore = scores.overall != null ? scores.overall : 0;

  // ── Derived numbers ─────────────────────────────────────────────────────────
  const solarSaving  = sp?.solar?.annual_savings_inr    || 0;
  const rwSaving     = sp?.rainwater?.annual_savings_inr || 0;
  const biogasSaving = sp?.biogas?.annual_savings_inr   || 0;
  const totalSavLow  = Math.round((sp?.solar?.savings_low_inr  || Math.round(solarSaving * 0.85)) + rwSaving + biogasSaving);
  const totalSavHigh = Math.round((sp?.solar?.savings_high_inr || solarSaving) + rwSaving + biogasSaving);
  const co2Total     = Math.round(
    (sp?.plantation?.co2_sequestration_kg_per_year || 0) +
    (sp?.solar?.co2_offset_kg_per_year             || 0)
  );
  const treesEq = co2Total > 0 ? Math.round(co2Total / 21) : null;

  const solarKwh     = sp?.solar?.kwh_per_year           || 0;
  const solarSavings = sp?.solar?.annual_savings_inr     || 0;
  const solarCO2     = sp?.solar?.co2_offset_kg_per_year || 0;
  const solarKwp     = sp?.solar?.installed_capacity_kwp || (solarKwh ? parseFloat((solarKwh / 1400).toFixed(1)) : null);
  const solarSavLow  = Math.round(solarSavings * 0.85);

  const rainLitres = sp?.rainwater?.annual_yield_liters || Math.round((sp?.rainwater?.kl_per_year || 0) * 1000);
  const rainSavings = sp?.rainwater?.annual_savings_inr || 0;

  const plantCount        = sp?.plantation?.plant_count                   || 0;
  const plantFood         = sp?.plantation?.food_yield_kg_per_year        || 0;
  const plantCO2          = sp?.plantation?.co2_sequestration_kg_per_year || 0;
  const plantableAreaSqft = terraceArea ? Math.round(terraceArea * 0.49) : null;

  const biogasM3         = sp?.biogas?.m3_per_year          || 0;
  const biogasCylinders  = sp?.biogas?.lpg_cylinders_per_year || 0;
  const biogasSavingsVal = sp?.biogas?.annual_savings_inr   || 0;

  // ── Parsed report text ───────────────────────────────────────────────────────
  const parsed        = parseReportSections(reportText);
  const strengthItems = parsed?.strengths       || [];
  const recItems      = parsed?.recommendations || [];
  const roadmapPhases = parsed?.roadmap || {
    phase1: { title: 'Foundation', body: '' },
    phase2: { title: 'Install',    body: '' },
    phase3: { title: 'Optimise',   body: '' },
  };

  const extractPhaseItems = (body, max = 5) => {
    if (!body) return [];
    return body.split('\n').map(l => l.trim())
      .filter(l => l.startsWith('- ') || l.startsWith('* ') || l.startsWith('• ') || /^\d+\.\s/.test(l))
      .map(l => l.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').trim())
      .filter(l => l.length > 3).slice(0, max);
  };

  const faText        = parsed?.finalAssessment || '';
  const faOppMatch    = faText.match(/[Bb]iggest [Oo]pportunity[:\s]+([^.]+\.)/);
  const faActionMatch = faText.match(/[Oo]ne [Aa]ction[^:]*[:\s]+([^.]+\.)/);
  const faTriptych = [
    { label: 'READINESS',            text: `${tier} (${overallScore}/100)` },
    { label: 'BIGGEST OPPORTUNITY',  text: faOppMatch ? faOppMatch[1].trim() : 'Your rooftop has strong potential across all sustainability pillars.' },
    { label: 'ONE ACTION THIS MONTH', text: faActionMatch ? faActionMatch[1].trim() : 'Start with a free rooftop assessment to confirm the estimates above.' },
  ];

  const ctaText = flags.R09 ? 'Talk to your RWA or building owner'
    : tier === 'Explorer'              ? 'Join our free awareness session'
    : tier === 'Getting Ready'         ? 'Get a free feasibility estimate'
    : tier === 'Sustainability Champion' ? 'Join the Sus10 pilot programme'
    : 'Connect for a free 1:1 Consultation';
  const ctaHref = `mailto:gp@sus10.ai?subject=${encodeURIComponent('Sus10 Enquiry — ' + firstName + ', ' + tier)}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Sus10 Rooftop Report', url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href).catch(() => {});
    }
  };

  // ── Shared card style ────────────────────────────────────────────────────────
  const card = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: '16px',
    padding: '20px 22px',
    marginBottom: '12px',
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, paddingBottom: '80px', fontFamily: "'Manrope', sans-serif" }}>

      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet" />

      {/* ── Sticky header ────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        background: `${T.bg}cc`,
        borderBottom: `1px solid ${T.border}`,
        padding: '12px 20px',
      }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Leaf size={18} color={T.primary} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '16px', color: T.heading }}>Sus10</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.12em', color: T.faint, textTransform: 'uppercase' }}>
              • Rooftop Report
            </span>
          </div>
          <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: '6px', borderRadius: '8px' }} aria-label="Share">
            <Share2 size={16} />
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 20px' }}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div style={{ paddingTop: '36px', paddingBottom: '8px' }}>
          <div style={{
            display: 'inline-block',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: T.primary, marginBottom: '16px',
          }}>
            Sus10 AI · Home Sustainability Report
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 800,
            fontSize: 'clamp(30px, 8vw, 42px)', lineHeight: 1.1,
            color: T.heading, margin: '0 0 10px',
          }}>
            Dear {firstName},<br/>
            <span style={{ color: T.primary }}>your rooftop</span><br/>
            has potential.
          </h1>
          {displayCity && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: T.primary, border: `1px solid ${T.borderSt}`,
                padding: '4px 10px', borderRadius: '6px',
              }}>{displayCity}</span>
              {terraceArea > 0 && (
                <span style={{ fontSize: '12px', color: T.faint }}>
                  {fmtNum(Math.round(terraceArea))} sq ft · {buildingType}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Score card ───────────────────────────────────────────────────── */}
        <div style={{ ...card, textAlign: 'center', padding: '32px 24px', margin: '24px 0 12px' }}>
          <div style={{ display: 'inline-block', marginBottom: '16px' }}>
            <ScoreRing score={overallScore} color={tierColor} label="Preparedness" size={160} />
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '6px 16px', borderRadius: '100px',
            background: `${tierColor}1a`, border: `1px solid ${tierColor}55`,
            marginBottom: '14px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tierColor, flexShrink: 0 }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: tierColor }}>
              {tier}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: T.muted, maxWidth: '280px', margin: '0 auto', lineHeight: 1.65 }}>
            Complete the steps below to raise {firstName}'s rooftop preparedness score.
          </p>
        </div>

        {/* ── Impact summary ───────────────────────────────────────────────── */}
        {totalSavHigh > 0 && (
          <div style={{ ...card, borderLeft: `3px solid ${T.primary}`, borderRadius: '0 16px 16px 0', padding: '20px 22px' }}>
            <p style={{ fontSize: '15px', color: T.body, lineHeight: 1.75, margin: '0 0 18px' }}>
              If {firstName} activated this rooftop fully, it could save{' '}
              <strong style={{ color: T.primary }}>
                Rs.{fmtINR(totalSavLow)}–Rs.{fmtINR(totalSavHigh)} / yr
              </strong>{' '}
              — while offsetting{' '}
              <strong style={{ color: T.primary }}>{fmtNum(co2Total)} kg CO₂</strong>
              {treesEq && <>, equivalent to planting <strong style={{ color: T.primary }}>{fmtNum(treesEq)} trees</strong> annually</>}.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Est. Annual Savings', value: totalSavHigh > 0 ? `Rs. ${fmtINR(totalSavLow)}+` : '—', accent: T.primary },
                { label: 'CO₂ Offset / yr', value: co2Total > 0 ? `${fmtNum(co2Total)} kg` : '—', accent: T.primary },
              ].map(({ label, value, accent }) => (
                <div key={label} style={{ background: T.card2, border: `1px solid ${T.borderSt}`, borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: T.faint, marginBottom: '5px' }}>{label}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '16px', color: accent }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* R03 fast-track CTA */}
        {flags.R03 && (
          <div style={{ ...card, textAlign: 'center' }}>
            <a href={ctaHref} style={{
              display: 'block', width: '100%', padding: '14px 24px',
              background: T.primary, color: '#0a1a0e', borderRadius: '12px',
              fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '14px',
              textDecoration: 'none', boxSizing: 'border-box',
            }}>{ctaText}</a>
            {email && (
              <p style={{ fontSize: '11px', color: T.faint, marginTop: '8px' }}>
                A copy of this report has been sent to {email}
              </p>
            )}
          </div>
        )}

        {/* ══ 01 • THE CORE ROOFTOP PILLARS ══ */}
        <SectionLabel number={1} accent={T.primary}>The Core Rooftop Pillars</SectionLabel>

        <div style={card}>
          <StatFlow icon={Sprout}   accent={T.primary} label="Plants estimated"
            value={plantCount > 0 ? fmtNum(plantCount) : '—'} unit="plants"
            hint={plantableAreaSqft ? `On ~${fmtNum(plantableAreaSqft)} sq ft of plantable area` : undefined} />
          <StatFlow icon={Leaf}     accent={T.primary} label="Organic food harvest"
            value={plantFood > 0 ? safeFmt(plantFood) : '—'} unit="kg / year" />
          <StatFlow icon={TrendingUp} accent={T.primary} label="CO₂ sequestered — greening"
            value={plantCO2 > 0 ? fmtNum(plantCO2) : '—'} unit="kg CO₂ / year" divider={rainLitres > 0 || solarKwh > 0 || showBiogas} />

          {rainLitres > 0 && (
            <StatFlow icon={Droplets} accent={T.water} label="Rainwater catchment"
              value={fmtNum(rainLitres)} unit="litres / year"
              hint={`Catchment area: ${fmtNum(Math.round(terraceArea))} sq ft`}
              divider={solarKwh > 0 || showBiogas} />
          )}
          {rainSavings > 0 && (
            <StatFlow icon={Droplets} accent={T.water} label="Water bill savings"
              value={`Rs.${fmtINR(rainSavings)}`} unit="per year" divider={solarKwh > 0 || showBiogas} />
          )}

          {solarKwh > 0 && (
            <StatFlow icon={Sun} accent={T.solar} label="Solar generation"
              value={`${fmtNum(Math.round(solarKwh * 0.45))}–${fmtNum(solarKwh)}`} unit="units / year"
              hint={solarKwp ? `${solarKwp} kWp system` : undefined}
              divider={solarSavings > 0 || showBiogas} />
          )}
          {solarSavings > 0 && (
            <StatFlow icon={Zap} accent={T.solar} label="Solar savings estimate"
              value={`Rs.${fmtINR(solarSavLow)}–${fmtINR(solarSavings)}`} unit="per year"
              hint={solarCO2 > 0 ? `${fmtNum(solarCO2)} kg CO₂ offset / yr` : undefined}
              divider={showBiogas} />
          )}

          {showBiogas && biogasM3 > 0 && (
            <StatFlow icon={Recycle} accent={T.biogas} label="Biogas gas yield"
              value={safeFmt(biogasM3)} unit="m³ / year"
              hint={biogasCylinders > 0 ? `≈ ${Math.round(biogasCylinders)} LPG cylinders / yr` : undefined}
              divider={biogasSavingsVal > 0} />
          )}
          {showBiogas && biogasSavingsVal > 0 && (
            <StatFlow icon={Recycle} accent={T.biogas} label="LPG savings — biogas"
              value={`Rs.${fmtINR(biogasSavingsVal)}`} unit="saved / year" divider={false} />
          )}
        </div>

        {/* ══ 02 • FEASIBILITY ══ */}
        <SectionLabel number={2} accent={T.solar}>Rooftop Feasibility</SectionLabel>

        <div style={card}>
          <MeterBar label="Structural Capacity"   score={scores.capacity   ?? 0} color={T.solar} />
          <MeterBar label="Motivation Score"      score={scores.motivation ?? 0} color={T.primary} />
          <MeterBar label="Initial Interest"      score={scores.interest   ?? 0} color={T.water} />
          <MeterBar
            label="Household Waste Habits"
            score={scores.barriers ?? 0}
            color={T.primary}
            valueLabel={(scores.barriers ?? 0) >= 60 ? 'GOOD' : (scores.barriers ?? 0) >= 30 ? 'MODERATE' : 'LOW'}
          />
        </div>

        {/* ══ 03 • STRENGTHS ══ */}
        {strengthItems.length > 0 && (
          <>
            <SectionLabel number={3} accent={T.primary}>Identified Strengths</SectionLabel>
            <div style={card}>
              {strengthItems.map((s, i) => {
                const colonIdx = s.indexOf(':');
                const hasColon = colonIdx > 0 && colonIdx < 40;
                const title = hasColon ? s.substring(0, colonIdx).replace(/^\d+\.\s*/, '').trim() : '';
                const body  = hasColon ? s.substring(colonIdx + 1).trim() : stripMd(s);
                const icons = [Shield, Heart, Sprout, Zap, TrendingUp];
                const Icon  = icons[i % icons.length];
                return (
                  <div key={i} style={{
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                    paddingBottom: i < strengthItems.length - 1 ? '16px' : 0,
                    marginBottom: i < strengthItems.length - 1 ? '16px' : 0,
                    borderBottom: i < strengthItems.length - 1 ? `1px solid ${T.border}` : 'none',
                  }}>
                    <div style={{
                      width: '34px', height: '34px', flexShrink: 0, borderRadius: '9px',
                      background: `${T.primary}18`, border: `1px solid ${T.borderSt}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: T.primary,
                    }}>
                      <Icon size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      {title && <p style={{ fontWeight: 600, fontSize: '14px', color: T.heading, margin: '0 0 3px' }}>{title}</p>}
                      <p style={{ fontSize: '13px', color: T.body, lineHeight: 1.65, margin: 0 }}>{body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Fallback markdown */}
        {!parsed && reportText && (
          <>
            <SectionLabel number={3} accent={T.primary}>Full Report</SectionLabel>
            <div style={{ ...card, lineHeight: 1.75 }}>
              <style>{`
                .rp-md p{color:${T.body};font-size:14px;line-height:1.75;margin-bottom:14px}
                .rp-md h2,.rp-md h3{color:${T.heading};font-weight:700;margin:20px 0 8px}
                .rp-md ul,.rp-md ol{color:${T.body};font-size:14px;line-height:1.7;padding-left:1.4em;margin-bottom:14px}
                .rp-md li{margin-bottom:5px}
                .rp-md strong{color:${T.heading};font-weight:700}
                .rp-md blockquote{border-left:3px solid ${T.primary};padding-left:12px;color:${T.muted};margin:1em 0;font-style:italic}
              `}</style>
              <div className="rp-md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportText}</ReactMarkdown>
              </div>
            </div>
          </>
        )}

        {/* ══ 04 • RECOMMENDATIONS ══ */}
        {recItems.length > 0 && (
          <>
            <SectionLabel number={4} accent={T.water}>Recommended Actions</SectionLabel>
            {recItems.slice(0, 3).map((rec, i) => {
              const colonIdx = rec.indexOf(':');
              const hasColon = colonIdx > 0 && colonIdx < 60;
              const rawTitle = hasColon ? rec.substring(0, colonIdx).replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim() : `Action ${i + 1}`;
              const body     = hasColon ? rec.substring(colonIdx + 1).trim() : stripMd(rec);
              const cats  = ['GREENING', 'RAINWATER', 'SOLAR'];
              const costs = ['Rs. 2,000 – 5,000', 'Rs. 15,000 – 25,000', 'Rs. 1,50,000 – 2,00,000 (post-subsidy)'];
              const prio  = ['Lowest barrier — start today', 'Install before monsoon', 'One-time · High lifetime savings'];
              const accents = [T.primary, T.water, T.solar];
              const accent  = accents[i] || T.primary;
              return (
                <div key={i} style={{ ...card }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
                      fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: accent, border: `1px solid ${accent}44`,
                      padding: '3px 8px', borderRadius: '5px',
                    }}>{cats[i] || 'ACTION'}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: T.faint, letterSpacing: '0.1em' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '16px', color: T.heading, margin: '0 0 8px', lineHeight: 1.3 }}>{rawTitle}</h3>
                  <p style={{ fontSize: '13px', color: T.muted, lineHeight: 1.65, margin: '0 0 16px' }}>{body}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: T.faint, border: `1px solid ${T.border}`, padding: '4px 10px', borderRadius: '100px' }}>
                      {costs[i]}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: accent, border: `1px solid ${accent}44`, padding: '4px 10px', borderRadius: '100px' }}>
                      {prio[i]}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ══ 05 • ROADMAP ══ */}
        <SectionLabel number={5} accent={T.biogas}>Your Activation Roadmap</SectionLabel>

        {[
          { n: 1, range: '0 – 3 months',  phaseKey: 'phase1', fallback: 'Foundation', accent: T.primary },
          { n: 2, range: '3 – 12 months', phaseKey: 'phase2', fallback: 'Install',    accent: T.water   },
          { n: 3, range: '1 – 3 years',   phaseKey: 'phase3', fallback: 'Optimise',   accent: T.solar   },
        ].map(p => {
          const phaseData  = roadmapPhases[p.phaseKey] || {};
          const phaseTitle = phaseData.title || p.fallback;
          const phaseItems = extractPhaseItems(phaseData.body, 5);
          const defaultItems = [
            'Set up initial planting or RWH installation',
            'Research vendors and request quotes',
            'Review savings and plan next phase',
          ];
          const items = phaseItems.length > 0 ? phaseItems : defaultItems;
          return (
            <div key={p.n} style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: p.accent, marginBottom: '5px' }}>
                    Phase {p.n} · {p.range}
                  </div>
                  <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '17px', color: T.heading }}>{phaseTitle}</div>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: T.faint, background: T.card2, padding: '4px 10px', borderRadius: '6px' }}>
                  {items.length} tasks
                </span>
              </div>
              <div>
                {items.map((item, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: j < items.length - 1 ? '12px' : 0 }}>
                    <CheckSquare size={16} color={T.border} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '13px', color: T.body, lineHeight: 1.55 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* ══ 06 • FINAL ASSESSMENT ══ */}
        <SectionLabel number={6} accent={T.primary}>Final Assessment</SectionLabel>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
          {faTriptych.map((c, i) => (
            <div key={i} style={{ background: T.card2, border: `1px solid ${T.borderSt}`, borderRadius: '12px', padding: '14px 12px' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.faint, marginBottom: '8px' }}>{c.label}</div>
              <p style={{ fontSize: '11px', color: T.body, lineHeight: 1.55, margin: 0 }}>{c.text}</p>
            </div>
          ))}
        </div>

        <div style={{ ...card, textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: T.muted, marginBottom: '16px' }}>
            Ready to turn your rooftop into a climate solution?
          </p>
          <a href={ctaHref} style={{
            display: 'block', padding: '14px 24px',
            background: T.primary, color: '#0a1a0e',
            borderRadius: '12px', fontWeight: 700, fontSize: '14px',
            textDecoration: 'none', textAlign: 'center',
          }}>
            {ctaText}
          </a>
          {email && (
            <p style={{ fontSize: '11px', color: T.faint, marginTop: '10px' }}>
              A copy of this report has been sent to {email}
            </p>
          )}
        </div>

        <div style={{ textAlign: 'center', padding: '28px 0 16px' }}>
          <p style={{ fontSize: '12px', color: T.faint, fontStyle: 'italic', marginBottom: '6px' }}>
            "Every roof has the potential to become a climate solution."
          </p>
          <p style={{ fontSize: '13px', color: T.primary, fontWeight: 600 }}>
            Your journey toward a self-sustaining roof starts with one small step.
          </p>
        </div>

        {/* ══ SOLUTION PARTNERS ══ */}
        <SectionLabel accent={T.muted}>Solution Partners</SectionLabel>

        {[
          { Icon: Sprout,   name: 'Rooftop Farming',       desc: 'Expert guidance on terrace gardens and container farms',   sub: 'Container Gardening · Food Forest', accent: T.primary },
          { Icon: Droplets, name: 'Rainwater Harvesting',   desc: 'RWH system design, tank sizing, plumbing integration',    sub: 'Storage · Filtration · Recharge',  accent: T.water   },
          { Icon: Sun,      name: 'Solar Installation',     desc: 'MNRE-empanelled solar vendors, net-metering support',     sub: 'Grid-tied · Net Metering',          accent: T.solar   },
        ].map(({ Icon, name, desc, sub, accent }) => (
          <div key={name} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', flexShrink: 0, borderRadius: '10px', background: `${accent}18`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: T.heading }}>{name}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: T.faint, letterSpacing: '0.06em' }}>{sub}</div>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: T.muted, margin: 0 }}>{desc}</p>
            <a href={`mailto:gp@sus10.ai?subject=${encodeURIComponent('Vendor Enquiry — ' + name + ' — ' + firstName + ', ' + displayCity)}`}
              style={{ display: 'block', padding: '11px 16px', background: T.primary, color: '#0a1a0e', borderRadius: '10px', fontWeight: 700, fontSize: '13px', textDecoration: 'none', textAlign: 'center' }}>
              Connect me →
            </a>
          </div>
        ))}

        <p style={{ textAlign: 'center', fontSize: '11px', color: T.faint, padding: '4px 0 20px' }}>
          Sus10 AI will personally connect you with verified installers. No spam, no sales calls — just the right people.
        </p>

        {/* Disclaimer */}
        <div style={{ background: '#1a1200', border: `1px solid ${T.border}`, borderRadius: '12px', padding: '14px 16px' }}>
          <p style={{ fontSize: '10px', color: T.faint, lineHeight: 1.65, margin: 0 }}>
            Estimates use MNRE solar data, IMD rainfall data, and CPCB waste norms. Indicative only — confirmed after a professional site assessment. Structural load, shade, roof slope, and local regulations require professional evaluation.{' '}
            <a href="mailto:gp@sus10.ai" style={{ color: T.primary }}>gp@sus10.ai</a>
          </p>
        </div>

      </div>
    </div>
  );
}
