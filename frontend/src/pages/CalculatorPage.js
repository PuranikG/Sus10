import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronRight, ChevronLeft, Leaf } from 'lucide-react';
import { apiRequest } from '../lib/utils';

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const PHONE_PREFIXES = [
  { code: '+91', flag: '🇮🇳', label: 'India' },
  { code: '+1',  flag: '🇺🇸', label: 'US/CA'  },
  { code: '+44', flag: '🇬🇧', label: 'UK'     },
  { code: '+971',flag: '🇦🇪', label: 'UAE'    },
  { code: '+65', flag: '🇸🇬', label: 'SG'     },
  { code: '+61', flag: '🇦🇺', label: 'AU'     },
];

function isValidPhone(dialCode, number) {
  const digits = (number || '').replace(/[\s\-()]/g, '');
  if (!digits) return false;
  if (dialCode === '+91') return /^[6-9]\d{9}$/.test(digits);
  return /^\d{7,15}$/.test(digits);
}

function toE164(dialCode, number) {
  const digits = (number || '').replace(/[\s\-()]/g, '');
  return dialCode + digits;
}

// Gibberish names (mirrors backend list)
const GIBBERISH_NAMES = new Set([
  'test','asdf','qwerty','abc','xyz','aaa','bbb','ccc',
  'foo','bar','demo','sample','dummy','fake','random',
  'user','admin','name','hello','hi','na','none','null',
  'undefined','string','example','xxx','yyy','zzz',
]);

function isValidName(v) {
  const s = (v || '').trim();
  if (s.length < 2) return false;
  if (GIBBERISH_NAMES.has(s.toLowerCase())) return false;
  return /^[a-zA-Zऀ-ॿ\s\-']+$/.test(s);
}

// ─── Progress bar ────────────────────────────────────────────────────────────
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

// ─── Phone field (with country prefix) ───────────────────────────────────────
function PhoneField({ value, dialCode, onDialChange, onChange }) {
  const digits = (value || '').replace(/[\s\-()]/g, '');
  const valid  = isValidPhone(dialCode, value);
  const showErr = value && value.length > 2 && !valid;

  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', color: '#7aaa8a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Phone Number
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <select
          value={dialCode}
          onChange={e => onDialChange(e.target.value)}
          style={{
            padding: '10px 8px',
            background: '#0d1710',
            border: '1px solid #1e3024',
            borderRadius: '8px',
            color: '#f8fdf8',
            fontSize: '13px',
            outline: 'none',
            flexShrink: 0,
          }}
        >
          {PHONE_PREFIXES.map(p => (
            <option key={p.code} value={p.code}>{p.flag} {p.code}</option>
          ))}
        </select>
        <input
          type="tel"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={dialCode === '+91' ? '98765 43210' : 'Phone number'}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: '#0d1710',
            border: `1px solid ${showErr ? '#ef4444' : '#1e3024'}`,
            borderRadius: '8px',
            color: '#f8fdf8',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {showErr && (
        <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '3px', display: 'block' }}>
          {dialCode === '+91'
            ? 'Please enter a valid 10-digit Indian mobile number'
            : 'Please enter a valid phone number (7–15 digits)'}
        </span>
      )}
    </div>
  );
}

