import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Leaf, Sun, Droplets, Recycle, Sprout,
  Building2, ArrowRight, Zap, CloudRain,
  Heart, Users, CheckCircle2, DollarSign,
} from 'lucide-react';
import { apiRequest } from '../lib/utils';
import { parseReportSections, extractBullets, extractPhases } from '../utils/reportParser';

// JS tokens — used for dynamic style values; static theming via .rp-root CSS vars
const GREEN  = '#4ade80';
const TEXT   = '#f0f0e8';
const MUTED  = 'rgba(240,240,232,0.5)';
const DIM    = 'rgba(240,240,232,0.35)';
const AMBER  = '#fbbf24';
const BLUE   = '#60a5fa';
const TEAL   = '#34d399';
const LIME   = '#a3e635';
const RED    = '#f87171';
const CARD   = '#0f1f11';
const BORDER = 'rgba(255,255,255,0.07)';
const BG     = '#0d1710';
const NAV_BG = '#0a1209';

const TIER_COLORS = {
  'Explorer':               RED,
  'Getting Ready':          AMBER,
  'Action Ready':           GREEN,
  'Sustainability Champion':'#00c96e',
};

const UNIVERSAL_CTA_TEXT = 'Connect with us for a 1:1 Consultation';

const fmtRs  = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const fmtNum = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const stripMd = s => (s || '').replace(/\*{1,3}/g, '').trim();

function scoreColor(score, inverted = false) {
  const s = inverted ? (100 - score) : score;
  return s >= 60 ? GREEN : s >= 30 ? AMBER : RED;
}

function wasteHabit(q6) {
  const s = (q6 || '').toLowerCase();
  if (s.includes('regularly'))  return { score: 75, label: 'Good',   color: GREEN };
  if (s.includes('sometimes'))  return { score: 50, label: 'Medium', color: AMBER };
  if (s.includes('rarely'))     return { score: 25, label: 'Low',    color: RED   };
  if (s.includes('not at all')) return { score: 10, label: 'Low',    color: RED   };
  return { score: 0, label: '—', color: DIM };
}

function buildMailto(firstName, overallScore, tier) {
  const subject  = encodeURIComponent('Sus10 Consultation Request — ' + (firstName || ''));
  const bodyText = encodeURIComponent(
    'Hi, I just received my Sus10 sustainability report' +
    (overallScore ? ' (Score: ' + overallScore + '/100 — ' + (tier || '') + ')' : '') +
    ' and would like to book a free 1:1 consultation.'
  );
  return 'mailto:gp@sus10.ai?subject=' + subject + '&body=' + bodyText;
}

function parseTitle(raw) {
  if (!raw) return { title: '', body: '' };
  let m = raw.match(/^\*\*([^*]{3,60})\*\*\s*:?\s*(.*)$/s);
  if (m) return { title: m[1].trim(), body: stripMd(m[2]) };
  m = raw.match(/^([^:]{5,60}):\s*(.{10,})$/s);
  if (m) return { title: stripMd(m[1]), body: stripMd(m[2]) };
  const clean = stripMd(raw);
  const words = clean.split(' ').filter(Boolean);
  return { title: words.slice(0, Math.min(5, words.length)).join(' '), body: clean };
}

function extractFinalCards(faText, tier, overall) {
  const def = {
    readiness:   tier + ' (' + overall + '/100). Your rooftop assessment is complete.',
    opportunity: 'Your rooftop has strong potential across sustainability dimensions.',
    action:      'Start with a professional site assessment to confirm these estimates.',
  };
  if (!faText) return def;
  const sents = faText.match(/[^.!?]+[.!?]+/g) || [];
  if (!sents.length) return def;
  const opp    = sents.find(s => /opportunit|biggest|highest|strong|potential|best bet/i.test(s)) || sents[1] || sents[0];
  const action = sents.find(s => /this month|one action|first step|start with|recommend|next step/i.test(s)) || sents[sents.length - 1];
  return {
    readiness:   stripMd(sents[0]) || def.readiness,
    opportunity: stripMd(opp)      || def.opportunity,
    action:      stripMd(action)   || def.action,
  };
}

function strengthIcon(text) {
  const t = (text || '').toLowerCase();
  if (/roof|building|house|terrace|space/.test(t)) return Building2;
  if (/water|rain|harvest/.test(t))                return Droplets;
  if (/solar|energy|panel|pv/.test(t))             return Zap;
  if (/garden|plant|green/.test(t))                return Sprout;
  if (/financ|cost|invest|afford/.test(t))         return DollarSign;
  if (/motivat|commit|interest/.test(t))           return Heart;
  if (/communit|society|neighbour/.test(t))        return Users;
  return CheckCircle2;
}

