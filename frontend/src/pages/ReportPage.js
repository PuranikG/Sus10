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

const CTA_TEXTS = {
  'Explorer':               'Join our free awareness session →',
  'Getting Ready':          'Book a free consultation →',
  'Action Ready':           'Connect with a verified installer →',
  'Sustainability Champion':'Join the Sus10 pilot programme →',
};

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

function ctaText(tier, flags) {
  if (flags && flags.R09) return 'Talk to your Society committee or building owner →';
  return CTA_TEXTS[tier] || CTA_TEXTS['Getting Ready'];
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

function parseTitle(raw) {
  if (!raw) return { title: '', body: '' };
  const trunc = s => (s.length > 120 ? s.slice(0, 120) + '…' : s);
  let m = raw.match(/^\*\*([^*]{3,60})\*\*\s*:?\s*(.*)$/s);
  if (m) return { title: m[1].trim(), body: trunc(m[2].replace(/\*{1,2}/g, '').trim()) };
  m = raw.match(/^([^:]{5,60}):\s*(.{10,})$/s);
  if (m) return { title: m[1].replace(/\*{1,2}/g, '').trim(), body: trunc(m[2].replace(/\*{1,2}/g, '').trim()) };
  const clean = raw.replace(/\*{1,2}/g, '');
  const words = clean.split(' ').filter(Boolean);
  return { title: words.slice(0, Math.min(5, words.length)).join(' '), body: trunc(clean) };
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
  const clean = s => (s || '').replace(/\*{1,2}/g, '').trim().slice(0, 200);
  const sents = faText.match(/[^.!?]+[.!?]+/g) || [];
  if (!sents.length) return def;
  const opp    = sents.find(s => /opportunit|biggest|highest|strong|potential|best bet/i.test(s)) || sents[1] || sents[0];
  const action = sents.find(s => /this month|one action|first step|start with|recommend|next step/i.test(s)) || sents[sents.length - 1];
  return {
    readiness:   clean(sents[0]) || def.readiness,
    opportunity: clean(opp)      || def.opportunity,
    action:      clean(action)   || def.action,
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
function CtaBlock({ tier, flags, firstName, email }) {
  const text     = ctaText(tier, flags);
  const subject  = encodeURIComponent('Sus10 Consultation Request — ' + firstName);
  const bodyTxt  = encodeURIComponent('Hi, I just received my Sus10 sustainability report and would like to book a free consultation.');
  return (
    <div className="rp-cta" style={{ margin: '14px 24px 0', background: CARD, border: '0.5px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>Ready to turn your rooftop into a climate solution?</div>
      <a
        href={'mailto:gp@sus10.ai?subject=' + subject + '&body=' + bodyTxt}
        style={{ display: 'inline-block', background: GREEN, color: NAV_BG, fontSize: 13, fontWeight: 500, padding: '10px 28px', borderRadius: 20, textDecoration: 'none' }}
      >
        {text}
      </a>
      {email && (
        <div style={{ fontSize: 11, color: 'rgba(240,240,232,0.25)', marginTop: 8 }}>
          A copy of this report has been sent to {email}
        </div>
      )}
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
    city && state ? city + ', ' + state : (city || state),
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
        .rp-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .rp-grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
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
          <span style={{ color: GREEN, fontWeight: 500 }}>Rs.{fmtRs(totalSavings)}/year</span>
          {' '}— while offsetting{' '}
          <span style={{ color: GREEN, fontWeight: 500 }}>{fmtNum(co2Total)} kg of CO₂</span>
          , the same as planting{' '}
          <span style={{ color: GREEN, fontWeight: 500 }}>{fmtNum(trees)} trees</span>
          {' '}annually.
        </p>
        {/* Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { label: 'Solar',      value: fmtNum(solarKwh) + ' kWh/yr' },
            { label: 'Rainwater',  value: fmtNum(rainKl)   + ' kL/yr'  },
            plantFood ? { label: 'Food', value: fmtNum(plantFood) + ' kg/yr' } : null,
            { label: 'CO₂ offset', value: (co2Total / 1000).toFixed(1) + ' t/yr' },
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
          <CtaBlock tier={tier} flags={flags} firstName={firstName} email={email} />
        </div>
      )}

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
      <div className={'rp-page ' + (biogas ? 'rp-grid-2' : 'rp-grid-3')} style={{ margin: '12px 24px 0' }}>

        {/* Solar */}
        <div style={{ background: CARD, borderRadius: 8, padding: 12, border: '0.5px solid ' + BORDER }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sun style={{ width: 14, height: 14, color: AMBER }} />
            </div>
            <span style={{ fontSize: 11, color: MUTED }}>Solar</span>
          </div>
          <span style={{ fontSize: 22, fontWeight: 500, color: AMBER }}>{fmtNum(solarKwh)}</span>
          <span style={{ fontSize: 10, color: DIM, marginLeft: 4 }}>kWh / year</span>
          <div style={{ fontSize: 11, color: GREEN, marginTop: 4 }}>~Rs.{fmtRs(solarSavings)} saved/yr</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', fontSize: 11, color: 'rgba(240,240,232,0.55)' }}>
            <li>{fmtNum(solarKwp)} kWp installable</li>
            <li>{fmtNum(solarCO2)} kg CO₂ offset/yr</li>
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

        {/* Biogas — only when not null */}
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

        {/* Greening — always shown */}
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
          <div className="rp-grid-3">
            {(strengthItems.length ? strengthItems : [
              'Roof access and available space',
              'Personal motivation to act',
              'Access to vendors and services',
            ]).map((raw, i) => {
              const { title, body } = parseTitle(raw);
              const Icon = strengthIcon(title + ' ' + body);
              return <InfoCard key={i} Icon={Icon} title={title || ('Strength ' + (i + 1))} body={body} tagText="Strength" tagGreen={true} />;
            })}
          </div>
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
          <div className="rp-grid-3">
            {(recItems.length ? recItems : [
              'Install solar panels on your rooftop',
              'Set up rainwater harvesting system',
              'Start a container terrace garden',
            ]).map((raw, i) => {
              const { title, body } = parseTitle(raw);
              const Icon = recIcon(title + ' ' + body);
              const tags  = ['Highest impact', 'Time-sensitive', 'Your motivator'];
              const isAmber = [false, true, false];
              return <InfoCard key={i} Icon={Icon} title={title || ('Recommendation ' + (i + 1))} body={body} tagText={tags[i] || 'Recommended'} tagGreen={!isAmber[i]} />;
            })}
          </div>
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
                      {b.length > 40 ? b.slice(0, 40) + '…' : b}
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
      <CtaBlock tier={tier} flags={flags} firstName={firstName} email={email} />

      {/* Bottom padding */}
      <div style={{ height: 24 }} />
    </div>
  );
}
