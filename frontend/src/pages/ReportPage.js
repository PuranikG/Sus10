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
import { parseReportSections } from '../utils/reportParser';

// JS tokens — kept for loading/error states and fallback components
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

// ── Loading / Error ───────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ minHeight: '100vh', background: '#080d0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, animation: 'rp-bounce 1.2s ease-in-out ' + (i * 0.2) + 's infinite' }} />
        ))}
      </div>
      <div style={{ color: MUTED, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>Loading your report…</div>
      <style>{`@keyframes rp-bounce{0%,80%,100%{transform:scale(0.8);opacity:.4}40%{transform:scale(1.2);opacity:1}}`}</style>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div style={{ minHeight: '100vh', background: '#080d0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 16, color: TEXT, fontFamily: 'Inter, sans-serif' }}>
        Report not found. Please check your link or write to{' '}
        <a href="mailto:gp@sus10.ai" style={{ color: GREEN }}>gp@sus10.ai</a>
      </div>
      {error && <div style={{ fontSize: 13, color: MUTED }}>{typeof error === 'string' ? error : JSON.stringify(error)}</div>}
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
  const answers     = assessment.answers              || {};
  const scores      = assessment.scores               || {};
  const flags       = assessment.conditional_flags    || {};
  const tier        = assessment.readiness_tier       || 'Explorer';
  const tierColor   = TIER_COLORS[tier]               || RED;
  const reportText  = assessment.report_text          || '';
  const sp          = assessment.sustenance_potential || {};
  const showBiogas  = assessment.show_biogas || !!sp?.biogas;

  const firstName    = answers.first_name || 'You';
  const email        = answers.email      || '';
  const city         = answers.city       || '';
  const state        = answers.state      || '';
  const displayCity  = city ? city.charAt(0).toUpperCase() + city.slice(1) : '';
  const terraceArea  = answers.terrace_area_sqft || 1000;
  const terraceSqft  = Math.round(terraceArea);
  const buildingType = answers.Q1 || 'Independent House';
  const overallScore = scores.overall != null ? scores.overall : 0;

  // ── Derived totals (from sustenance_potential) ──────────────────────────────
  const solarSaving  = sp?.solar?.annual_savings_inr    || 0;
  const rwSaving     = sp?.rainwater?.annual_savings_inr || 0;
  const biogasSaving = sp?.biogas?.annual_savings_inr   || 0;
  const totalSavLow  = Math.round((sp?.solar?.savings_low_inr  || Math.round(solarSaving * 0.85)) + rwSaving + biogasSaving);
  const totalSavHigh = Math.round((sp?.solar?.savings_high_inr || solarSaving) + rwSaving + biogasSaving);

  const co2Total = Math.round(
    (sp?.plantation?.co2_sequestration_kg_per_year || 0) +
    (sp?.solar?.co2_offset_kg_per_year             || 0)
  );
  const treesEq = co2Total > 0 ? Math.round(co2Total / 21) : null;

  // ── Pillar numbers ──────────────────────────────────────────────────────────
  const solarKwh     = sp?.solar?.kwh_per_year           || 0;
  const solarSavings = sp?.solar?.annual_savings_inr     || 0;
  const solarCO2     = sp?.solar?.co2_offset_kg_per_year || 0;
  const solarKwp     = sp?.solar?.installed_capacity_kwp || (solarKwh ? (solarKwh / 1400).toFixed(1) : null);
  const solarSavLow  = Math.round(solarSavings * 0.9);
  const solarSavHigh = solarSavings;

  const rainKl        = sp?.rainwater?.kl_per_year          || 0;
  const rainLitres    = sp?.rainwater?.annual_yield_liters   || Math.round(rainKl * 1000);
  const rainSavings   = sp?.rainwater?.annual_savings_inr   || 0;

  const plantCount        = sp?.plantation?.plant_count                   || 0;
  const plantFood         = sp?.plantation?.food_yield_kg_per_year        || 0;
  const plantCO2          = sp?.plantation?.co2_sequestration_kg_per_year || 0;
  const plantableAreaSqft = terraceArea ? Math.round(terraceArea * 0.49) : null;

  const biogasM3         = sp?.biogas?.m3_per_year          || 0;
  const biogasCylinders  = sp?.biogas?.lpg_cylinders_per_year || 0;
  const biogasSavingsVal = sp?.biogas?.annual_savings_inr   || 0;

  // ── Parse report text ───────────────────────────────────────────────────────
  const parsed        = parseReportSections(reportText);
  const strengthItems = parsed && Array.isArray(parsed.strengths)       ? parsed.strengths       : [];
  const recItems      = parsed && Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
  const roadmapPhases = parsed?.roadmap || {
    phase1: { title: 'Foundation', body: '' },
    phase2: { title: 'Install',    body: '' },
    phase3: { title: 'Optimise',   body: '' },
  };

  const extractPhaseItems = (body, max = 5) => {
    if (!body) return [];
    return body
      .split('\n')
      .map(l => l.trim())
      .filter(l =>
        l.startsWith('- ') || l.startsWith('* ') ||
        l.startsWith('• ') || /^\d+\.\s/.test(l)
      )
      .map(l => l.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').trim())
      .filter(l => l.length > 3)
      .slice(0, max);
  };

  const finalCards    = extractFinalCards(parsed?.finalAssessment || '', tier, overallScore);
  const faText        = parsed?.finalAssessment || '';
  const faOppMatch    = faText.match(/[Bb]iggest [Oo]pportunity[:\s]+([^.]+\.)/);
  const faActionMatch = faText.match(/[Oo]ne [Aa]ction[^:]*[:\s]+([^.]+\.)/);
  const faTriptych = [
    { label: 'READINESS',
      text: `Your Readiness Level: ${tier} (${overallScore}/100)` },
    { label: 'BIGGEST OPPORTUNITY',
      text: faOppMatch ? faOppMatch[1].trim() : finalCards.opportunity },
    { label: 'ONE ACTION THIS MONTH',
      text: faActionMatch ? faActionMatch[1].trim() : finalCards.action },
  ];

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const safeFmt = (val, suffix = '') =>
    (val !== null && val !== undefined && !isNaN(Number(val)))
      ? `${Number(val).toLocaleString('en-IN')}${suffix}`
      : '—';

  const ctaText = flags.R09
    ? 'Talk to your RWA or building owner'
    : tier === 'Explorer'
      ? 'Join our awareness session'
      : tier === 'Getting Ready'
        ? 'Get a free feasibility estimate'
        : tier === 'Sustainability Champion'
          ? 'Join the Sus10 pilot programme'
          : 'Connect with us for a 1:1 Consultation';
  const ctaHref = `mailto:gp@sus10.ai?subject=${encodeURIComponent('Sus10 Enquiry — ' + firstName + ', ' + tier)}`;

  return (
    <div className="min-h-screen bg-[#080d0a] text-slate-100 font-sans pb-20 [--accent:#34d399] [--accent-dim:#059669]">

      {/* ── STICKY HEADER ── */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#080d0a]/80 border-b border-emerald-950/40 px-4 py-3.5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-wider">
              SUS10 • AI
            </div>
            <span className="text-sm font-semibold tracking-tight text-emerald-200">
              Rooftop Audit
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'Sus10 Report', url: window.location.href }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(window.location.href).catch(() => {});
                }
              }}
              className="p-2 rounded-full hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 transition-colors"
              aria-label="Share report"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
              </svg>
            </button>
            <div className="h-4 w-[1px] bg-emerald-900/40"/>
            <span className="text-xs text-emerald-500 font-mono">{firstName}'s Report</span>
            {/* PDF_HIDDEN — monetisation pending; handleDownloadPDF stays in file for re-enable */}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <div className="max-w-lg mx-auto px-4 pt-8 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-900/40 mb-4">
          <span className="text-emerald-400 text-[11px] font-mono font-bold tracking-widest">
            SUS10 AI • HOME SUSTAINABILITY REPORT
          </span>
        </div>
        <h1 className="text-[clamp(32px,8vw,44px)] font-extrabold text-white tracking-tight leading-[1.1] mb-3">
          {firstName}'s Rooftop<br/>Potential
        </h1>
        <div className="flex items-center flex-wrap gap-2 mb-6">
          <span className="px-2.5 py-1 rounded-md border border-emerald-500/30 text-emerald-400 text-[11px] font-bold tracking-wide">
            {displayCity ? displayCity.toUpperCase() : 'DEFAULT'}
          </span>
          {terraceSqft > 0 && (
            <span className="text-slate-400 text-sm">
              • {fmtNum(terraceSqft)} SQ FT Terrace •
            </span>
          )}
          <span className="text-slate-400 text-sm">
            {buildingType || 'Independent House'}
          </span>
        </div>
      </div>

      {/* ── SCORE CARD ── */}
      <div className="max-w-lg mx-auto px-4">
        <div className="rounded-2xl border border-emerald-950/60 bg-gradient-to-br from-[#0a1f15] to-[#070f0a] p-8 text-center mb-3">
          <svg viewBox="0 0 160 160" width="148" height="148" className="block mx-auto mb-4">
            <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(16,64,36,0.4)" strokeWidth="9"/>
            <circle
              cx="80" cy="80" r="68" fill="none"
              stroke={tierColor}
              strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${(overallScore / 100) * 427} 427`}
              transform="rotate(-90 80 80)"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
            <text x="80" y="74" textAnchor="middle" fontSize="38" fontWeight="800" fill="#ffffff" fontFamily="Inter,sans-serif">
              {overallScore}
            </text>
            <text x="80" y="94" textAnchor="middle" fontSize="10" fontWeight="600" fill="#475569" fontFamily="monospace" letterSpacing="2">
              PREPAREDNESS
            </text>
          </svg>
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3"
            style={{
              background: `${tierColor}1a`,
              border: `1px solid ${tierColor}55`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: tierColor }}/>
            <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: tierColor }}>
              {tier}
            </span>
          </div>
          <p className="text-slate-400 text-[13px] max-w-xs mx-auto leading-relaxed">
            Complete tasks in the interactive checklist below to increase {firstName}'s rooftop score!
          </p>
        </div>
      </div>

      {/* ── IMPACT HIGHLIGHT BOX ── */}
      <div className="max-w-lg mx-auto px-4 mb-3">
        <div className="border-l-[3px] border-emerald-500/50 bg-emerald-950/20 rounded-r-2xl p-5">
          <p className="text-[14px] sm:text-[15px] text-slate-200 leading-[1.75] mb-5">
            If {firstName} activated their rooftop fully, it could save{' '}
            <span className="text-emerald-400 font-bold">
              {totalSavHigh > 0
                ? `Rs.${fmtRs(totalSavLow)}–Rs.${fmtRs(totalSavHigh)}/yr`
                : 'significant savings per year'}
            </span>{' '}
            per year — while offsetting{' '}
            <span className="text-emerald-400 font-bold">
              {fmtNum(co2Total)} kg CO₂
            </span>
            {treesEq && (
              <>, the same as planting{' '}
                <span className="text-emerald-400 font-bold">{fmtNum(treesEq)} trees</span>{' '}annually</>
            )}.
          </p>
          <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-emerald-950/50">
            <div className="bg-[#0c140f] border border-emerald-950/80 rounded-xl p-3.5">
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-500 mb-1.5">
                ANNUAL EST. SAVINGS
              </p>
              <p className="text-emerald-400 font-bold text-[15px]">
                {totalSavHigh > 0 ? `Rs. ${fmtRs(totalSavLow)}+` : '—'}
              </p>
            </div>
            <div className="bg-[#0c140f] border border-emerald-950/80 rounded-xl p-3.5">
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-500 mb-1.5">
                CO₂ OFFSET POTENTIAL
              </p>
              <p className="text-emerald-400 font-bold text-[15px]">
                {co2Total > 0 ? `${fmtNum(co2Total)} kg CO₂/yr` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* R03 fast-track CTA */}
      {flags.R03 && (
        <div className="max-w-lg mx-auto px-4 mb-3">
          <div className="bg-[#0c1a10] border border-emerald-950/50 rounded-2xl p-5 text-center">
            <p className="text-slate-400 text-[13px] mb-3">
              Ready to turn your rooftop into a climate solution?
            </p>
            <a href={ctaHref} className="block w-full py-3.5 px-6 rounded-xl bg-emerald-400 text-[#020c06] font-bold text-[14px] text-center no-underline">
              {ctaText}
            </a>
            {email && (
              <p className="text-slate-600 text-[11px] mt-2">
                A copy of this report has been sent to {email}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══ SECTION 01: CORE ROOFTOP PILLARS ══ */}
      <div className="max-w-lg mx-auto px-4 mt-8 mb-3.5 flex items-center gap-0">
        <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 text-[10px] font-mono font-bold tracking-widest whitespace-nowrap">
          01 • THE CORE ROOFTOP PILLARS
        </span>
        <div className="flex-1 h-[1px] bg-emerald-950/40 ml-3"/>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-3">

        {/* GREENING */}
        <div className="bg-[#0c1a10] border border-emerald-950/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[18px]">
                🌱
              </div>
              <div>
                <p className="text-[15px] font-semibold text-white">Greening</p>
                <p className="text-[11px] text-emerald-400">Terrace Organic Bio-forest</p>
              </div>
            </div>
            <span className="text-[28px] opacity-[0.07]">🌿</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="bg-[#0c140f] border border-emerald-950/80 rounded-xl p-3.5">
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-500 mb-1">PLANTS ESTIMATED</p>
              <p className="text-emerald-400 text-[26px] font-extrabold leading-tight">
                {safeFmt(plantCount)}
              </p>
              <p className="text-emerald-400 text-[11px] mt-1">plants</p>
            </div>
            <div className="bg-[#0c140f] border border-emerald-950/80 rounded-xl p-3.5">
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-500 mb-1">ORGANIC HARVEST</p>
              <p className="text-white text-[26px] font-extrabold leading-tight">
                {safeFmt(plantFood)}
              </p>
              <p className="text-slate-500 text-[11px] mt-1">kg food / year</p>
            </div>
          </div>
          <div className="pt-3 border-t border-emerald-950/40 space-y-2">
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-500">Plantable Area Budget:</span>
              <span className="text-emerald-400 font-semibold">
                {safeFmt(plantableAreaSqft, ' sq ft')}
              </span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-500">Annual CO₂ Sequestered:</span>
              <span className="text-emerald-400 font-semibold">
                {safeFmt(plantCO2, ' kg CO₂')}
              </span>
            </div>
          </div>
        </div>

        {/* RAINWATER */}
        <div className="bg-[#0c1a10] border border-emerald-950/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[18px]">
                💧
              </div>
              <div>
                <p className="text-[15px] font-semibold text-white">Rainwater</p>
                <p className="text-[11px] text-blue-400">Pre-Monsoon Storage &amp; Drainage</p>
              </div>
            </div>
            <span className="text-[28px] opacity-[0.07]">💧</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="bg-[#0c140f] border border-emerald-950/80 rounded-xl p-3.5">
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-500 mb-1">CATCHMENT VOLUME</p>
              <p className="text-blue-400 text-[26px] font-extrabold leading-tight">
                {safeFmt(rainLitres)}
              </p>
              <p className="text-blue-400 text-[11px] mt-1">litres / year</p>
            </div>
            <div className="bg-[#0c140f] border border-emerald-950/80 rounded-xl p-3.5">
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-500 mb-1">VALUED SAVINGS</p>
              <p className="text-white text-[26px] font-extrabold leading-tight">
                {rainSavings > 0 ? `Rs.${fmtRs(rainSavings)}` : '—'}
              </p>
              <p className="text-slate-500 text-[11px] mt-1">saved / year</p>
            </div>
          </div>
          <div className="pt-3 border-t border-emerald-950/40 space-y-2">
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-500">Total Catchment Area:</span>
              <span className="text-blue-400 font-semibold">
                {terraceSqft > 0 ? fmtNum(terraceSqft) + ' sq ft' : '—'}
              </span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-500">Catchment Feasibility:</span>
              <span className="text-blue-400 font-semibold">Covers household water needs</span>
            </div>
          </div>
        </div>

        {/* SOLAR */}
        <div className="bg-gradient-to-br from-[#1a0f00] to-[#0d0a00] border border-amber-950/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-[18px]">
                ☀️
              </div>
              <div>
                <p className="text-[15px] font-semibold text-white">Solar Generation (Phase 2)</p>
                <p className="text-[11px] text-amber-400">Common Area Active Support</p>
              </div>
            </div>
            <span className="text-[28px] opacity-[0.07]">☀️</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="bg-[#0c0800] border border-amber-950/60 rounded-xl p-3.5">
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-500 mb-1">ACTIVE GENERATION</p>
              <p className="text-amber-400 text-[22px] font-extrabold leading-tight">
                {solarKwh > 0
                  ? `${safeFmt(Math.round(solarKwh * 0.45))}–${safeFmt(solarKwh)}`
                  : '—'}
              </p>
              <p className="text-amber-400 text-[11px] mt-1">units / year</p>
            </div>
            <div className="bg-[#0c0800] border border-amber-950/60 rounded-xl p-3.5">
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-500 mb-1">SAVINGS ESTIMATE</p>
              <p className="text-white text-[20px] font-extrabold leading-tight">
                {solarSavings > 0
                  ? `Rs.${Math.round(solarSavLow / 1000)}k–${Math.round(solarSavHigh / 1000)}k`
                  : '—'}
              </p>
              <p className="text-amber-400 text-[11px] mt-1">
                {solarSavings > 0 ? `Rs.${fmtRs(solarSavings)}+` : ''}
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-amber-950/30 space-y-2">
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-500">Installable Solar Array Size:</span>
              <span className="text-amber-400 font-semibold">
                {solarKwp ? `${solarKwp} kWp` : '—'}
              </span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-500">Total Carbon Offset:</span>
              <span className="text-amber-400 font-semibold">
                {safeFmt(solarCO2, ' kg CO₂ / yr')}
              </span>
            </div>
          </div>
        </div>

        {/* BIOGAS — conditional */}
        {showBiogas && (
          <div className="bg-[#0c1a10] border border-emerald-950/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[18px]">
                  ♻️
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-white">Biogas</p>
                  <p className="text-[11px] text-emerald-400">Organic Waste Conversion</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#0c140f] border border-emerald-950/80 rounded-xl p-3.5">
                <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-500 mb-1">GAS YIELD</p>
                <p className="text-emerald-400 text-[26px] font-extrabold leading-tight">
                  {safeFmt(biogasM3)}
                </p>
                <p className="text-emerald-400 text-[11px] mt-1">m³ / year</p>
                {biogasCylinders > 0 && (
                  <p className="text-slate-400 text-[10px] mt-0.5">≈ {Math.round(biogasCylinders)} LPG cylinders/yr</p>
                )}
              </div>
              <div className="bg-[#0c140f] border border-emerald-950/80 rounded-xl p-3.5">
                <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-500 mb-1">LPG SAVINGS</p>
                <p className="text-white text-[26px] font-extrabold leading-tight">
                  {biogasSavingsVal > 0 ? `Rs.${fmtRs(biogasSavingsVal)}` : '—'}
                </p>
                <p className="text-slate-500 text-[11px] mt-1">saved / yr</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ SECTION 02: STRENGTHS & FEASIBILITY ══ */}
      <div className="max-w-lg mx-auto px-4 mt-8 mb-3.5 flex items-center gap-0">
        <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 text-[10px] font-mono font-bold tracking-widest whitespace-nowrap">
          02 • STRENGTHS &amp; FEASIBILITY
        </span>
        <div className="flex-1 h-[1px] bg-emerald-950/40 ml-3"/>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-3">

        {/* STRENGTHS */}
        <div className="bg-[#0c140f] border border-emerald-950/80 rounded-2xl p-5 sm:p-6 space-y-4">
          <h4 className="text-base font-semibold text-white tracking-tight flex items-center gap-2 border-b border-emerald-950 pb-3 mb-1 font-sans">
            <span className="text-emerald-400 text-[14px]">🏅</span>
            Identified Bio-Habit Strengths
          </h4>
          {strengthItems.length > 0 ? strengthItems.map((s, i) => {
            const colonIdx = s.indexOf(':');
            const hasColon = colonIdx > 0 && colonIdx < 40;
            const title = hasColon ? s.substring(0, colonIdx).replace(/^\d+\.\s*/, '').trim() : '';
            const body  = hasColon ? s.substring(colonIdx + 1).trim() : stripMd(s);
            const icons = ['🗑️', '❤️', '🌿', '💡', '🏗️'];
            return (
              <div key={i} className="flex gap-3 items-start">
                <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-900/50 mt-0.5 flex-shrink-0 text-[14px] w-8 h-8 flex items-center justify-center">
                  {icons[i] || '✓'}
                </div>
                <div className="space-y-0.5 flex-1">
                  {title && <h5 className="text-[14px] font-semibold text-slate-200 font-sans">{title}</h5>}
                  <p className="text-[13px] sm:text-[14px] text-slate-300 leading-relaxed font-sans">{body}</p>
                </div>
              </div>
            );
          }) : (
            <p className="text-[13px] text-slate-500 italic">
              No strengths identified yet.
            </p>
          )}
        </div>

        {/* FEASIBILITY METRICS */}
        <div className="bg-[#0c140f] border border-emerald-950/80 rounded-2xl p-5 sm:p-6 space-y-4">
          <h4 className="text-base font-semibold text-white tracking-tight flex items-center gap-2 border-b border-emerald-950 pb-3 mb-1 font-sans">
            <span className="text-emerald-400 text-[14px]">📊</span>
            Rooftop Feasibility Metrics
          </h4>
          {[
            { label: 'Structural Capacity', score: scores.capacity   ?? 0, barColor: '#fbbf24', scoreColor: 'text-amber-400'  },
            { label: 'Motivation Score',    score: scores.motivation ?? 0, barColor: '#34d399', scoreColor: 'text-emerald-400' },
            { label: 'Initial Interest',    score: scores.interest   ?? 0, barColor: '#60a5fa', scoreColor: 'text-blue-400'   },
          ].map((bar, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-slate-300">{bar.label}</span>
                <span className={`text-[13px] font-bold ${bar.scoreColor}`}>{bar.score} / 100</span>
              </div>
              <div className="h-1.5 rounded-full bg-emerald-950/60 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${bar.score}%`, background: bar.barColor, transition: 'width 0.8s ease' }}/>
              </div>
            </div>
          ))}
          {/* Waste habits bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-slate-300">Household Waste Habits</span>
              <span className="text-[13px] font-bold text-emerald-400">
                {(scores.barriers ?? 0) >= 60 ? 'GOOD' : (scores.barriers ?? 0) >= 30 ? 'MODERATE' : 'LOW'}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-emerald-950/60 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${scores.barriers ?? 0}%`, transition: 'width 0.8s ease' }}/>
            </div>
          </div>
        </div>

        {/* Fallback markdown for unparseable reports */}
        {!parsed && reportText && (
          <div className="bg-[#0c140f] border border-emerald-950/80 rounded-2xl p-5">
            <style>{`
              .rp-md p{color:rgba(203,213,225,0.85);font-size:14px;line-height:1.75;margin-bottom:14px}
              .rp-md h2,.rp-md h3{color:#f1f5f9;font-weight:600;margin-top:20px;margin-bottom:8px}
              .rp-md ul,.rp-md ol{color:rgba(203,213,225,0.85);font-size:14px;line-height:1.7;padding-left:1.4em;margin-bottom:14px}
              .rp-md li{margin-bottom:5px}
              .rp-md strong{color:#f1f5f9;font-weight:600}
              .rp-md blockquote{border-left:3px solid #34d399;padding-left:12px;color:rgba(203,213,225,0.6);margin:1em 0;font-style:italic}
            `}</style>
            <div className="rp-md">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportText}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* ══ SECTION 03: RECOMMENDED TIMELINE ══ */}
      <div className="max-w-lg mx-auto px-4 mt-8 mb-3.5 flex items-center gap-0">
        <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 text-[10px] font-mono font-bold tracking-widest whitespace-nowrap">
          03 • RECOMMENDED TIMELINE
        </span>
        <div className="flex-1 h-[1px] bg-emerald-950/40 ml-3"/>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-3">
        {recItems.length > 0 ? recItems.slice(0, 3).map((rec, i) => {
          const colonIdx = rec.indexOf(':');
          const hasColon = colonIdx > 0 && colonIdx < 60;
          const rawTitle = hasColon ? rec.substring(0, colonIdx).replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim() : `Action ${i + 1}`;
          const body     = hasColon ? rec.substring(colonIdx + 1).trim() : stripMd(rec);
          const categories = ['GREENING', 'WATER', 'SOLAR'];
          const costs      = ['Rs.2,000–5,000', 'Rs.15,000–25,000 (est.)', 'Rs.1,50,000–2,00,000 (after subsidy)'];
          const urgency    = ['Lowest barrier · Start this week', 'Install before monsoon', 'One-time install · High lifetime savings'];
          return (
            <div key={i} className="bg-[#0c1a10] border border-emerald-950/50 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 tracking-[0.08em]">
                  RECOMMENDATION {i + 1}
                </span>
                <span className="text-[11px] font-bold text-emerald-400 tracking-[0.06em]">
                  {categories[i] || 'ACTION'}
                </span>
              </div>
              <h3 className="text-[17px] font-bold text-white mb-2.5 leading-snug">{rawTitle}</h3>
              <p className="text-[13px] text-slate-400 leading-relaxed mb-4">{body}</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full border border-slate-700/50 text-slate-400 text-[11px]">
                  Cost: {costs[i]}
                </span>
                <span className="px-3 py-1 rounded-full border border-emerald-500/30 text-emerald-400 text-[11px]">
                  {urgency[i]}
                </span>
              </div>
            </div>
          );
        }) : (
          <div className="bg-[#0c1a10] border border-emerald-950/50 rounded-2xl p-5">
            <p className="text-[13px] text-slate-500 italic">Recommendations will appear here once the report is fully parsed.</p>
          </div>
        )}
      </div>

      {/* ══ SECTION 04: ACTIVE ROADMAP ══ */}
      <div className="max-w-lg mx-auto px-4 mt-8 mb-3.5 flex items-center gap-0">
        <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 text-[10px] font-mono font-bold tracking-widest whitespace-nowrap">
          04 • SUS10 ACTIVE ROADMAP
        </span>
        <div className="flex-1 h-[1px] bg-emerald-950/40 ml-3"/>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-3">
        {[
          { n: 1, range: '0-3 MONTHS',  phaseKey: 'phase1', fallbackTitle: 'Foundation' },
          { n: 2, range: '3-12 MONTHS', phaseKey: 'phase2', fallbackTitle: 'Install'    },
          { n: 3, range: '1-3 YEARS',   phaseKey: 'phase3', fallbackTitle: 'Optimise'   },
        ].map(p => {
          const phaseData  = roadmapPhases[p.phaseKey] || {};
          const phaseTitle = phaseData.title || p.fallbackTitle;
          const phaseItems = extractPhaseItems(phaseData.body, 5);
          const fallback   = ['Set up initial installation', 'Research vendors and get quotes', 'Review savings and next steps'];
          const items      = phaseItems.length > 0 ? phaseItems : fallback;
          return (
            <div key={p.n} className="bg-[#0c1a10] border border-emerald-950/50 rounded-2xl p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-bold text-emerald-400 tracking-[0.08em] mb-1">
                    PHASE {p.n} • {p.range}
                  </p>
                  <p className="text-[17px] font-bold text-white">{phaseTitle}</p>
                </div>
                <span className="text-[11px] text-slate-500 bg-emerald-950/40 px-2.5 py-1 rounded-md">
                  0/{items.length} Done
                </span>
              </div>
              <div className="space-y-3">
                {items.map((item, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-[5px] border-[1.5px] border-emerald-900/50 flex-shrink-0 mt-0.5"/>
                    <span className="text-[13px] text-slate-200 leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ SECTION 05: FINAL ASSESSMENT ══ */}
      <div className="max-w-lg mx-auto px-4 mt-8 mb-3.5 flex items-center gap-0">
        <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 text-[10px] font-mono font-bold tracking-widest whitespace-nowrap">
          05 • FINAL ASSESSMENT
        </span>
        <div className="flex-1 h-[1px] bg-emerald-950/40 ml-3"/>
      </div>

      <div className="max-w-lg mx-auto px-4">
        {/* Triptych */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {faTriptych.map((c, i) => (
            <div key={i} className="bg-[#0c140f] border border-emerald-950/80 rounded-xl p-3">
              <p className="text-[9px] font-bold tracking-[0.08em] uppercase text-slate-500 mb-2">{c.label}</p>
              <p className="text-[11px] text-slate-200 leading-[1.5]">{c.text}</p>
            </div>
          ))}
        </div>

        {/* Main CTA card */}
        <div className="bg-[#0c1a10] border border-emerald-950/50 rounded-2xl p-6 text-center">
          <p className="text-slate-400 text-[13px] mb-4">
            Ready to turn your rooftop into a climate solution?
          </p>
          <a href={ctaHref} className="block w-full py-3.5 px-6 rounded-xl bg-emerald-400 text-[#020c06] font-bold text-[14px] text-center no-underline mb-2">
            {ctaText}
          </a>
          {email && (
            <p className="text-slate-600 text-[11px]">
              A copy of this report has been sent to {email}
            </p>
          )}
        </div>

        {/* Closing quote */}
        <div className="text-center py-6">
          <p className="text-slate-600 text-[12px] italic mb-1.5">
            "Every roof has the potential to become a climate solution."
          </p>
          <p className="text-emerald-400 text-[13px] font-semibold">
            Your journey toward a Self-Sustaining Roof starts with one small step.
          </p>
        </div>
      </div>

      {/* ══ SOLUTION PARTNERS ══ */}
      <div className="max-w-lg mx-auto px-4 mt-4 mb-3.5 flex items-center gap-0">
        <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 text-[10px] font-mono font-bold tracking-widest whitespace-nowrap">
          SOLUTION PARTNERS
        </span>
        <div className="flex-1 h-[1px] bg-emerald-950/40 ml-3"/>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-3">
        {[
          { icon: '🌿', name: 'Rooftop Farming',     desc: 'Expert guidance on terrace gardens and container farms',   sub: 'Container Gardening · Food Forest' },
          { icon: '💧', name: 'Rainwater Harvesting', desc: 'RWH system design, tank sizing, plumbing integration',    sub: 'Storage · Filtration · Recharge' },
          { icon: '☀️', name: 'Solar Installation',   desc: 'MNRE-empanelled solar vendors, net-metering support',     sub: 'Grid-tied · Net Metering' },
        ].map((v, i) => (
          <div key={i} className="bg-[#0c1a10] border border-emerald-950/50 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[18px]">{v.icon}</span>
              <div>
                <p className="text-[14px] font-bold text-white">{v.name}</p>
                <p className="text-[11px] text-slate-500">{v.sub}</p>
              </div>
            </div>
            <p className="text-[12px] text-slate-500">{v.desc}</p>
            <a
              href={`mailto:gp@sus10.ai?subject=${encodeURIComponent('Vendor Enquiry — ' + v.name + ' — ' + firstName + ', ' + displayCity)}`}
              className="block w-full py-2.5 rounded-xl bg-emerald-400 text-[#020c06] font-bold text-[13px] text-center no-underline"
            >
              Connect me →
            </a>
          </div>
        ))}

        <p className="text-center text-[11px] text-slate-600 pt-1 pb-2">
          Sus10 AI will personally connect you with verified installers. No spam, no sales calls — just the right people.
        </p>

        {/* Disclaimer */}
        <div className="bg-amber-950/20 border border-amber-900/20 rounded-xl p-3.5">
          <p className="text-[10px] text-stone-500 leading-relaxed">
            About these estimates: Calculated using MNRE solar data, IMD rainfall data, and CPCB waste norms.
            Indicative only — actual potential confirmed after a professional site assessment. Structural load,
            shade, roof slope, and local regulations need professional evaluation. Write to{' '}
            <a href="mailto:gp@sus10.ai" className="text-emerald-600">gp@sus10.ai</a>{' '}
            with any questions.
          </p>
        </div>
      </div>

    </div>
  );
}
