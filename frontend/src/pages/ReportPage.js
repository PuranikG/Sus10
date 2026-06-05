import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Loader2, Leaf, Sun, Droplets, Recycle, Sprout,
  Mail, Building2, ArrowRight, TrendingUp,
  Zap, CloudRain, Heart, Users, CheckCircle2, DollarSign,
} from 'lucide-react';
import { apiRequest } from '../lib/utils';

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG     = '#0d1710';
const CARD   = '#0f1f11';
const BORDER = 'rgba(255,255,255,0.07)';
const GREEN  = '#4ade80';
const TEXT   = '#f0f0e8';
const MUTED  = 'rgba(240,240,232,0.5)';
const DIM    = 'rgba(240,240,232,0.35)';
const AMBER  = '#fbbf24';
const BLUE   = '#60a5fa';
const TEAL   = '#34d399';
const LIME   = '#a3e635';
const RED    = '#f87171';
const NAV_BG = '#0a1209';

const TIER_COLORS = {
  'Explorer':               RED,
  'Getting Ready':          AMBER,
  'Action Ready':           GREEN,
  'Sustainability Champion':'#00c96e',
};

// Universal consultation CTA — single text for all tiers in research phase
const UNIVERSAL_CTA_TEXT = 'Connect with us for a 1:1 Consultation';

// ── Number helpers ────────────────────────────────────────────────────────────
const fmtRs  = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const fmtNum = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));

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

// ── Report-text parser ────────────────────────────────────────────────────────
function parseReportText(text) {
  if (!text) return { parsedOk: false, raw: '' };
  // Match numbered section headers in various markdown forms
  const HEADER_RE = /(?:^|\n)[ \t]*(?:#{1,3}[ \t]+)?(?:\*{1,2})?(\d+)\.[ \t]+([^\n*#]{3,80}?)(?:\*{1,2})?[ \t]*(?=\n|$)/g;
  const headers = [];
  let m;
  while ((m = HEADER_RE.exec(text)) !== null) {
    headers.push({ num: parseInt(m[1]), headerStart: m.index, headerEnd: m.index + m[0].length });
  }
  if (headers.length < 3) return { parsedOk: false, raw: text };
  const sec = {};
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].headerEnd;
    const end   = i + 1 < headers.length ? headers[i + 1].headerStart : text.length;
    sec[headers[i].num] = text.slice(start, end).trim();
  }
  return {
    parsedOk:        true,
    raw:             text,
    strengths:       sec[3] || '',
    recommendations: sec[5] || '',
    roadmap:         sec[7] || '',
    finalAssessment: sec[9] || '',
  };
}

function extractBullets(text, max) {
  max = max || 3;
  if (!text) return [];
  const out = [];
  for (const line of text.split('\n')) {
    if (out.length >= max) break;
    const t  = line.trim();
    if (!t || t.startsWith('#')) continue;
    const bm = t.match(/^[-*•✓]\s+(.+)$/) || t.match(/^\d+[.)]\s+(.+)$/);
    if (bm) out.push(bm[1].trim());
  }
  return out;
}

// Strip markdown bold/italic markers from display text
const stripMd = s => (s || '').replace(/\*{1,3}/g, '').trim();

function parseTitle(raw) {
  if (!raw) return { title: '', body: '' };
  // **Title**: body  or  **Title** body
  let m = raw.match(/^\*\*([^*]{3,60})\*\*\s*:?\s*(.*)$/s);
  if (m) return { title: m[1].trim(), body: stripMd(m[2]) };
  // Title: body (colon-separated, title < 60 chars)
  m = raw.match(/^([^:]{5,60}):\s*(.{10,})$/s);
  if (m) return { title: stripMd(m[1]), body: stripMd(m[2]) };
  // Fallback: first 5 words as title, rest as body
  const clean = stripMd(raw);
  const words = clean.split(' ').filter(Boolean);
  return { title: words.slice(0, Math.min(5, words.length)).join(' '), body: clean };
}