function recIcon(text) {
  const t = (text || '').toLowerCase();
  if (/solar|panel|pv|energy/.test(t))     return Zap;
  if (/rain|water|harvest/.test(t))        return CloudRain;
  if (/garden|plant|green|farm/.test(t))   return Sprout;
  if (/biogas|compost|waste/.test(t))      return Recycle;
  if (/financ|invest|subsid|cost/.test(t)) return DollarSign;
  return ArrowRight;
}

// ── Section C: SVG circle score gauge ────────────────────────────────────────
function ScoreGauge({ score, tierColor, tier }) {
  const r    = 44;
  const circ = 2 * Math.PI * r;
  const off  = circ * (1 - Math.min(score, 100) / 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width="116" height="116" viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke={tierColor} strokeWidth="9"
          strokeDasharray={circ} strokeDashoffset={off}
          strokeLinecap="round" transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="60" y="56" textAnchor="middle" fontSize="24" fontWeight="600"
          fill={TEXT} fontFamily="DM Sans, sans-serif">{score}</text>
        <text x="60" y="73" textAnchor="middle" fontSize="11"
          fill={MUTED} fontFamily="DM Sans, sans-serif">/ 100</text>
      </svg>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: tierColor + '1a', border: '0.5px solid ' + tierColor + '55',
        borderRadius: 20, padding: '4px 12px',
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: tierColor }} />
        <span style={{ fontSize: 12, color: tierColor, fontWeight: 500 }}>{tier}</span>
      </div>
    </div>
  );
}

// ── Loading / Error — wrapped in .rp-root ─────────────────────────────────────
function LoadingState() {
  return (
    <div className="rp-root" style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, animation: 'rp-bounce 1.2s ease-in-out ' + (i * 0.2) + 's infinite' }} />
        ))}
      </div>
      <div style={{ color: MUTED, fontSize: 13 }}>Loading your report…</div>
      <style>{`@keyframes rp-bounce{0%,80%,100%{transform:scale(0.8);opacity:.4}40%{transform:scale(1.2);opacity:1}}`}</style>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div className="rp-root" style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 16, color: TEXT }}>
        Report not found. Please check your link or write to{' '}
        <a href="mailto:gp@sus10.ai" style={{ color: GREEN }}>gp@sus10.ai</a>
      </div>
      {error && <div style={{ fontSize: 13, color: MUTED }}>{typeof error === 'string' ? error : JSON.stringify(error)}</div>}
    </div>
  );
}

// ── CTA Block ─────────────────────────────────────────────────────────────────
function CtaBlock({ tier, firstName, email, overallScore }) {
  const mailto = buildMailto(firstName, overallScore, tier);
  return (
    <div className="rp-cta" style={{ margin: '14px 24px 0', background: CARD, border: '0.5px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>Ready to turn your rooftop into a climate solution?</div>
      <a
        href={mailto}
        style={{ display: 'inline-block', background: GREEN, color: NAV_BG, fontSize: 13, fontWeight: 500, padding: '10px 28px', borderRadius: 20, textDecoration: 'none' }}
      >
        {UNIVERSAL_CTA_TEXT}
      </a>
      {email && (
        <div style={{ fontSize: 11, color: 'rgba(240,240,232,0.25)', marginTop: 8 }}>
          A copy of this report has been sent to {email}
        </div>
      )}
    </div>
  );
}

// ── Share Bar ─────────────────────────────────────────────────────────────────
function ShareBar({ firstName, totalSavings, trees }) {
  const [copied, setCopied] = useState(false);
  const waMsg = encodeURIComponent(
    `I just got my Sus10 rooftop sustainability report!\n` +
    `My roof could potentially save Rs.${new Intl.NumberFormat('en-IN').format(Math.round(totalSavings))}/year ` +
    `and offset the equivalent of ${trees} trees of CO2 annually.\n` +
    `Get yours free at sus10.ai 🌿`
  );
  const waUrl = `https://wa.me/?text=${waMsg}`;
  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };
  const handleNativeShare = () => {
    navigator.share({ title: 'My Sus10 Rooftop Report', text: decodeURIComponent(waMsg), url: window.location.href }).catch(() => {});
  };
  const btnBase = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 16, fontSize: 12,
    cursor: 'pointer', background: 'transparent', fontFamily: 'inherit',
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, padding: '8px 24px', margin: '12px 0 0' }}>
      {typeof navigator !== 'undefined' && navigator.share ? (
        <button onClick={handleNativeShare} style={{ ...btnBase, border: '0.5px solid rgba(37,211,102,0.4)', color: '#25d366' }}>Share →</button>
      ) : (
        <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnBase, border: '0.5px solid rgba(37,211,102,0.4)', color: '#25d366', textDecoration: 'none' }}>📲 Share on WhatsApp</a>
      )}
      <button onClick={handleCopy} style={{ ...btnBase, border: '0.5px solid rgba(255,255,255,0.15)', color: copied ? GREEN : 'rgba(240,240,232,0.6)' }}>
        {copied ? 'Copied! ✓' : 'Copy link'}
      </button>
    </div>
  );
}