// ─── Text group (first_name, last_name, phone, email) ────────────────────────
function TextGroupQuestion({ question, answers, onFieldChange, dialCode, onDialChange }) {
  const fields = question.fields || [];
  const NON_PHONE_FIELDS = fields.filter(f => f !== 'phone');

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fdf8', marginBottom: '16px' }}>{question.label}</div>

      {/* Name + email fields in 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {NON_PHONE_FIELDS.map(field => {
          const labels = { first_name: 'First Name', last_name: 'Last Name', email: 'Email Address' };
          const val = answers[field] || '';
          const isEmail = field === 'email';
          const isName = field === 'first_name' || field === 'last_name';
          const emailErr = isEmail && val && !isValidEmail(val);
          const nameErr  = isName  && val && val.length >= 2 && !isValidName(val);

          return (
            <div key={field}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7aaa8a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {labels[field] || field}
              </label>
              <input
                type={isEmail ? 'email' : 'text'}
                value={val}
                onChange={e => onFieldChange(field, e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0d1710',
                  border: `1px solid ${(emailErr || nameErr) ? '#ef4444' : '#1e3024'}`,
                  borderRadius: '8px',
                  color: '#f8fdf8',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                placeholder={labels[field] || field}
              />
              {emailErr && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '3px', display: 'block' }}>Enter a valid email address</span>}
              {nameErr  && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '3px', display: 'block' }}>Please enter a real name</span>}
            </div>
          );
        })}
      </div>

      {/* Phone field spans full width */}
      {fields.includes('phone') && (
        <PhoneField
          value={answers._phone_number || ''}
          dialCode={dialCode}
          onDialChange={onDialChange}
          onChange={v => onFieldChange('_phone_number', v)}
        />
      )}
    </div>
  );
}

// ─── Google Places Autocomplete address field ─────────────────────────────────
// Shared place-data extractor — works with both new and legacy API
function _extractStructured(comps, display, lat, lng, placeId, isNew) {
  const getComp = (type, short = false) => {
    const c = (comps || []).find(x => x.types.includes(type));
    if (!c) return '';
    return short ? (isNew ? c.shortText : c.short_name) : (isNew ? c.longText : c.long_name);
  };
  return {
    display_address: display,
    city:    getComp('locality') || getComp('administrative_area_level_2'),
    state:   getComp('administrative_area_level_1'),
    pincode: getComp('postal_code'),
    lat, lng,
    place_id: placeId,
    _country_code: getComp('country', true),
    _country_name: getComp('country'),
  };
}