function extractPhases(roadmapText) {
  if (!roadmapText) return [[], [], []];
  const PHASE_RE = /(?:^|\n)[ \t]*(?:#{1,3}[ \t]+)?(?:\*{0,2})?(?:Phase\s*[123]|PHASE\s*[123])(?:\*{0,2})?[ \t]*:?[^\n]*(?=\n|$)/gi;
  const splits = [];
  let pm;
  while ((pm = PHASE_RE.exec(roadmapText)) !== null) splits.push(pm.index + pm[0].length);
  if (splits.length >= 3) {
    return [
      extractBullets(roadmapText.slice(splits[0], splits[1]), 4),
      extractBullets(roadmapText.slice(splits[1], splits[2]), 4),
      extractBullets(roadmapText.slice(splits[2]), 4),
    ];
  }
  const all = extractBullets(roadmapText, 12);
  return [all.slice(0, 4), all.slice(4, 8), all.slice(8, 12)];
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

// ── Shared primitives ─────────────────────────────────────────────────────────
function SecLabel({ children }) {
  return (
    <div style={{ fontSize: 10, color: GREEN, letterSpacing: '0.1em', opacity: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

function PageDivider({ label }) {
  return (
    <div style={{ margin: '16px 24px' }}>
      <div style={{ borderTop: '0.5px solid ' + BORDER }} />
      <div style={{ fontSize: 10, color: 'rgba(240,240,232,0.2)', letterSpacing: '0.06em', textAlign: 'center', marginTop: 8, textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

function InfoCard({ Icon, title, body, tagText, tagGreen }) {
  tagGreen = tagGreen !== false;
  return (
    <div style={{ background: CARD, border: '0.5px solid ' + BORDER, borderRadius: 8, padding: 12 }}>
      <Icon style={{ width: 16, height: 16, color: MUTED, marginBottom: 6 }} />
      <div style={{ fontSize: 12, fontWeight: 500, color: TEXT, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.55, marginBottom: 6 }}>{body || '—'}</div>
      <span style={{
        display: 'inline-block', fontSize: 10, padding: '2px 7px', borderRadius: 8,
        background: tagGreen ? 'rgba(74,222,128,0.12)' : 'rgba(251,191,36,0.12)',
        color: tagGreen ? GREEN : AMBER,
      }}>{tagText}</span>
    </div>
  );
}

// ── Section markdown fallback ─────────────────────────────────────────────────
// Used when bullet extraction yields no items but section text exists.
// Raw markdown is always better than truncated / garbled placeholders.
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

// ── Loading / Error ───────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
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
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
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

// ── B5: Share bar ─────────────────────────────────────────────────────────────
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
    navigator.share({
      title: 'My Sus10 Rooftop Report',
      text: decodeURIComponent(waMsg),
      url: window.location.href,
    }).catch(() => {});
  };

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 16, fontSize: 12,
    cursor: 'pointer', background: 'transparent', fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, padding: '8px 24px', margin: '12px 0 0' }}>
      {typeof navigator !== 'undefined' && navigator.share ? (
        <button onClick={handleNativeShare} style={{ ...btnBase, border: '0.5px solid rgba(37,211,102,0.4)', color: '#25d366' }}>
          Share →
        </button>
      ) : (
        <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnBase, border: '0.5px solid rgba(37,211,102,0.4)', color: '#25d366', textDecoration: 'none' }}>
          📲 Share on WhatsApp
        </a>
      )}
      <button onClick={handleCopy} style={{ ...btnBase, border: '0.5px solid rgba(255,255,255,0.15)', color: copied ? GREEN : 'rgba(240,240,232,0.6)' }}>
        {copied ? 'Copied! ✓' : 'Copy link'}
      </button>
    </div>
  );
}

// ── B4: Vendor category cards ─────────────────────────────────────────────────
// Order: Greening first (lowest barrier), then Rainwater, then Solar (aspiration), Biogas last
const VENDOR_CATEGORIES = [
  {
    key: 'greening',
    icon: '🌿',
    name: 'Rooftop Farming',
    desc: 'Expert guidance on terrace gardens and container farms',
    subjectFn: (city, name) => `Vendor referral — Rooftop Farming — ${city} — ${name}`,
  },
  {
    key: 'rainwater',
    icon: '💧',
    name: 'Rainwater Harvesting',
    desc: 'RWH design, tank sizing, plumbing integration',
    subjectFn: (city, name) => `Vendor referral — RWH — ${city} — ${name}`,
  },
  {
    key: 'solar',
    icon: '☀️',
    name: 'Solar Installation',
    desc: 'MNRE-empanelled solar vendors, net-metering support',
    subjectFn: (city, name) => `Vendor referral — Solar — ${city} — ${name}`,
  },
  {
    key: 'biogas',
    icon: '♻️',
    name: 'Biogas System',
    desc: 'Small-scale biogas for households with organic waste',
    subjectFn: (city, name) => `Vendor referral — Biogas — ${city} — ${name}`,
  },
];

function VendorCards({ solar, rainwater, biogas, city, firstName }) {
  const toShow = VENDOR_CATEGORIES.filter(c => {
    if (c.key === 'biogas') return !!biogas;
    return true; // always show solar, rainwater, greening
  }).slice(0, 3);

  if (!toShow.length) return null;

  const cardStyle = {
    background: CARD, border: '0.5px solid ' + BORDER,
    borderRadius: 8, padding: 14,
  };

  return (
    <div style={{ padding: '0 24px', marginBottom: 16 }}>
      <SecLabel>Find Help Near You</SecLabel>
      <div className="rp-grid-3">
        {toShow.map(cat => {
          const subject = encodeURIComponent(cat.subjectFn(city || 'your city', firstName || 'homeowner'));
          const body    = encodeURIComponent(`Hi, I just received my Sus10 sustainability report and I'm interested in ${cat.name}. Please connect me with a verified vendor.`);
          return (
            <div key={cat.key} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{cat.name}</span>
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 10, lineHeight: 1.55 }}>{cat.desc}</div>
              <a
                href={`mailto:gp@sus10.ai?subject=${subject}&body=${body}`}
                style={{
                  display: 'block', width: '100%', textAlign: 'center',
                  padding: '8px', fontSize: 12, color: GREEN,
                  border: '0.5px solid ' + GREEN, borderRadius: 16,
                  textDecoration: 'none', boxSizing: 'border-box',
                }}
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

// ── Main page ─────────────────────────────────────────────────────────────────
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

  const firstName    = answers.first_name || 'Your';
  const email        = answers.email      || '';
  const city         = inputsSqft.city    || answers.city  || '';
  const state        = answers.state      || '';
  // city is stored lowercase after backend normalisation — re-capitalise for display
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
  // Savings range for impact hero (solar low/high + fixed rain + fixed biogas)
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

  // ── Pillar numbers ──────────────────────────────────────────────────────────
  const solarKwh     = solar.annual_generation_kwh  || 0;
  const solarSavings = solar.annual_savings_inr     || 0;
  const solarKwp     = solar.installed_capacity_kwp || 0;
  const solarCO2     = solar.co2_offset_kg_per_year || 0;
  // Solar range (50-60% of terrace) — from B1d sprint
  const solarKwhLow     = solar.kwh_low         || Math.round(solarKwh * 0.909);
  const solarKwhHigh    = solar.kwh_high        || Math.round(solarKwh * 1.091);
  const solarSavLow     = solar.savings_low_inr || Math.round(solarSavings * 0.909);
  const solarSavHigh    = solar.savings_high_inr|| Math.round(solarSavings * 1.091);

  const rainKl       = rainwater.annual_yield_kiloliters || 0;
  const rainSavings  = rainwater.annual_savings_inr      || 0;
  const rainCatch    = Math.round((rainwater.catchment_area_sqm || 0) * 10.764) || terraceSqft;

  const biogasMonthly = biogas ? Math.round(biogas.biogas_m3_per_day * 30 * 10) / 10 : 0;
  const biogasSavings = (biogas && biogas.annual_savings_inr)     || 0;
  const biogasWaste   = (biogas && biogas.daily_organic_waste_kg) || 0;
  const biogasCO2     = (biogas && biogas.co2_offset_kg_per_year) || 0;

  const plantCount    = plantation.total_plants_count              || 0;
  const plantFood     = plantation.annual_food_yield_kg            || 0;
  const plantAreaSqft = Math.round((plantation.effective_area_sqm || 0) * 10.764);
  const plantCO2      = plantation.co2_sequestered_kg_per_year     || 0;

  // ── Parse report text ───────────────────────────────────────────────────────
  const parsed        = parseReportText(reportText);
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

  // Tier pill bg (transparent tint of tier color)
  const tierBg = tierColor === AMBER  ? 'rgba(251,191,36,0.12)'
               : tierColor === GREEN  ? 'rgba(74,222,128,0.12)'
               : tierColor === RED    ? 'rgba(248,113,113,0.12)'
               : 'rgba(0,201,110,0.12)';

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Global styles ───────────────────────────────────────────────────── */}
      <style>{`
        .rp-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
        .rp-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;align-items:start}
        .rp-grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;align-items:start}
        @media(max-width:600px){
          .rp-grid-4{grid-template-columns:repeat(2,1fr)}
          .rp-grid-3{grid-template-columns:1fr}
          .rp-grid-2{grid-template-columns:1fr}
        }
        @media print{
          .rp-nav{display:none!important}
          .rp-cta{display:none!important}
          body{background:#0d1710!important;color:#f0f0e8!important}
          .rp-page{break-inside:avoid}
        }
        .rp-md p{color:rgba(240,240,232,0.7);font-size:14px;line-height:1.75;margin-bottom:.9em}
        .rp-md h1,.rp-md h2,.rp-md h3{color:#f0f0e8;font-family:'Playfair Display',Georgia,serif;margin-top:1.4em;margin-bottom:.4em}
        .rp-md ul,.rp-md ol{color:rgba(240,240,232,0.7);font-size:14px;line-height:1.75;padding-left:1.4em;margin-bottom:.9em}
        .rp-md li{margin-bottom:.25em}
        .rp-md strong{color:#f0f0e8}
        .rp-md hr{border:none;border-top:1px solid rgba(255,255,255,0.07);margin:1.2em 0}
        .rp-md blockquote{border-left:3px solid #4ade80;padding-left:12px;color:rgba(240,240,232,0.5);margin:1em 0;font-style:italic}
      `}</style>

      {/* ── 1. NAV BAR ──────────────────────────────────────────────────────── */}
      <div className="rp-nav" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: NAV_BG, height: 44, padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '0.5px solid ' + BORDER,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Leaf style={{ color: GREEN, width: 17, height: 17 }} />
          <span style={{ fontSize: 14, fontFamily: "'Playfair Display', serif", fontWeight: 700, color: TEXT }}>
            Sus10 AI
          </span>
        </div>
        <button
          onClick={() => window.print()}
          style={{
            background: 'transparent', border: '1px solid ' + GREEN, color: GREEN,
            fontSize: 12, padding: '6px 14px', borderRadius: 16, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ↓ Download PDF
        </button>
      </div>

      {/* ── 2. HERO HEADER ──────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 24px 16px' }}>
        {/* Eyebrow */}
        <div style={{ fontSize: 11, color: GREEN, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          Sus10 AI · Home Sustainability Report
        </div>
        {/* Name */}
        <div style={{ fontSize: 26, fontWeight: 500, color: TEXT, lineHeight: 1.2, marginBottom: 6, fontFamily: "'Playfair Display', serif" }}>
          {firstName}&apos;s Rooftop Potential
        </div>
        {/* Meta */}
        {metaLine && (
          <div style={{ fontSize: 12, color: 'rgba(240,240,232,0.4)', marginBottom: 16 }}>
            {metaLine}
          </div>
        )}
        {/* Tier pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: tierBg,
          border: '0.5px solid ' + tierColor + '55',
          borderRadius: 20, padding: '5px 12px',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: tierColor, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: tierColor }}>{tier}</span>
          <span style={{ fontSize: 12, color: MUTED }}>· {overallScore} / 100</span>
        </div>
      </div>

      {/* ── 3. IMPACT HERO BLOCK ─────────────────────────────────────────────── */}
      <div style={{ margin: '0 24px', background: CARD, border: '0.5px solid rgba(74,222,128,0.15)', borderRadius: 10, padding: 16 }}>
        {/* Headline */}
        <p style={{ fontSize: 14, lineHeight: 1.65, color: TEXT, margin: '0 0 12px' }}>
          If {firstName} activated their rooftop fully, it could save{' '}
          <span style={{ color: GREEN, fontWeight: 500 }}>Rs.{fmtRs(totalSavLow)} – Rs.{fmtRs(totalSavHigh)} per year</span>
          {' '}— while offsetting{' '}
          <span style={{ color: GREEN, fontWeight: 500 }}>{fmtNum(co2Total)} kg of CO₂</span>
          , the same as planting{' '}
          <span style={{ color: GREEN, fontWeight: 500 }}>{fmtNum(trees)} trees</span>
          {' '}annually.
        </p>
        {/* Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            plantFood ? { label: '🌿 Food',      value: fmtNum(plantFood) + ' kg/yr' } : null,
            { label: '💧 Rainwater', value: fmtNum(rainKl) + ' kL/yr' },
            { label: '☀️ Solar',     value: fmtNum(solarKwhLow) + '–' + fmtNum(solarKwhHigh) + ' kWh/yr' },
            { label: '🌍 CO₂ offset', value: (co2Total / 1000).toFixed(1) + ' t/yr' },
          ].filter(Boolean).map(chip => (
            <span key={chip.label} style={{
              background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '3px 10px', fontSize: 11,
            }}>
              <span style={{ color: 'rgba(240,240,232,0.65)' }}>{chip.label}</span>
              {'  '}
              <span style={{ color: TEXT, fontWeight: 500 }}>{chip.value}</span>
            </span>
          ))}
        </div>
      </div>

      {/* R03 — very interested: show CTA above report body too */}
      {flags.R03 && (
        <div style={{ marginTop: 16 }}>
          <CtaBlock tier={tier} firstName={firstName} email={email} overallScore={overallScore} />
        </div>
      )}

      {/* ── B5. SHARE BAR ────────────────────────────────────────────────────── */}
      <ShareBar firstName={firstName} totalSavings={totalSavings} trees={trees} />

      {/* ── 4. SCORE STRIP ───────────────────────────────────────────────────── */}
      <div className="rp-grid-4 rp-page" style={{ margin: '16px 24px 0' }}>
        {[
          { label: 'CAPACITY',   score: scores.capacity   != null ? scores.capacity   : 0, inv: false },
          { label: 'MOTIVATION', score: scores.motivation != null ? scores.motivation : 0, inv: false },
          { label: 'INTEREST',   score: scores.interest   != null ? scores.interest   : 0, inv: false },
          { label: 'BARRIERS',   score: scores.barriers   != null ? scores.barriers   : 0, inv: true  },
        ].map(({ label, score, inv }) => {
          const c = scoreColor(score, inv);
          return (
            <div key={label} style={{ background: CARD, borderRadius: 8, padding: '10px 8px', textAlign: 'center', border: '0.5px solid ' + BORDER }}>
              <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: c, margin: '4px 0 2px', lineHeight: 1 }}>{score}</div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 6 }}>
                <div style={{ height: 3, width: score + '%', background: c, borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 5. PILLAR CARDS ──────────────────────────────────────────────────── */}
      {/* Greening first — lowest barrier, emotional hook. Then Rainwater, Solar, Biogas last. */}
      <div className={'rp-page ' + (biogas ? 'rp-grid-2' : 'rp-grid-3')} style={{ margin: '12px 24px 0' }}>

        {/* Greening — always first (top-left) */}
        <div style={{ background: CARD, borderRadius: 8, padding: 12, border: '0.5px solid ' + BORDER }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(163,230,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sprout style={{ width: 14, height: 14, color: LIME }} />
            </div>
            <span style={{ fontSize: 11, color: MUTED }}>Greening</span>
          </div>
          <span style={{ fontSize: 22, fontWeight: 500, color: LIME }}>{fmtNum(plantCount)}</span>
          <span style={{ fontSize: 10, color: DIM, marginLeft: 4 }}>plants</span>
          <div style={{ fontSize: 11, color: GREEN, marginTop: 4 }}>{fmtNum(plantFood)} kg food/yr</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', fontSize: 11, color: 'rgba(240,240,232,0.55)' }}>
            <li>{fmtNum(plantAreaSqft)} sq ft plantable</li>
            <li>{fmtNum(plantCO2)} kg CO₂/yr</li>
          </ul>
        </div>

        {/* Rainwater */}
        <div style={{ background: CARD, borderRadius: 8, padding: 12, border: '0.5px solid ' + BORDER }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Droplets style={{ width: 14, height: 14, color: BLUE }} />
            </div>
            <span style={{ fontSize: 11, color: MUTED }}>Rainwater</span>
          </div>
          <span style={{ fontSize: 22, fontWeight: 500, color: BLUE }}>{fmtNum(rainKl)}</span>
          <span style={{ fontSize: 10, color: DIM, marginLeft: 4 }}>kL / year</span>
          <div style={{ fontSize: 11, color: GREEN, marginTop: 4 }}>~Rs.{fmtRs(rainSavings)} saved/yr</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', fontSize: 11, color: 'rgba(240,240,232,0.55)' }}>
            <li>{fmtNum(rainCatch)} sq ft catchment</li>
            <li>Covers household water needs</li>
          </ul>
        </div>

        {/* Solar — aspirational, shown third */}
        <div style={{ background: CARD, borderRadius: 8, padding: 12, border: '0.5px solid ' + BORDER }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sun style={{ width: 14, height: 14, color: AMBER }} />
            </div>
            <span style={{ fontSize: 11, color: MUTED }}>Solar</span>
          </div>
          <span style={{ fontSize: 22, fontWeight: 500, color: AMBER }}>{fmtNum(solarKwhLow)}–{fmtNum(solarKwhHigh)}</span>
          <span style={{ fontSize: 10, color: DIM, marginLeft: 4 }}>kWh / year</span>
          <div style={{ fontSize: 11, color: GREEN, marginTop: 4 }}>Rs.{fmtRs(solarSavLow)} – Rs.{fmtRs(solarSavHigh)} / year</div>
          <div style={{ fontSize: 10, color: 'rgba(240,240,232,0.35)', marginTop: 2 }}>avg ~Rs.{fmtRs(solarSavings)} · seasonal range</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', fontSize: 11, color: 'rgba(240,240,232,0.55)' }}>
            <li>{fmtNum(solarKwp)} kWp installable</li>
            <li>{fmtNum(solarCO2)} kg CO₂ offset/yr</li>
          </ul>
        </div>

        {/* Biogas — last, only when not null */}
        {biogas && (
          <div style={{ background: CARD, borderRadius: 8, padding: 12, border: '0.5px solid ' + BORDER }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Recycle style={{ width: 14, height: 14, color: TEAL }} />
              </div>
              <span style={{ fontSize: 11, color: MUTED }}>Biogas</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 500, color: TEAL }}>{biogasMonthly}</span>
            <span style={{ fontSize: 10, color: DIM, marginLeft: 4 }}>m³ / month</span>
            <div style={{ fontSize: 11, color: GREEN, marginTop: 4 }}>~Rs.{fmtRs(biogasSavings)} saved/yr</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', fontSize: 11, color: 'rgba(240,240,232,0.55)' }}>
              <li>{biogasWaste} kg waste/day input</li>
              <li>{fmtNum(biogasCO2)} kg CO₂ offset/yr</li>
            </ul>
          </div>
        )}
      </div>

      {/* ── FALLBACK: raw markdown when parsing failed ────────────────────────── */}
      {!parsed.parsedOk && reportText && (
        <div style={{ margin: '16px 24px 0', background: CARD, border: '0.5px solid ' + BORDER, borderRadius: 16, padding: 28 }}>
          <div className="rp-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportText}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* ── PAGE 2 DIVIDER ──────────────────────────────────────────────────── */}
      <PageDivider label="Page 2 of 3 — Your Profile" />

      {/* ── 7. STRENGTHS ─────────────────────────────────────────────────────── */}
      {parsed.parsedOk && (
        <div className="rp-page" style={{ padding: '0 24px', marginBottom: 16 }}>
          <SecLabel>Strengths Identified</SecLabel>
          {strengthItems.length > 0 ? (
            <div className="rp-grid-3">
              {strengthItems.map((raw, i) => {
                const { title, body } = parseTitle(raw);
                const Icon = strengthIcon(title + ' ' + body);
                return <InfoCard key={i} Icon={Icon} title={title || ('Strength ' + (i + 1))} body={body} tagText="Strength" tagGreen={true} />;
              })}
            </div>
          ) : (
            <SectionFallback text={parsed.strengths} />
          )}
        </div>
      )}

      {/* ── 8. GAP ANALYSIS BARS ─────────────────────────────────────────────── */}
      <div className="rp-page" style={{ padding: '0 24px', marginBottom: 16 }}>
        <SecLabel>Gap Analysis</SecLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Capacity',      score: scores.capacity   != null ? scores.capacity   : 0, inv: false, override: null,     oc: null   },
            { label: 'Motivation',    score: scores.motivation != null ? scores.motivation : 0, inv: false, override: null,     oc: null   },
            { label: 'Interest',      score: scores.interest   != null ? scores.interest   : 0, inv: false, override: null,     oc: null   },
            { label: 'Affordability', score: scores.barriers   != null ? scores.barriers   : 0, inv: true,  override: null,     oc: null   },
            { label: 'Waste habit',   score: wh.score,                                           inv: false, override: wh.label, oc: wh.color },
          ].map(({ label, score, inv, override, oc }) => {
            const c = oc || scoreColor(score, inv);
            return (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 44px', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'rgba(240,240,232,0.45)', whiteSpace: 'nowrap' }}>{label}</span>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                  <div style={{ height: 4, width: score + '%', background: c, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: c, textAlign: 'right' }}>{override != null ? override : score}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 9. RECOMMENDATIONS ───────────────────────────────────────────────── */}
      {parsed.parsedOk && (
        <div className="rp-page" style={{ padding: '0 24px', marginBottom: 16 }}>
          <SecLabel>Top Recommendations</SecLabel>
          {recItems.length > 0 ? (
            <div className="rp-grid-3">
              {recItems.map((raw, i) => {
                const { title, body } = parseTitle(raw);
                const Icon = recIcon(title + ' ' + body);
                const tags  = ['Highest impact', 'Time-sensitive', 'Your motivator'];
                const isAmber = [false, true, false];
                return <InfoCard key={i} Icon={Icon} title={title || ('Recommendation ' + (i + 1))} body={body} tagText={tags[i] || 'Recommended'} tagGreen={!isAmber[i]} />;
              })}
            </div>
          ) : (
            <SectionFallback text={parsed.recommendations} />
          )}
        </div>
      )}

      {/* ── PAGE 3 DIVIDER ──────────────────────────────────────────────────── */}
      <PageDivider label="Page 3 of 3 — Your Roadmap" />

      {/* ── 11. ROADMAP ──────────────────────────────────────────────────────── */}
      {parsed.parsedOk && (
        <div className="rp-page" style={{ padding: '0 24px', marginBottom: 16 }}>
          <SecLabel>Sus10 Roadmap</SecLabel>
          <div className="rp-grid-3">
            {[
              { phase: 'PHASE 1 · 0-3 MONTHS',  title: 'Foundation', bullets: phases[0] },
              { phase: 'PHASE 2 · 3-12 MONTHS', title: 'Install',    bullets: phases[1] },
              { phase: 'PHASE 3 · 1-3 YEARS',   title: 'Optimise',  bullets: phases[2] },
            ].map(({ phase, title, bullets }) => (
              <div key={phase} style={{ background: CARD, borderRadius: 8, padding: 12, border: '0.5px solid ' + BORDER }}>
                <div style={{ fontSize: 10, color: GREEN, letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>{phase}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: TEXT, marginBottom: 6 }}>{title}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {(bullets && bullets.length ? bullets : ['Getting started', 'Initial steps', 'Planning phase', 'Next actions']).map((b, i) => (
                    <li key={i} style={{ fontSize: 11, color: MUTED, padding: '2px 0 2px 14px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: GREEN, fontSize: 9 }}>→</span>
                      {stripMd(b)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 12. FINAL ASSESSMENT ─────────────────────────────────────────────── */}
      {parsed.parsedOk && (
        <div className="rp-page" style={{ padding: '0 24px', marginBottom: 16 }}>
          <SecLabel>Final Assessment</SecLabel>
          <div className="rp-grid-3">
            {[
              { label: 'Readiness',            body: finalCards.readiness   },
              { label: 'Biggest Opportunity',  body: finalCards.opportunity },
              { label: 'One Action This Month', body: finalCards.action      },
            ].map(({ label, body }) => (
              <div key={label} style={{ background: CARD, borderRadius: 8, padding: 12, border: '0.5px solid ' + BORDER }}>
                <div style={{ fontSize: 10, color: DIM, marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.55 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── B4. VENDOR CARDS ─────────────────────────────────────────────────── */}
      <VendorCards solar={solar} rainwater={rainwater} biogas={biogas} city={displayCity} firstName={firstName} />

      {/* ── 13. DISCLAIMER ───────────────────────────────────────────────────── */}
      <div style={{ margin: '0 24px', marginBottom: 16, background: 'rgba(251,191,36,0.06)', borderLeft: '3px solid #d97706', borderRadius: '0 6px 6px 0', padding: '10px 12px' }}>
        <p style={{ fontSize: 11, color: 'rgba(240,240,232,0.45)', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(240,240,232,0.7)' }}>About these estimates:</strong>
          {' '}Calculated using MNRE solar data, IMD rainfall data, and CPCB waste norms. Indicative only — actual potential confirmed after a professional site assessment. Structural load, shade, roof slope, and local regulations need professional evaluation. Write to{' '}
          <a href="mailto:gp@sus10.ai" style={{ color: AMBER }}>gp@sus10.ai</a>
          {' '}with any questions.
        </p>
      </div>

      {/* ── 14. CLOSING QUOTE ─────────────────────────────────────────────────── */}
      <div style={{ margin: '0 24px', textAlign: 'center', paddingTop: 4, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'rgba(240,240,232,0.45)', fontStyle: 'italic', lineHeight: 1.7 }}>
          &ldquo;Every roof has the potential to become a climate solution.&rdquo;
        </div>
        <div style={{ fontSize: 13, color: GREEN, fontWeight: 500, lineHeight: 1.7 }}>
          Your journey toward a Self-Sustaining Roof starts with one small step.
        </div>
      </div>

      {/* ── 15. CTA BLOCK (bottom) ────────────────────────────────────────────── */}
      <CtaBlock tier={tier} firstName={firstName} email={email} overallScore={overallScore} />

      {/* Bottom padding */}
      <div style={{ height: 24 }} />
    </div>
  );
}
