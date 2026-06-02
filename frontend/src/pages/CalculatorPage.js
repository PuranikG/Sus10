import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronRight, ChevronLeft, Leaf } from 'lucide-react';
import { apiRequest } from '../lib/utils';

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressBar({ current, total, title }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: '#7aaa8a', fontWeight: 500 }}>
          Step {current} of {total} — {title}
        </span>
        <span style={{ fontSize: '12px', color: '#4a6a4a' }}>{pct}%</span>
      </div>
      <div style={{ height: '4px', background: '#1e3024', borderRadius: '100px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #22c55e, #4ade80)',
          borderRadius: '100px',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

function TextGroupQuestion({ question, answers, onChange }) {
  const fields = question.fields || [];
  const fieldLabels = {
    first_name: 'First Name',
    last_name: 'Last Name',
    phone: 'Phone Number',
    email: 'Email Address',
    city: 'City',
    state: 'State',
  };
  // Pair fields into rows of 2
  const rows = [];
  for (let i = 0; i < fields.length; i += 2) {
    rows.push(fields.slice(i, i + 2));
  }

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fdf8', marginBottom: '16px' }}>{question.label}</div>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {row.map((field) => (
            <div key={field}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7aaa8a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {fieldLabels[field] || field}
              </label>
              <input
                type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                value={answers[field] || ''}
                onChange={e => onChange(field, e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0d1710',
                  border: `1px solid ${field === 'email' && answers[field] && !isValidEmail(answers[field]) ? '#ef4444' : '#1e3024'}`,
                  borderRadius: '8px',
                  color: '#f8fdf8',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                placeholder={fieldLabels[field] || field}
              />
              {field === 'email' && answers[field] && !isValidEmail(answers[field]) && (
                <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '3px', display: 'block' }}>
                  Enter a valid email address
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SingleSelectQuestion({ question, value, onChange }) {
  const opts = question.options || [];
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fdf8', marginBottom: '12px' }}>{question.label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
        {opts.map((opt) => {
          const label = typeof opt === 'string' ? opt : opt.label;
          const selected = value === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange(label)}
              style={{
                padding: '12px 16px',
                background: selected ? 'rgba(34,197,94,0.15)' : '#111e15',
                border: `1px solid ${selected ? '#22c55e' : '#1e3024'}`,
                borderRadius: '10px',
                color: selected ? '#22c55e' : '#c8ddd0',
                fontSize: '14px',
                fontWeight: selected ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MultiSelectQuestion({ question, value = [], onChange }) {
  const opts = question.options || [];
  const capSelections = question.cap_selections || null;

  const toggle = (label) => {
    const isNone = label === 'None of these';
    let next;
    if (isNone) {
      next = value.includes(label) ? [] : [label];
    } else {
      const without = value.filter(v => v !== 'None of these');
      if (without.includes(label)) {
        next = without.filter(v => v !== label);
      } else {
        if (capSelections && without.length >= capSelections) return; // hard cap
        next = [...without, label];
      }
    }
    onChange(next);
  };

  const selectedCount = value.length;

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fdf8' }}>{question.label}</div>
        {capSelections && (
          <span style={{
            fontSize: '12px',
            color: selectedCount >= capSelections ? '#22c55e' : '#7aaa8a',
            fontWeight: 600,
          }}>
            {selectedCount}/{capSelections} selected
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
        {opts.map((opt) => {
          const label = typeof opt === 'string' ? opt : opt.label;
          const selected = value.includes(label);
          const atCap = capSelections && selectedCount >= capSelections && !selected;
          const isNoneOpt = label === 'None of these';
          const noneSelected = value.includes('None of these');
          const disabledByNone = noneSelected && !isNoneOpt;
          const disabled = atCap || disabledByNone;

          return (
            <button
              key={label}
              type="button"
              onClick={() => !disabled && toggle(label)}
              style={{
                padding: '12px 16px',
                background: selected ? 'rgba(34,197,94,0.15)' : disabled ? 'rgba(17,30,21,0.5)' : '#111e15',
                border: `1px solid ${selected ? '#22c55e' : '#1e3024'}`,
                borderRadius: '10px',
                color: selected ? '#22c55e' : disabled ? '#4a6a4a' : '#c8ddd0',
                fontSize: '14px',
                fontWeight: selected ? 600 : 400,
                cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {selected ? '✓ ' : ''}{label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState(null);

  const [currentPage, setCurrentPage] = useState(0); // 0-indexed
  const [answers, setAnswers] = useState({}); // flat map: field/questionId => value
  const [honeypot, setHoneypot] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Fetch config on mount
  useEffect(() => {
    apiRequest('/calculator/config')
      .then(data => setConfig(data))
      .catch(err => setConfigError(err.message || 'Failed to load calculator'))
      .finally(() => setConfigLoading(false));
  }, []);

  const pages = config?.pages || [];
  const page = pages[currentPage] || {};
  const questions = page.questions || [];
  const isLastPage = currentPage === pages.length - 1;

  // ── Answer handlers ──
  const handleTextGroup = useCallback((field, val) => {
    setAnswers(prev => ({ ...prev, [field]: val }));
  }, []);

  const handleSingleSelect = useCallback((qid, val) => {
    setAnswers(prev => ({ ...prev, [qid]: val }));
  }, []);

  const handleMultiSelect = useCallback((qid, val) => {
    setAnswers(prev => ({ ...prev, [qid]: val }));
  }, []);

  // ── Validation: is current page ready to proceed? ──
  const isPageValid = useCallback(() => {
    if (!questions.length) return false;
    for (const q of questions) {
      if (q.type === 'text_group') {
        const fields = q.fields || [];
        for (const f of fields) {
          if (!answers[f] || answers[f].trim() === '') return false;
        }
        // Email must be valid
        if (fields.includes('email') && !isValidEmail(answers['email'] || '')) return false;
      } else if (q.scored) {
        // Must have a non-empty answer for scored questions
        const v = answers[q.id];
        if (v === undefined || v === null || v === '') return false;
        if (Array.isArray(v) && v.length === 0) return false;
      }
    }
    return true;
  }, [questions, answers]);

  // ── Submit ──
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const scorePayload = { answers, website: honeypot };
      const scoreResult = await apiRequest('/calculator/score', {
        method: 'POST',
        body: JSON.stringify(scorePayload),
      });

      const assessmentId = scoreResult.assessment_id;

      // Generate report
      const reportPayload = {
        assessment_id: assessmentId,
        email: answers.email || '',
        website: honeypot,
      };
      await apiRequest('/report/generate', {
        method: 'POST',
        body: JSON.stringify(reportPayload),
      });

      navigate(`/report/${assessmentId}`);
    } catch (err) {
      setSubmitError(err.detail || err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  // ─── Loading / error states ───
  if (configLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1710' }}>
        <Loader2 style={{ color: '#22c55e', width: '36px', height: '36px', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }
  if (configError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1710', flexDirection: 'column', gap: '16px' }}>
        <div style={{ color: '#ef4444', fontSize: '18px' }}>Failed to load calculator</div>
        <div style={{ color: '#7aaa8a', fontSize: '14px' }}>{configError}</div>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: '#22c55e', color: '#0a1a0e', borderRadius: '100px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          Try Again
        </button>
      </div>
    );
  }

  if (submitting) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1710', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Leaf style={{ color: '#22c55e', width: '32px', height: '32px' }} />
          <span style={{ fontSize: '22px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#f8fdf8' }}>Sus10 AI</span>
        </div>
        <Loader2 style={{ color: '#22c55e', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '18px', color: '#f8fdf8', fontWeight: 600 }}>Analysing your rooftop potential…</div>
        <div style={{ fontSize: '13px', color: '#7aaa8a' }}>This takes about 15 seconds</div>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1710', padding: '0 0 60px' }}>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} } input:focus{border-color:#22c55e !important; box-shadow:0 0 0 2px rgba(34,197,94,0.15);}`}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e3024', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Leaf style={{ color: '#22c55e', width: '22px', height: '22px' }} />
        <span style={{ fontSize: '17px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#f8fdf8' }}>Sus10 AI</span>
        <span style={{ fontSize: '13px', color: '#4a6a4a', marginLeft: 'auto' }}>Home Sustainability Assessment</span>
      </div>

      {/* Form card */}
      <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{
          background: '#111e15',
          border: '1px solid #1e3024',
          borderRadius: '20px',
          padding: '40px',
        }}>
          <ProgressBar current={currentPage + 1} total={pages.length} title={page.title || ''} />

          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 700, color: '#f8fdf8', marginBottom: '28px', marginTop: 0 }}>
            {page.title}
          </h2>

          {/* Questions */}
          {questions.map((q) => {
            if (q.type === 'text_group') {
              return (
                <TextGroupQuestion
                  key={q.id}
                  question={q}
                  answers={answers}
                  onChange={handleTextGroup}
                />
              );
            }
            if (q.type === 'single_select') {
              return (
                <SingleSelectQuestion
                  key={q.id}
                  question={q}
                  value={answers[q.id] || ''}
                  onChange={(val) => handleSingleSelect(q.id, val)}
                />
              );
            }
            if (q.type === 'multi_select') {
              return (
                <MultiSelectQuestion
                  key={q.id}
                  question={q}
                  value={answers[q.id] || []}
                  onChange={(val) => handleMultiSelect(q.id, val)}
                />
              );
            }
            return null;
          })}

          {/* Honeypot */}
          <div style={{ display: 'none' }} aria-hidden="true">
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Error */}
          {submitError && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '14px', marginBottom: '20px' }}>
              {submitError}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <div>
              {currentPage > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => p - 1)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '10px 20px', background: 'transparent',
                    border: '1px solid #1e3024', borderRadius: '100px',
                    color: '#7aaa8a', fontSize: '14px', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <ChevronLeft style={{ width: '16px', height: '16px' }} /> Back
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={!isPageValid()}
              onClick={isLastPage ? handleSubmit : () => setCurrentPage(p => p + 1)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 32px',
                background: isPageValid() ? '#22c55e' : '#1e3024',
                border: 'none', borderRadius: '100px',
                color: isPageValid() ? '#0a1a0e' : '#4a6a4a',
                fontSize: '15px', fontWeight: 700,
                cursor: isPageValid() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: isPageValid() ? '0 4px 20px rgba(34,197,94,0.25)' : 'none',
              }}
            >
              {isLastPage ? 'Get My Free Report' : 'Next'}
              {!isLastPage && <ChevronRight style={{ width: '16px', height: '16px' }} />}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#4a6a4a', marginTop: '20px' }}>
          No login required · Your data is kept private · Free report
        </p>
      </div>
    </div>
  );
}