function PlacesAddressField({ question, mapsLoaded, addressData, onPlaceSelected }) {
  const containerRef = useRef(null);  // hosts PlaceAutocompleteElement (new API)
  const inputRef     = useRef(null);  // legacy <input> fallback
  const widgetRef    = useRef(null);  // holds the active widget instance
  const [inputVal, setInputVal]         = useState(addressData?.display_address || '');
  const [error, setError]               = useState('');
  const [showNotIndia, setShowNotIndia] = useState(false);
  const [intlEmail, setIntlEmail]       = useState('');
  const [intlSaved, setIntlSaved]       = useState(false);
  const [notIndiaData, setNotIndiaData] = useState(null);
  const [usingNewApi, setUsingNewApi]   = useState(false);

  const handleStructured = (structured) => {
    if (structured._country_code && structured._country_code !== 'IN') {
      setShowNotIndia(true);
      setNotIndiaData({ display_address: structured.display_address, country: structured._country_name });
      onPlaceSelected(null);
      return;
    }
    setShowNotIndia(false);
    setError('');
    const { _country_code: _cc, _country_name: _cn, ...clean } = structured;
    setInputVal(structured.display_address);
    onPlaceSelected(clean);
  };

  useEffect(() => {
    if (!mapsLoaded || widgetRef.current) return;
    const places = window.google?.maps?.places;
    if (!places) return;

    // ── Try new PlaceAutocompleteElement first ───────────────────────────────
    if (places.PlaceAutocompleteElement && containerRef.current) {
      try {
        const el = new places.PlaceAutocompleteElement({
          includedRegionCodes: ['in'],
          types: ['geocode'],
        });
        widgetRef.current = el;
        setUsingNewApi(true);

        // Inject dark-theme CSS custom properties
        el.style.cssText = [
          '--gmpx-color-surface:#0d1710',
          '--gmpx-color-on-surface:#f8fdf8',
          '--gmpx-color-on-surface-variant:#7aaa8a',
          '--gmpx-color-outline:#1e3024',
          '--gmpx-color-primary:#22c55e',
          '--gmpx-font-family-base:DM Sans,sans-serif',
          '--gmpx-font-size-base:14px',
          'width:100%',
        ].join(';');

        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(el);

        el.addEventListener('gmp-placeselect', async ({ place }) => {
          try {
            await place.fetchFields({
              fields: ['displayName', 'formattedAddress', 'addressComponents', 'location', 'id'],
            });
          } catch (_) { /* fetchFields may fail silently */ }
          const lat = place.location?.lat?.() ?? null;
          const lng = place.location?.lng?.() ?? null;
          handleStructured(_extractStructured(
            place.addressComponents, place.formattedAddress, lat, lng, place.id, true
          ));
        });
        return;
      } catch (err) {
        console.warn('PlaceAutocompleteElement unavailable, using legacy Autocomplete:', err.message);
        widgetRef.current = null;
      }
    }

    // ── Legacy Autocomplete fallback ─────────────────────────────────────────
    if (places.Autocomplete && inputRef.current) {
      const ac = new places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'in' },
        types: ['geocode'],
        fields: ['formatted_address', 'address_components', 'geometry', 'place_id'],
      });
      widgetRef.current = ac;
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.geometry) {
          setError('Please select an address from the suggestions');
          onPlaceSelected(null);
          return;
        }
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        handleStructured(_extractStructured(
          place.address_components, place.formatted_address, lat, lng, place.place_id, false
        ));
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsLoaded]);

  useEffect(() => {
    return () => {
      // Cleanup: remove web component from DOM on unmount
      if (usingNewApi && containerRef.current) containerRef.current.innerHTML = '';
      widgetRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIntlSubmit = async () => {
    if (!intlEmail || !intlEmail.includes('@')) return;
    try {
      await apiRequest('/waitlist/international', {
        method: 'POST',
        body: JSON.stringify({ email: intlEmail, ...notIndiaData }),
      });
      setIntlSaved(true);
    } catch (_) {}
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: '#0d1710',
    border: `1px solid ${error ? '#ef4444' : '#1e3024'}`,
    borderRadius: '8px',
    color: '#f8fdf8',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fdf8', marginBottom: '6px' }}>{question.label}</div>
      {question.helper_text && (
        <div style={{ fontSize: '12px', color: '#7aaa8a', marginBottom: '10px', lineHeight: 1.5 }}>{question.helper_text}</div>
      )}
      {/* New API: PlaceAutocompleteElement mounts itself into containerRef */}
      {mapsLoaded && (
        <div ref={containerRef} style={{ width: '100%' }} />
      )}
      {/* Legacy fallback input — shown when Maps not loaded OR new API unavailable */}
      {(!mapsLoaded || !usingNewApi) && (
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => { setInputVal(e.target.value); if (addressData) onPlaceSelected(null); setError(''); setShowNotIndia(false); }}
          placeholder="Start typing your address..."
          style={inputStyle}
          autoComplete="off"
        />
      )}
      {!mapsLoaded && (
        <div style={{ fontSize: '11px', color: '#7aaa8a', marginTop: '4px' }}>Loading address suggestions…</div>
      )}
      {error && (
        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{error}</div>
      )}
      {addressData && !error && (
        <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>
          ✓ {addressData.city}{addressData.state ? ', ' + addressData.state : ''}
        </div>
      )}

      {/* Non-India block */}
      {showNotIndia && (
        <div style={{ marginTop: '12px', padding: '14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '10px' }}>
          <div style={{ fontSize: '13px', color: '#fbbf24', marginBottom: '8px', lineHeight: 1.6 }}>
            Sus10 is currently available in select cities across India. We're expanding soon — drop your email and we'll notify you.
          </div>
          {!intlSaved ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                value={intlEmail}
                onChange={e => setIntlEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ ...inputStyle, flex: 1, fontSize: '13px', padding: '8px 12px' }}
              />
              <button
                type="button"
                onClick={handleIntlSubmit}
                style={{ padding: '8px 16px', background: '#fbbf24', color: '#0a1a0e', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                Notify me
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#22c55e' }}>✓ You're on the list — we'll be in touch!</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Single-select ───────────────────────────────────────────────────────────
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
            <button key={label} type="button" onClick={() => onChange(label)} style={{
              padding: '12px 16px',
              background: selected ? 'rgba(34,197,94,0.15)' : '#111e15',
              border: `1px solid ${selected ? '#22c55e' : '#1e3024'}`,
              borderRadius: '10px',
              color: selected ? '#22c55e' : '#c8ddd0',
              fontSize: '14px', fontWeight: selected ? 600 : 400,
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            }}>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Numeric input ───────────────────────────────────────────────────────────
function areaHint(value) {
  const v = parseFloat(value);
  if (!v || v <= 0) return null;
  if (v <= 200) return { text: 'Small terrace — suitable for container garden and small RWH', color: '#f59e0b' };
  if (v <= 800) return { text: 'Medium terrace — good potential for solar + garden', color: '#22c55e' };
  if (v <= 2000) return { text: 'Large terrace — strong potential across all solutions', color: '#22c55e' };
  return { text: 'Very large roof — excellent potential, recommend professional assessment', color: '#4ade80' };
}

function NumericInputQuestion({ question, value, onChange }) {
  const hint = areaHint(value);
  const val = value ?? '';
  const vNum = parseFloat(val);
  const min = question.validation?.min;
  const max = question.validation?.max;
  const hasError = val !== '' && vNum && (vNum < min || vNum > max);
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fdf8', marginBottom: '6px' }}>{question.label}</div>
      {question.helper_text && (
        <div style={{ fontSize: '12px', color: '#7aaa8a', marginBottom: '12px', lineHeight: 1.5 }}>{question.helper_text}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <input
          type="number" value={val} onChange={e => onChange(e.target.value)}
          min={min} max={max}
          placeholder={`e.g. ${min ? Math.round((min + (max || min * 3)) / 2) : 500}`}
          style={{
            width: '180px', padding: '10px 14px', background: '#0d1710',
            border: `1px solid ${hasError ? '#ef4444' : '#1e3024'}`,
            borderRadius: '8px', color: '#f8fdf8', fontSize: '16px', fontWeight: 600,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <span style={{ fontSize: '13px', color: '#4a6a4a' }}>sq ft</span>
      </div>
      {hasError && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>Please enter a value between {min?.toLocaleString()} and {max?.toLocaleString()} sq ft</div>}
      {hint && !hasError && val !== '' && (
        <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(34,197,94,0.08)', border: `1px solid ${hint.color}40`, borderRadius: '8px', fontSize: '13px', color: hint.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>✦</span> {hint.text}
        </div>
      )}
    </div>
  );
}

// ─── Multi-select ────────────────────────────────────────────────────────────
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
        if (capSelections && without.length >= capSelections) return;
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
        {capSelections && <span style={{ fontSize: '12px', color: selectedCount >= capSelections ? '#22c55e' : '#7aaa8a', fontWeight: 600 }}>{selectedCount}/{capSelections} selected</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
        {opts.map((opt) => {
          const label = typeof opt === 'string' ? opt : opt.label;
          const selected = value.includes(label);
          const atCap = capSelections && selectedCount >= capSelections && !selected;
          const noneSelected = value.includes('None of these');
          const disabled = atCap || (noneSelected && label !== 'None of these');
          return (
            <button key={label} type="button" onClick={() => !disabled && toggle(label)} style={{
              padding: '12px 16px',
              background: selected ? 'rgba(34,197,94,0.15)' : disabled ? 'rgba(17,30,21,0.5)' : '#111e15',
              border: `1px solid ${selected ? '#22c55e' : '#1e3024'}`,
              borderRadius: '10px',
              color: selected ? '#22c55e' : disabled ? '#4a6a4a' : '#c8ddd0',
              fontSize: '14px', fontWeight: selected ? 600 : 400,
              cursor: disabled ? 'not-allowed' : 'pointer',
              textAlign: 'left', transition: 'all 0.15s', opacity: disabled ? 0.6 : 1,
            }}>
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
  const [config, setConfig]           = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError]   = useState(null);
  const [currentPage, setCurrentPage]   = useState(0);
  const [answers, setAnswers]           = useState({});
  const [honeypot, setHoneypot]         = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState(null);
  const [mapsLoaded, setMapsLoaded]     = useState(false);
  const [dialCode, setDialCode]         = useState('+91');

  // Load config
  useEffect(() => {
    apiRequest('/calculator/config')
      .then(data => setConfig(data))
      .catch(err => setConfigError(err.message || 'Failed to load calculator'))
      .finally(() => setConfigLoading(false));
  }, []);

  // Load Google Maps API
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setMapsLoaded(true);
      return;
    }
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    if (document.getElementById('gmaps-script')) return;

    window.__gmapsCallback = () => setMapsLoaded(true);
    const script = document.createElement('script');
    script.id   = 'gmaps-script';
    script.src  = `https://maps.googleapis.com/maps/api/js?loading=async&key=${apiKey}&libraries=places&callback=__gmapsCallback`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => { delete window.__gmapsCallback; };
  }, []);

  const pages    = config?.pages || [];
  const page     = pages[currentPage] || {};
  const questions = page.questions || [];
  const isLastPage = currentPage === pages.length - 1;

  const q1Value = answers['Q1'] || '';

  const isQuestionActive = useCallback((q) => {
    if (!q.show_when) return true;
    return q.show_when.includes(q1Value);
  }, [q1Value]);

  const handleTextGroup = useCallback((field, val) => {
    setAnswers(prev => ({ ...prev, [field]: val }));
  }, []);

  const handlePlaceSelected = useCallback((structured) => {
    setAnswers(prev => ({ ...prev, address_data: structured }));
  }, []);

  const handleSingleSelect = useCallback((qid, val) => {
    setAnswers(prev => ({ ...prev, [qid]: val }));
  }, []);

  const handleMultiSelect = useCallback((qid, val) => {
    setAnswers(prev => ({ ...prev, [qid]: val }));
  }, []);

  // ── Page validation ──────────────────────────────────────────────────────
  const isPageValid = useCallback(() => {
    if (!questions.length) return false;
    for (const q of questions) {
      if (!isQuestionActive(q)) continue;

      if (q.type === 'text_group') {
        const fields = q.fields || [];
        // Name fields
        for (const f of ['first_name', 'last_name']) {
          if (fields.includes(f) && !isValidName(answers[f] || '')) return false;
        }
        // Email
        if (fields.includes('email') && !isValidEmail(answers['email'] || '')) return false;
        // Phone
        if (fields.includes('phone') && !isValidPhone(dialCode, answers['_phone_number'] || '')) return false;
      } else if (q.type === 'address_autocomplete') {
        // Only enforce address selection when Maps API key is configured.
        // If the key is absent the autocomplete never loads and the Next
        // button would be permanently disabled — allow manual progression.
        const mapsKeyConfigured = !!process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (mapsKeyConfigured && !answers.address_data?.city) return false;
      } else if (q.type === 'numeric_input') {
        const raw = answers[q.id];
        const v   = parseFloat(raw);
        const min = q.validation?.min ?? 0;
        const max = q.validation?.max ?? Infinity;
        if (!raw || !v || v < min || v > max) return false;
      } else if (q.scored) {
        const v = answers[q.id];
        if (v === undefined || v === null || v === '') return false;
        if (Array.isArray(v) && v.length === 0) return false;
      } else if (q.validation?.required) {
        const v = answers[q.id];
        if (v === undefined || v === null || v === '') return false;
      }
    }
    return true;
  }, [questions, answers, isQuestionActive, dialCode]);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const addr = answers.address_data || {};
      const mergedAnswers = {
        ...answers,
        phone:           toE164(dialCode, answers._phone_number || ''),
        city:            addr.city      || answers.city  || '',
        state:           addr.state     || answers.state || '',
        display_address: addr.display_address || '',
        lat:             addr.lat,
        lng:             addr.lng,
        place_id:        addr.place_id,
        pincode:         addr.pincode,
      };
      delete mergedAnswers._phone_number;
      delete mergedAnswers.address_data;

      const scoreResult = await apiRequest('/calculator/score', {
        method: 'POST',
        body: JSON.stringify({ answers: mergedAnswers, website: honeypot }),
      });

      const assessmentId = scoreResult.assessment_id;
      await apiRequest('/report/generate', {
        method: 'POST',
        body: JSON.stringify({ assessment_id: assessmentId, email: mergedAnswers.email || '', website: honeypot }),
      });

      navigate(`/report/${assessmentId}`);
    } catch (err) {
      const errorMsg = err.status === 429
        ? "You've submitted several reports recently. Please wait an hour and try again, or write to gp@sus10.ai"
        : (err.detail || err.message || 'Something went wrong. Please try again.');
      setSubmitError(errorMsg);
      setSubmitting(false);
    }
  };

  // ─── Loading states ──────────────────────────────────────────────────────
  if (configLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1710' }}>
        <Loader2 style={{ color: '#22c55e', width: '36px', height: '36px', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }
  if (configError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1710', flexDirection: 'column', gap: '16px' }}>
        <div style={{ color: '#ef4444', fontSize: '18px' }}>Failed to load calculator</div>
        <div style={{ color: '#7aaa8a', fontSize: '14px' }}>{configError}</div>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: '#22c55e', color: '#0a1a0e', borderRadius: '100px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Try Again</button>
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
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1710', padding: '0 0 60px' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} input:focus,select:focus{border-color:#22c55e !important;box-shadow:0 0 0 2px rgba(34,197,94,0.15);}`}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e3024', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Leaf style={{ color: '#22c55e', width: '22px', height: '22px' }} />
        <span style={{ fontSize: '17px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#f8fdf8' }}>Sus10 AI</span>
        <span style={{ fontSize: '13px', color: '#4a6a4a', marginLeft: 'auto' }}>Home Sustainability Assessment</span>
      </div>

      {/* Form card */}
      <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{ background: '#111e15', border: '1px solid #1e3024', borderRadius: '20px', padding: '40px' }}>
          <ProgressBar current={currentPage + 1} total={pages.length} title={page.title || ''} />
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 700, color: '#f8fdf8', marginBottom: '28px', marginTop: 0 }}>
            {page.title}
          </h2>

          {/* Questions */}
          {questions.map((q, qi) => {
            if (q.show_when) {
              if (!q1Value) return null;
              if (!q.show_when.includes(q1Value)) return null;
            }
            const reactKey = `${q.id}_${q.track || qi}`;

            if (q.type === 'text_group') {
              return (
                <TextGroupQuestion
                  key={reactKey}
                  question={q}
                  answers={answers}
                  onFieldChange={handleTextGroup}
                  dialCode={dialCode}
                  onDialChange={setDialCode}
                />
              );
            }
            if (q.type === 'address_autocomplete') {
              return (
                <PlacesAddressField
                  key={reactKey}
                  question={q}
                  mapsLoaded={mapsLoaded}
                  addressData={answers.address_data}
                  onPlaceSelected={handlePlaceSelected}
                />
              );
            }
            if (q.type === 'numeric_input') {
              return (
                <NumericInputQuestion
                  key={reactKey}
                  question={q}
                  value={answers[q.id] || ''}
                  onChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                />
              );
            }
            if (q.type === 'single_select') {
              return (
                <SingleSelectQuestion
                  key={reactKey}
                  question={q}
                  value={answers[q.id] || ''}
                  onChange={(val) => handleSingleSelect(q.id, val)}
                />
              );
            }
            if (q.type === 'multi_select') {
              return (
                <MultiSelectQuestion
                  key={reactKey}
                  question={q}
                  value={answers[q.id] || []}
                  onChange={(val) => handleMultiSelect(q.id, val)}
                />
              );
            }
            // Unknown type — warn and skip rather than crashing the render
            console.warn(`Sus10 calculator: unknown question type "${q.type}" (id=${q.id}) — skipping`);
            return null;
          })}

          {/* Honeypot */}
          <div style={{ display: 'none' }} aria-hidden="true">
            <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
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
                <button type="button" onClick={() => setCurrentPage(p => p - 1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: 'transparent', border: '1px solid #1e3024', borderRadius: '100px', color: '#7aaa8a', fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s' }}>
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
