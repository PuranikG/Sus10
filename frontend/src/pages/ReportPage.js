import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, Leaf, Mail, Info } from 'lucide-react';
import { apiRequest } from '../lib/utils';

// ─── Score card colour logic ──────────────────────────────────────────────────
function scoreBarColor(score, inverted = false) {
  const s = inverted ? (100 - score) : score;
  if (s >= 60) return '#22c55e';
  if (s >= 30) return '#f59e0b';
  return '#ef4444';
}

function ScoreCard({ label, score, inverted }) {
  const color = scoreBarColor(score, inverted);
  return (
    <div style={{
      flex: '1 1 140px',
      background: '#111e15',
      border: '1px solid #1e3024',
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{ height: '4px', background: color }} />
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: '11px', color: '#7aaa8a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{label}</div>
        <div style={{ fontSize: '28px', fontWeight: 800, color: '#f8fdf8', lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: '12px', color: '#4a6a4a' }}>/100</div>
      </div>
    </div>
  );
}

// ─── CTA block ────────────────────────────────────────────────────────────────
const CTA_CONFIG = {
  'Explorer': { text: 'Join our free awareness session', href: 'mailto:hello@sus10.ai' },
  'Getting Ready': { text: 'Get a free feasibility estimate', href: 'mailto:hello@sus10.ai' },
  'Action Ready': { text: 'Connect with a verified vendor today', href: 'mailto:hello@sus10.ai' },
  'Sustainability Champion': { text: 'Join the Sus10 pilot programme', href: 'mailto:hello@sus10.ai' },
};

function CtaBlock({ tier, flags, tierColor }) {
  const cta = CTA_CONFIG[tier] || CTA_CONFIG['Explorer'];
  const btnText = flags?.R09 ? 'Talk to your Society committee or building owner' : cta.text;
  return (
    <div style={{
      background: 'rgba(34,197,94,0.06)',
      border: '1px solid rgba(34,197,94,0.2)',
      borderRadius: '16px',
      padding: '28px 32px',
      textAlign: 'center',
      marginBottom: '24px',
    }}>
      <div style={{ fontSize: '14px', color: '#7aaa8a', marginBottom: '12px' }}>
        Ready to take the next step?
      </div>
      <a
        href={cta.href}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '13px 32px',
          background: tierColor || '#22c55e',
          color: '#0a1a0e',
          fontWeight: 700, fontSize: '15px',
          borderRadius: '100px',
          textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(34,197,94,0.2)',
          transition: 'opacity 0.2s',
        }}
      >
        <Mail style={{ width: '16px', height: '16px' }} />
        {btnText}
      </a>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReportPage() {
  const { assessmentId } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!assessmentId) return;
    apiRequest(`/report/${assessmentId}`)
      .then(data => setAssessment(data))
      .catch(err => setError(err.detail || err.message || 'Report not found'))
      .finally(() => setLoading(false));
  }, [assessmentId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1710', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <Loader2 style={{ color: '#22c55e', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <div style={{ color: '#7aaa8a', fontSize: '14px' }}>Loading your report…</div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1710', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ color: '#ef4444', fontSize: '18px' }}>Report not found</div>
        <div style={{ color: '#7aaa8a', fontSize: '14px' }}>{error}</div>
        <Link to="/calculator" style={{ padding: '10px 24px', background: '#22c55e', color: '#0a1a0e', borderRadius: '100px', fontWeight: 600, textDecoration: 'none', fontSize: '14px' }}>
          Take the Assessment
        </Link>
      </div>
    );
  }

  const answers = assessment.answers || {};
  const scores = assessment.scores || {};
  const flags = assessment.conditional_flags || {};
  const tier = assessment.readiness_tier || 'Explorer';
  const tierColor = assessment.tier_color || '#22c55e';
  const firstName = answers.first_name || 'Your';
  const email = answers.email || '';
  const reportText = assessment.report_text || '';

  const R03 = flags.R03; // Very interested → show CTA above body too

  return (
    <div style={{ minHeight: '100vh', background: '#0d1710' }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .report-body h1,.report-body h2,.report-body h3{font-family:'Playfair Display',Georgia,serif;color:#f8fdf8;margin-top:1.6em;margin-bottom:0.5em}
        .report-body h1{font-size:22px;font-weight:700}
        .report-body h2{font-size:18px;font-weight:700}
        .report-body h3{font-size:15px;font-weight:600}
        .report-body p{color:#c8ddd0;font-size:14px;line-height:1.75;margin-bottom:1em}
        .report-body ul,.report-body ol{color:#c8ddd0;font-size:14px;line-height:1.75;padding-left:1.4em;margin-bottom:1em}
        .report-body li{margin-bottom:0.3em}
        .report-body strong{color:#f8fdf8;font-weight:600}
        .report-body em{color:#a0c4a8}
        .report-body hr{border:none;border-top:1px solid #1e3024;margin:1.5em 0}
        .report-body blockquote{border-left:3px solid #22c55e;padding-left:14px;color:#7aaa8a;margin:1em 0;font-style:italic}
      `}</style>

      {/* Header band */}
      <div style={{ background: tierColor, padding: '20px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Leaf style={{ color: '#0a1a0e', width: '22px', height: '22px' }} />
            <span style={{ fontSize: '17px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#0a1a0e' }}>Sus10 AI</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#0a1a0e', textAlign: 'center' }}>
            {firstName}'s Sustainability Report
          </div>
          <div style={{
            padding: '6px 16px',
            background: 'rgba(0,0,0,0.15)',
            borderRadius: '100px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#0a1a0e',
            whiteSpace: 'nowrap',
          }}>
            {tier} — {scores.overall ?? 0}/100
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Score strip */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
          <ScoreCard label="Capacity" score={scores.capacity ?? 0} />
          <ScoreCard label="Motivation" score={scores.motivation ?? 0} />
          <ScoreCard label="Interest" score={scores.interest ?? 0} />
          <ScoreCard label="Barriers" score={scores.barriers ?? 0} inverted />
        </div>

        {/* R03 fast-track CTA above report body */}
        {R03 && <CtaBlock tier={tier} flags={flags} tierColor={tierColor} />}

        {/* Report body */}
        {reportText ? (
          <div
            className="report-body"
            style={{ background: '#111e15', border: '1px solid #1e3024', borderRadius: '16px', padding: '32px', marginBottom: '32px' }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportText}</ReactMarkdown>
          </div>
        ) : (
          <div style={{ background: '#111e15', border: '1px solid #1e3024', borderRadius: '16px', padding: '32px', marginBottom: '32px', color: '#7aaa8a', textAlign: 'center' }}>
            Report is being generated. Please refresh in a moment.
          </div>
        )}

        {/* Disclaimer — About These Estimates */}
        <div style={{
          background: '#FEF3C7',
          borderLeft: '4px solid #D97706',
          borderRadius: '8px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
        }}>
          <div style={{
            flexShrink: 0,
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '2px',
          }}>
            <Info style={{ width: '15px', height: '15px', color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400E', marginBottom: '8px' }}>
              About These Estimates
            </div>
            <p style={{ fontSize: '13px', color: '#78350F', lineHeight: 1.65, margin: '0 0 8px 0' }}>
              The figures in this report are calculated using standard engineering parameters for Indian conditions
              (MNRE solar data, IMD rainfall data, CPCB waste norms). They are indicative — actual potential can
              only be confirmed after a site assessment, in-person or virtual.
            </p>
            <p style={{ fontSize: '13px', color: '#78350F', lineHeight: 1.65, margin: '0 0 8px 0' }}>
              Real-world outcomes depend on factors that need professional evaluation: structural load capacity,
              roof slope and orientation, shade from trees or adjacent buildings, piped gas availability,
              and local regulations.
            </p>
            <p style={{ fontSize: '13px', color: '#78350F', lineHeight: 1.65, margin: 0 }}>
              AI can make mistakes. If anything looks incorrect or doesn't match your situation, write to us at{' '}
              <a href="mailto:gp@sus10.ai" style={{ color: '#92400E', fontWeight: 600 }}>gp@sus10.ai</a>
              {' '}— we review all feedback and fix errors.
            </p>
          </div>
        </div>

        {/* CTA at bottom */}
        <CtaBlock tier={tier} flags={flags} tierColor={tierColor} />

        {/* Footer line */}
        {email && (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#4a6a4a', marginTop: '8px' }}>
            A copy of this report has been sent to {email}
          </p>
        )}
      </div>
    </div>
  );
}