// ── J: Solution Partners / Vendor Cards ──────────────────────────────────────
const VENDOR_CATEGORIES = [
  { key: 'greening',  icon: '🌿', name: 'Rooftop Farming',       desc: 'Expert guidance on terrace gardens and container farms',    subjectFn: (city, name) => `Vendor referral — Rooftop Farming — ${city} — ${name}` },
  { key: 'rainwater', icon: '💧', name: 'Rainwater Harvesting',   desc: 'RWH design, tank sizing, plumbing integration',             subjectFn: (city, name) => `Vendor referral — RWH — ${city} — ${name}` },
  { key: 'solar',     icon: '☀️', name: 'Solar Installation',     desc: 'MNRE-empanelled solar vendors, net-metering support',       subjectFn: (city, name) => `Vendor referral — Solar — ${city} — ${name}` },
  { key: 'biogas',    icon: '♻️', name: 'Biogas System',          desc: 'Small-scale biogas for households with organic waste',      subjectFn: (city, name) => `Vendor referral — Biogas — ${city} — ${name}` },
];

function VendorCards({ solar, rainwater, biogas, city, firstName }) {
  const toShow = VENDOR_CATEGORIES.filter(c => c.key !== 'biogas' || !!biogas).slice(0, 3);
  if (!toShow.length) return null;
  return (
    <div style={{ padding: '0 24px', marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: GREEN, letterSpacing: '0.1em', opacity: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>Solution Partners</div>
      <div className="rp-grid-3">
        {toShow.map(cat => {
          const subject = encodeURIComponent(cat.subjectFn(city || 'your city', firstName || 'homeowner'));
          const body    = encodeURIComponent(`Hi, I just received my Sus10 sustainability report and I'm interested in ${cat.name}. Please connect me with a verified vendor.`);
          return (
            <div key={cat.key} style={{ background: CARD, border: '0.5px solid ' + BORDER, borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{cat.name}</span>
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 10, lineHeight: 1.55 }}>{cat.desc}</div>
              <a
                href={`mailto:gp@sus10.ai?subject=${subject}&body=${body}`}
                style={{ display: 'block', width: '100%', textAlign: 'center', padding: '8px', fontSize: 12, color: GREEN, border: '0.5px solid ' + GREEN, borderRadius: 16, textDecoration: 'none', boxSizing: 'border-box' }}
              >
                Connect me →
              </a>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: 'rgba(240,240,232,0.35)', fontStyle: 'italic', textAlign: 'center', marginTop: 10, lineHeight: 1.6 }}>
        Sus10 will personally connect you with verified installers. No spam, no sales calls — just the right people.
      </p>
    </div>
  );
}

// ── Markdown fallback ─────────────────────────────────────────────────────────
function SectionFallback({ text }) {
  if (!text) return null;
  return (
    <div style={{ background: CARD, border: '0.5px solid ' + BORDER, borderRadius: 8, padding: '12px 16px' }}>
      <div className="rp-md">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    </div>
  );
}

// ── Page divider ──────────────────────────────────────────────────────────────
function PageDivider({ label }) {
  return (
    <div style={{ margin: '20px 24px 16px' }}>
      <div style={{ borderTop: '0.5px solid ' + BORDER }} />
      <div style={{ fontSize: 10, color: 'rgba(240,240,232,0.2)', letterSpacing: '0.06em', textAlign: 'center', marginTop: 8, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportPage() {
  const { assessmentId } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [pdfState, setPdfState]     = useState('idle'); // idle | loading | error

  const handleDownloadPDF = async () => {
    setPdfState('loading');
    try {
      const response = await fetch(
        `/api/assessments/${assessmentId}/report.pdf?persona=citizen_owner`,
        { method: 'GET', headers: { 'Accept': 'application/pdf' } }
      );
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Sus10_Report_${assessmentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setPdfState('idle');
    } catch (err) {
      setPdfState('error');
      setTimeout(() => setPdfState('idle'), 3000);
    }
  };

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
  const answers    = assessment.answers               || {};
  const scores     = assessment.scores                || {};
  const flags      = assessment.conditional_flags     || {};
  const tier       = assessment.readiness_tier        || 'Explorer';
  const tierColor  = TIER_COLORS[tier]                || RED;
  const reportText = assessment.report_text           || '';
  const solar      = assessment.calculated_solar      || {};
  const rainwater  = assessment.calculated_rainwater  || {};
  const biogas     = assessment.calculated_biogas     || null;
  const plantation = assessment.calculated_plantation || {};
  const inputsSqft = assessment.calculation_inputs_sqft || {};
  const sp         = assessment.sustenance_potential  || {};

  const firstName    = answers.first_name || 'Your';
  const email        = answers.email      || '';
  const city         = inputsSqft.city    || answers.city  || '';
  const state        = answers.state      || '';
  const displayCity  = city ? city.charAt(0).toUpperCase() + city.slice(1) : city;
  const terraceSqft  = Math.round(inputsSqft.terrace_area_sqft || answers.terrace_area_sqft || 0);
  const buildingType = answers.Q1         || '';
  const q6Answer     = answers.Q6         || '';
  const overallScore = scores.overall != null ? scores.overall : 0;

  // ── Derived totals ──────────────────────────────────────────────────────────
  const totalSavings = Math.round(
    (solar.annual_savings_inr     || 0) +
    (rainwater.annual_savings_inr || 0) +
    ((biogas && biogas.annual_savings_inr) || 0)
  );
  const rainSavBase  = rainwater.annual_savings_inr || 0;
  const biogasBase   = (biogas && biogas.annual_savings_inr) || 0;
  const totalSavLow  = Math.round((solar.savings_low_inr  || Math.round((solar.annual_savings_inr || 0) * 0.909)) + rainSavBase + biogasBase);
  const totalSavHigh = Math.round((solar.savings_high_inr || Math.round((solar.annual_savings_inr || 0) * 1.091)) + rainSavBase + biogasBase);
  const co2Total = Math.round(
    (solar.co2_offset_kg_per_year              || 0) +
    ((biogas && biogas.co2_offset_kg_per_year) || 0) +
    (plantation.co2_sequestered_kg_per_year    || 0)
  );
  const trees = Math.round(co2Total / 21);

  // ── Pillar numbers (prefer direct fields; fall back to sustenance_potential) ─
  const solarKwh     = solar.annual_generation_kwh   || sp.solar?.kwh_per_year              || 0;
  const solarSavings = solar.annual_savings_inr      || sp.solar?.annual_savings_inr        || 0;
  const solarKwp     = solar.installed_capacity_kwp  || 0;
  const solarCO2     = solar.co2_offset_kg_per_year  || sp.solar?.co2_offset_kg_per_year    || 0;
  const solarKwhLow  = solar.kwh_low                 || Math.round(solarKwh * 0.909);
  const solarKwhHigh = solar.kwh_high                || Math.round(solarKwh * 1.091);
  const solarSavLow  = solar.savings_low_inr         || Math.round(solarSavings * 0.909);
  const solarSavHigh = solar.savings_high_inr        || Math.round(solarSavings * 1.091);

  const rainKl       = rainwater.annual_yield_kiloliters || sp.rainwater?.kl_per_year        || 0;
  const rainSavings  = rainwater.annual_savings_inr      || sp.rainwater?.annual_savings_inr || 0;
  const rainCatch    = Math.round((rainwater.catchment_area_sqm || 0) * 10.764) || terraceSqft;

  const biogasMonthly = biogas ? Math.round((biogas.biogas_m3_per_day || 0) * 30 * 10) / 10 : 0;
  const biogasSavings = (biogas && biogas.annual_savings_inr)       || 0;
  const biogasWaste   = (biogas && biogas.daily_organic_waste_kg)   || 0;
  const biogasCO2     = (biogas && biogas.co2_offset_kg_per_year)   || 0;
  const lpgCylinders  = sp.biogas?.lpg_cylinders_per_year           || null;

  const plantCount    = plantation.total_plants_count           || sp.plantation?.plant_count              || 0;
  const plantFood     = plantation.annual_food_yield_kg         || sp.plantation?.food_yield_kg_per_year   || 0;
  const plantAreaSqft = Math.round((plantation.effective_area_sqm || 0) * 10.764);
  const plantCO2      = plantation.co2_sequestered_kg_per_year  || sp.plantation?.co2_sequestration_kg_per_year || 0;

  // ── Parse report text ───────────────────────────────────────────────────────
  const parsed        = parseReportSections(reportText);
  const strengthItems = extractBullets(parsed.strengths, 3);
  const recItems      = extractBullets(parsed.recommendations, 3);
  const phases        = extractPhases(parsed.roadmap);
  const finalCards    = extractFinalCards(parsed.finalAssessment, tier, overallScore);
  const wh            = wasteHabit(q6Answer);

  const metaParts = [
    displayCity && state ? displayCity + ', ' + state : (displayCity || state),
    terraceSqft ? fmtNum(terraceSqft) + ' sq ft terrace' : null,
    buildingType || null,
  ].filter(Boolean);
  const metaLine = metaParts.join(' · ');

  return (
    <div className="rp-root" style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Global styles & .rp-root design tokens ──────────────────────────── */}
      <style>{`
        .rp-root {
          --rp-bg:     #0d1710;
          --rp-card:   #0f1f11;
          --rp-border: rgba(255,255,255,0.07);
          --rp-green:  #4ade80;
          --rp-text:   #f0f0e8;
          --rp-muted:  rgba(240,240,232,0.5);
          --rp-dim:    rgba(240,240,232,0.35);
          --rp-amber:  #fbbf24;
          --rp-blue:   #60a5fa;
          --rp-teal:   #34d399;
          --rp-lime:   #a3e635;
          --rp-red:    #f87171;
          --rp-nav:    #0a1209;
        }
        html:not(.dark) .rp-root {
          --rp-bg:     #f5f7f4;
          --rp-card:   #ffffff;
          --rp-border: rgba(0,0,0,0.08);
          --rp-green:  #16a34a;
          --rp-text:   #1a2018;
          --rp-muted:  rgba(26,32,24,0.65);
          --rp-dim:    rgba(26,32,24,0.4);
          --rp-nav:    #eef2ec;
        }
        .rp-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
        .rp-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;align-items:start}
        .rp-grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;align-items:start}
        @media(max-width:640px){
          .rp-grid-4{grid-template-columns:repeat(2,1fr)}
          .rp-grid-3{grid-template-columns:1fr}
          .rp-grid-2{grid-template-columns:1fr}
          .rp-hero-split{flex-direction:column!important}
          .rp-gauge-wrap{align-self:center}
          .rp-strengths-split{grid-template-columns:1fr!important}
        }
        @media print{
          .rp-nav{display:none!important}
          .rp-cta{display:none!important}
          .rp-page{break-inside:avoid}
        }
        .rp-md{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
        .rp-md p{color:rgba(240,240,232,0.7);font-size:15px;line-height:1.8;margin-bottom:16px}
        .rp-md h2{color:#f0f0e8;font-size:18px;font-weight:600;margin-top:28px;margin-bottom:12px}
        .rp-md h3{color:#4ade80;font-size:15px;font-weight:500;margin-top:20px;margin-bottom:8px}
        .rp-md h1{color:#f0f0e8;font-size:20px;font-weight:600;margin-top:28px;margin-bottom:12px}
        .rp-md ul,.rp-md ol{color:rgba(240,240,232,0.7);font-size:15px;line-height:1.7;padding-left:1.4em;margin-bottom:16px}
        .rp-md li{margin-bottom:6px;font-size:15px;line-height:1.7}
        .rp-md strong{color:#f0f0e8;font-weight:600}
        .rp-md em{color:rgba(240,240,232,0.7)}
        .rp-md hr{border:none;border-top:1px solid rgba(255,255,255,0.07);margin:1.2em 0}
        .rp-md blockquote{border-left:3px solid #4ade80;padding-left:12px;color:rgba(240,240,232,0.5);margin:1em 0;font-style:italic}
        @keyframes rp-bounce{0%,80%,100%{transform:scale(0.8);opacity:.4}40%{transform:scale(1.2);opacity:1}}
      `}</style>

      {/* ── A: TOP NAV ──────────────────────────────────────────────────────── */}
      <div className="rp-nav" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: NAV_BG, height: 44, padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '0.5px solid ' + BORDER,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Leaf style={{ color: GREEN, width: 17, height: 17 }} />
          <span style={{ fontSize: 14, fontFamily: "'Playfair Display', serif", fontWeight: 700, color: TEXT }}>Sus10 AI</span>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={pdfState === 'loading'}
          style={{
            background: 'transparent',
            border: '1px solid ' + (pdfState === 'error' ? RED : GREEN),
            color: pdfState === 'error' ? RED : GREEN,
            fontSize: 12, padding: '6px 14px', borderRadius: 16,
            cursor: pdfState === 'loading' ? 'not-allowed' : 'pointer',
            opacity: pdfState === 'loading' ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          {pdfState === 'loading' ? 'Generating PDF…' : pdfState === 'error' ? 'Download failed — try again' : '↓ Download Report'}
        </button>
      </div>

      {/* ── B: HERO ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 24px 12px' }}>
        <div style={{ fontSize: 11, color: GREEN, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          Sus10 AI · Home Sustainability Report
        </div>
        <div style={{ fontSize: 26, fontWeight: 500, color: TEXT, lineHeight: 1.2, marginBottom: 6, fontFamily: "'Playfair Display', serif" }}>
          {firstName}&apos;s Rooftop Potential
        </div>
        {metaLine && (
          <div style={{ fontSize: 12, color: 'rgba(240,240,232,0.4)' }}>{metaLine}</div>
        )}
      </div>

      {/* ── C: SCORE GAUGE + D: HIGHLIGHT BOX ──────────────────────────────── */}
      <div className="rp-hero-split" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 20, margin: '0 24px 16px',
        background: CARD, border: '0.5px solid ' + BORDER, borderRadius: 12,
        padding: '20px 24px',
      }}>
        {/* D: Impact summary */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, marginBottom: 14 }}>
            If {firstName} activated their rooftop fully, it could save{' '}
            <span style={{ color: GREEN, fontWeight: 600 }}>Rs.{fmtRs(totalSavLow)}–Rs.{fmtRs(totalSavHigh)}/yr</span>
            {' '}while offsetting{' '}
            <span style={{ color: GREEN, fontWeight: 600 }}>{fmtNum(co2Total)} kg CO₂</span>
            {' '}— equal to planting{' '}
            <span style={{ color: GREEN, fontWeight: 600 }}>{fmtNum(trees)} trees</span>{' '}annually.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[
              plantFood ? { icon: '🌿', value: fmtNum(plantFood) + ' kg food/yr' } : null,
              { icon: '💧', value: fmtNum(rainKl) + ' kL/yr' },
              { icon: '☀️', value: fmtNum(solarKwhLow) + '–' + fmtNum(solarKwhHigh) + ' kWh/yr' },
              { icon: '🌍', value: (co2Total / 1000).toFixed(1) + ' t CO₂/yr' },
            ].filter(Boolean).map(chip => (
              <span key={chip.icon} style={{
                background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: '3px 10px', fontSize: 11, color: TEXT,
              }}>
                {chip.icon} <span style={{ fontWeight: 500 }}>{chip.value}</span>
              </span>
            ))}
          </div>
        </div>
        {/* C: Circle gauge */}
        <div className="rp-gauge-wrap">
          <ScoreGauge score={overallScore} tierColor={tierColor} tier={tier} />
        </div>
      </div>

      {/* Early CTA for high-intent flag R03 */}
      {flags.R03 && (
        <div style={{ marginBottom: 8 }}>
          <CtaBlock tier={tier} firstName={firstName} email={email} overallScore={overallScore} />
        </div>
      )}

      <ShareBar firstName={firstName} totalSavings={totalSavings} trees={trees} />

      {/* ── E: SUSTENANCE PILLAR CARDS ──────────────────────────────────────── */}
      <div style={{ margin: '14px 24px 0' }}>
        <div style={{ fontSize: 10, color: GREEN, letterSpacing: '0.1em', opacity: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>Sustenance Pillars</div>
        <div className={biogas ? 'rp-grid-2' : 'rp-grid-3'}>

          {/* Greening — lowest barrier, shown first */}
          <div style={{ background: CARD, borderRadius: 8, padding: 14, border: '0.5px solid ' + BORDER }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(163,230,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sprout style={{ width: 14, height: 14, color: LIME }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>Greening</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: LIME, lineHeight: 1 }}>{fmtNum(plantCount)}</div>
            <div style={{ fontSize: 10, color: DIM, marginBottom: 6 }}>plants potential</div>
            <div style={{ fontSize: 11, color: GREEN, marginBottom: 4 }}>{fmtNum(plantFood)} kg food / yr</div>
            {plantAreaSqft > 0 && <div style={{ fontSize: 11, color: MUTED }}>{fmtNum(plantAreaSqft)} sq ft plantable</div>}
            <div style={{ fontSize: 11, color: MUTED }}>{fmtNum(plantCO2)} kg CO₂/yr</div>
          </div>

          {/* Rainwater */}
          <div style={{ background: CARD, borderRadius: 8, padding: 14, border: '0.5px solid ' + BORDER }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Droplets style={{ width: 14, height: 14, color: BLUE }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>Rainwater</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: BLUE, lineHeight: 1 }}>{fmtNum(rainKl)}</div>
            <div style={{ fontSize: 10, color: DIM, marginBottom: 6 }}>kL / year</div>
            <div style={{ fontSize: 11, color: GREEN, marginBottom: 4 }}>Rs.{fmtRs(rainSavings)} saved/yr</div>
            <div style={{ fontSize: 11, color: MUTED }}>{fmtNum(rainCatch)} sq ft catchment</div>
          </div>

          {/* Solar */}
          <div style={{ background: CARD, borderRadius: 8, padding: 14, border: '0.5px solid ' + BORDER }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sun style={{ width: 14, height: 14, color: AMBER }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>Solar</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: AMBER, lineHeight: 1 }}>{fmtNum(solarKwhLow)}–{fmtNum(solarKwhHigh)}</div>
            <div style={{ fontSize: 10, color: DIM, marginBottom: 6 }}>kWh / year</div>
            <div style={{ fontSize: 11, color: GREEN, marginBottom: 2 }}>Rs.{fmtRs(solarSavLow)}–Rs.{fmtRs(solarSavHigh)}/yr</div>
            <div style={{ fontSize: 10, color: 'rgba(240,240,232,0.3)', marginBottom: 4 }}>avg Rs.{fmtRs(solarSavings)} · seasonal range</div>
            <div style={{ fontSize: 11, color: MUTED }}>{fmtNum(solarKwp)} kWp installable</div>
            <div style={{ fontSize: 11, color: MUTED }}>{fmtNum(solarCO2)} kg CO₂ offset/yr</div>
          </div>

          {/* Biogas — conditional */}
          {biogas && (
            <div style={{ background: CARD, borderRadius: 8, padding: 14, border: '0.5px solid ' + BORDER }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Recycle style={{ width: 14, height: 14, color: TEAL }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>Biogas</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: TEAL, lineHeight: 1 }}>{biogasMonthly}</div>
              <div style={{ fontSize: 10, color: DIM, marginBottom: 6 }}>m³ / month</div>
              <div style={{ fontSize: 11, color: GREEN, marginBottom: 4 }}>Rs.{fmtRs(biogasSavings)} saved/yr</div>
              {lpgCylinders && <div style={{ fontSize: 11, color: MUTED }}>{lpgCylinders} LPG cylinders/yr equiv.</div>}
              <div style={{ fontSize: 11, color: MUTED }}>{biogasWaste} kg waste/day input</div>
              <div style={{ fontSize: 11, color: MUTED }}>{fmtNum(biogasCO2)} kg CO₂ offset/yr</div>
            </div>
          )}
        </div>
      </div>

      {/* Markdown fallback for unparseable reports */}
      {!parsed.parsedOk && reportText && (
        <div style={{ margin: '16px 24px 0', background: CARD, border: '0.5px solid ' + BORDER, borderRadius: 16, padding: 28 }}>
          <div className="rp-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportText}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* ── F: STRENGTHS + PROGRESS BARS ────────────────────────────────────── */}
      <PageDivider label="Your Profile & Gaps" />
      <div className="rp-page" style={{ padding: '0 24px', marginBottom: 16 }}>
        <div className="rp-strengths-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Strengths */}
          <div>
            <div style={{ fontSize: 10, color: GREEN, letterSpacing: '0.1em', opacity: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>Strengths Identified</div>
            {strengthItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {strengthItems.map((raw, i) => {
                  const { title, body } = parseTitle(raw);
                  const Icon = strengthIcon(title + ' ' + body);
                  return (
                    <div key={i} style={{ background: CARD, border: '0.5px solid ' + BORDER, borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <Icon style={{ width: 14, height: 14, color: MUTED, marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: TEXT, marginBottom: 2 }}>{title || 'Strength ' + (i + 1)}</div>
                        {body && <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>{body}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <SectionFallback text={parsed.strengths} />
            )}
          </div>

          {/* COM-B gap progress bars */}
          <div>
            <div style={{ fontSize: 10, color: GREEN, letterSpacing: '0.1em', opacity: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>Gap Analysis</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Capacity',      score: scores.capacity   ?? 0, inv: false, override: null,     oc: null     },
                { label: 'Motivation',    score: scores.motivation ?? 0, inv: false, override: null,     oc: null     },
                { label: 'Interest',      score: scores.interest   ?? 0, inv: false, override: null,     oc: null     },
                { label: 'Affordability', score: scores.barriers   ?? 0, inv: true,  override: null,     oc: null     },
                { label: 'Waste habit',   score: wh.score,               inv: false, override: wh.label, oc: wh.color },
              ].map(({ label, score, inv, override, oc }) => {
                const c   = oc || scoreColor(score, inv);
                const pct = inv ? (100 - score) : score;
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: MUTED }}>{label}</span>
                      <span style={{ fontSize: 11, color: c }}>{override ?? score}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                      <div style={{ height: 5, width: pct + '%', background: c, borderRadius: 3, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── G: TIMELINE — 3-phase roadmap ───────────────────────────────────── */}
      <PageDivider label="Your Roadmap" />
      {parsed.parsedOk && (
        <div className="rp-page" style={{ padding: '0 24px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: GREEN, letterSpacing: '0.1em', opacity: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>Sus10 Roadmap</div>
          <div className="rp-grid-3">
            {[
              { phase: 'PHASE 1 · 0–3 MONTHS',  title: 'Foundation', bullets: phases[0], accent: GREEN },
              { phase: 'PHASE 2 · 3–12 MONTHS', title: 'Install',    bullets: phases[1], accent: AMBER },
              { phase: 'PHASE 3 · 1–3 YEARS',   title: 'Optimise',  bullets: phases[2], accent: TEAL  },
            ].map(({ phase, title, bullets, accent }) => (
              <div key={phase} style={{ background: CARD, borderRadius: 8, padding: 14, border: '0.5px solid ' + BORDER, borderTop: '2px solid ' + accent }}>
                <div style={{ fontSize: 10, color: accent, letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>{phase}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 10 }}>{title}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(bullets && bullets.length ? bullets : ['Getting started', 'Initial steps', 'Planning phase', 'Next actions']).map((b, i) => (
                    <li key={i} style={{ fontSize: 11, color: MUTED, paddingLeft: 14, position: 'relative', lineHeight: 1.45 }}>
                      <span style={{ position: 'absolute', left: 0, color: accent, fontSize: 9, top: 2 }}>→</span>
                      {stripMd(b)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── H: ACTION STEPS — 3-col recommendations ─────────────────────────── */}
      {parsed.parsedOk && (
        <div className="rp-page" style={{ padding: '0 24px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: GREEN, letterSpacing: '0.1em', opacity: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>Top Recommendations</div>
          {recItems.length > 0 ? (
            <div className="rp-grid-3">
              {recItems.map((raw, i) => {
                const { title, body } = parseTitle(raw);
                const Icon    = recIcon(title + ' ' + body);
                const tags    = ['Highest impact', 'Time-sensitive', 'Your motivator'];
                const tagClrs = [GREEN, AMBER, TEAL];
                return (
                  <div key={i} style={{ background: CARD, border: '0.5px solid ' + BORDER, borderRadius: 8, padding: 14 }}>
                    <Icon style={{ width: 16, height: 16, color: MUTED, marginBottom: 8 }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 6 }}>{title || 'Recommendation ' + (i + 1)}</div>
                    <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.55, marginBottom: 8 }}>{body || '—'}</div>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: tagClrs[i] + '1a', color: tagClrs[i] }}>{tags[i] || 'Recommended'}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <SectionFallback text={parsed.recommendations} />
          )}
        </div>
      )}

      {/* ── I: FINAL ASSESSMENT + CTA ────────────────────────────────────────── */}
      {parsed.parsedOk && (
        <div className="rp-page" style={{ padding: '0 24px', marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: GREEN, letterSpacing: '0.1em', opacity: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>Final Assessment</div>
          <div className="rp-grid-3">
            {[
              { label: 'Readiness',             body: finalCards.readiness   },
              { label: 'Biggest Opportunity',   body: finalCards.opportunity },
              { label: 'One Action This Month', body: finalCards.action      },
            ].map(({ label, body }) => (
              <div key={label} style={{ background: CARD, borderRadius: 8, padding: 14, border: '0.5px solid ' + BORDER }}>
                <div style={{ fontSize: 10, color: DIM, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CtaBlock tier={tier} firstName={firstName} email={email} overallScore={overallScore} />

      {/* ── J: SOLUTION PARTNERS ────────────────────────────────────────────── */}
      <div style={{ marginTop: 24 }}>
        <VendorCards solar={solar} rainwater={rainwater} biogas={biogas} city={displayCity} firstName={firstName} />
      </div>

      {/* Disclaimer */}
      <div style={{ margin: '0 24px 16px', background: 'rgba(251,191,36,0.06)', borderLeft: '3px solid #d97706', borderRadius: '0 6px 6px 0', padding: '10px 12px' }}>
        <p style={{ fontSize: 11, color: 'rgba(240,240,232,0.45)', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(240,240,232,0.7)' }}>About these estimates:</strong>
          {' '}Calculated using MNRE solar data, IMD rainfall data, and CPCB waste norms. Indicative only — actual potential confirmed after a professional site assessment. Structural load, shade, roof slope, and local regulations need professional evaluation. Write to{' '}
          <a href="mailto:gp@sus10.ai" style={{ color: AMBER }}>gp@sus10.ai</a> with any questions.
        </p>
      </div>

      {/* Closing quote */}
      <div style={{ margin: '0 24px 24px', textAlign: 'center', paddingTop: 4 }}>
        <div style={{ fontSize: 13, color: 'rgba(240,240,232,0.45)', fontStyle: 'italic', lineHeight: 1.7 }}>
          &ldquo;Every roof has the potential to become a climate solution.&rdquo;
        </div>
        <div style={{ fontSize: 13, color: GREEN, fontWeight: 500, lineHeight: 1.7, marginTop: 4 }}>
          Your journey toward a Self-Sustaining Roof starts with one small step.
        </div>
      </div>

    </div>
  );
}
