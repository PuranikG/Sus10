import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, ChevronRight, ChevronLeft, Leaf,
  Sprout, Droplets, Sun, Recycle,
  Home, Building2, Building, Briefcase,
  CheckCircle2, TrendingUp, Sparkles, Maximize2, Check,
} from 'lucide-react';
import { apiRequest, API_URL } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

// ─── Session event helpers (fire-and-forget, never block the UI) ─────────────

function _getUtmParams() {
  const sp = new URLSearchParams(window.location.search);
  return {
    utm_source:   sp.get('utm_source'),
    utm_medium:   sp.get('utm_medium'),
    utm_campaign: sp.get('utm_campaign'),
  };
}

function fireSessionEvent(payload) {
  try {
    fetch(`${API_URL}/session/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch (_) {}
}

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

// ─── Design tokens — Variant D light parchment ───────────────────────────────

const T = {
  bg:          '#F7F5EF',
  card:        '#FFFFFF',
  border:      '#E4E0D7',
  ink:         '#111810',
  muted:       '#6B7564',
  faint:       '#A8A49E',
  surfaceAlt:  '#F0EEE8',
  green:       '#16a34a',
  greenLight:  '#DCFCE7',
  greenBorder: '#86EFAC',
  error:       '#dc2626',
};

const PILLARS = [
  { key: 'greening', label: 'Greening',  Icon: Sprout,   color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   border: '#16a34a', minArea: 1   },
  { key: 'water',    label: 'Rainwater', Icon: Droplets, color: '#0284c7', bg: 'rgba(2,132,199,0.1)',   border: '#0284c7', minArea: 200 },
  { key: 'solar',    label: 'Solar',     Icon: Sun,      color: '#b45309', bg: 'rgba(180,83,9,0.1)',    border: '#b45309', minArea: 400 },
  { key: 'biogas',   label: 'Biogas',    Icon: Recycle,  color: '#0f766e', bg: 'rgba(15,118,110,0.1)', border: '#0f766e', minArea: 800 },
];

const PAGE_INTROS = [
  'This shapes which pillars your rooftop can activate.',
  'No wrong answers — tells us your starting point.',
  'Your personalised report lands here — free, instant, no login.',
];

function getOptionIcon(label) {
  const l = (label || '').toLowerCase();
  if (l.includes('independent') || l.includes('villa')) return Home;
  if (l.includes('row house')) return Home;
  if (l.includes('high-rise') || l.includes('highrise') || l.includes('high rise')) return Building;
  if (l.includes('apartment') || l.includes('mid') || l.includes('low-rise') || l.includes('society') || l.includes('complex')) return Building2;
  if (l.includes('commercial') || l.includes('office') || l.includes('shop') || l.includes('business')) return Briefcase;
  return null;
}

function savingsRange(area) {
  const v = parseFloat(area) || 0;
  if (v <= 0)   return null;
  if (v < 200)  return { range: 'Rs.5k – Rs.15k /yr',  sub: 'Basic potential' };
  if (v < 600)  return { range: 'Rs.15k – Rs.35k /yr', sub: 'Good potential' };
  if (v < 1500) return { range: 'Rs.35k – Rs.65k /yr', sub: 'Strong potential' };
  return          { range: 'Rs.65k+ /yr',               sub: 'Excellent potential' };
}

// ─── Pillar bubbles (progress strip) ─────────────────────────────────────────

function PillarBubbles({ area }) {
  const v = parseFloat(area) || 0;
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {PILLARS.map(p => {
        const unlocked = v >= p.minArea;
        return (
          <div key={p.key} title={p.label} style={{
            width: 28, height: 28, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: unlocked ? p.bg : T.surfaceAlt,
            border: `1.5px solid ${unlocked ? p.border : T.border}`,
            transition: 'all 0.3s',
          }}>
            <p.Icon size={13} color={unlocked ? p.color : T.faint} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Pillar unlock tracker (below terrace area input) ────────────────────────

function PillarUnlockTracker({ area }) {
  const v = parseFloat(area) || 0;
  return (
    <div style={{ background: T.surfaceAlt, borderRadius: 16, padding: '14px 16px', marginTop: 16 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: T.faint, textTransform: 'uppercase', marginBottom: 10 }}>
        Pillars activated at this size
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {PILLARS.map(p => {
          const unlocked = v >= p.minArea;
          return (
            <div key={p.key} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              borderRadius: 10, padding: '8px 10px',
              background: unlocked ? p.bg : 'transparent',
              border: `1px solid ${unlocked ? p.border : T.border}`,
              opacity: unlocked ? 1 : 0.4,
              transition: 'all 0.3s',
            }}>
              <p.Icon size={14} color={unlocked ? p.color : T.faint} />
              <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, fontWeight: 600, color: unlocked ? p.color : T.muted, flex: 1 }}>
                {p.label}
              </span>
              {unlocked && <Check size={12} color={p.color} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Savings hint card ───────────────────────────────────────────────────────

function SavingsHint({ area }) {
  const s = savingsRange(area);
  if (!s) return null;
  return (
    <div style={{
      background: T.greenLight, border: `1px solid ${T.greenBorder}`, borderRadius: 12,
      padding: '12px 16px', marginTop: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: T.green, textTransform: 'uppercase', marginBottom: 3 }}>
          Estimated potential
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: T.green }}>
          {s.range}
        </div>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: T.muted }}>{s.sub}</div>
      </div>
      <TrendingUp size={20} color={T.green} />
    </div>
  );
}

// ─── Phone field ─────────────────────────────────────────────────────────────

function PhoneField({ value, dialCode, onDialChange, onChange }) {
  const valid   = isValidPhone(dialCode, value);
  const showErr = value && value.length > 2 && !valid;
  return (
    <div>
      <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint, marginBottom: 6 }}>
        Phone Number
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={dialCode} onChange={e => onDialChange(e.target.value)} style={{
          padding: '12px 8px', background: T.card, border: `1.5px solid ${T.border}`,
          borderRadius: 12, color: T.ink, fontSize: 13, outline: 'none',
          fontFamily: 'Manrope, sans-serif', flexShrink: 0, cursor: 'pointer',
        }}>
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
            flex: 1, padding: '12px 14px', background: T.card,
            border: `1.5px solid ${showErr ? T.error : T.border}`,
            borderRadius: 12, color: T.ink, fontSize: 14,
            fontFamily: 'Manrope, sans-serif', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
      {showErr && (
        <span style={{ fontSize: 11, color: T.error, marginTop: 3, display: 'block', fontFamily: 'Manrope, sans-serif' }}>
          {dialCode === '+91' ? 'Please enter a valid 10-digit Indian mobile number' : 'Please enter a valid phone number (7–15 digits)'}
        </span>
      )}
    </div>
  );
}

// ─── Text group (first_name, last_name, phone, email) ────────────────────────

function TextGroupQuestion({ question, answers, onFieldChange, dialCode, onDialChange }) {
  const fields       = question.fields || [];
  const nameFields   = fields.filter(f => f === 'first_name' || f === 'last_name');
  const emailFields  = fields.filter(f => f === 'email');
  const phonePresent = fields.includes('phone');

  const labelStyle = {
    display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint, marginBottom: 6,
  };
  const makeInputStyle = (hasErr) => ({
    width: '100%', padding: '12px 14px', fontSize: 14, fontFamily: 'Manrope, sans-serif',
    border: `1.5px solid ${hasErr ? T.error : T.border}`, borderRadius: 12,
    background: T.card, color: T.ink, outline: 'none', boxSizing: 'border-box',
  });
  const LABELS = { first_name: 'First Name', last_name: 'Last Name', email: 'Email Address' };

  const renderField = (field) => {
    const val      = answers[field] || '';
    const isEmail  = field === 'email';
    const isName   = field === 'first_name' || field === 'last_name';
    const emailErr = isEmail && val && !isValidEmail(val);
    const nameErr  = isName  && val && val.length >= 2 && !isValidName(val);
    return (
      <div key={field}>
        <label style={labelStyle}>{LABELS[field] || field}</label>
        <input
          type={isEmail ? 'email' : 'text'}
          value={val}
          onChange={e => onFieldChange(field, e.target.value)}
          style={makeInputStyle(emailErr || nameErr)}
          placeholder={LABELS[field] || field}
        />
        {emailErr && <span style={{ fontSize: 11, color: T.error, marginTop: 3, display: 'block', fontFamily: 'Manrope, sans-serif' }}>Enter a valid email address</span>}
        {nameErr  && <span style={{ fontSize: 11, color: T.error, marginTop: 3, display: 'block', fontFamily: 'Manrope, sans-serif' }}>Please enter a real name</span>}
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 16 }}>{question.label}</div>
      {/* First + Last name: 2-column */}
      {nameFields.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {nameFields.map(renderField)}
        </div>
      )}
      {/* Email: full width */}
      {emailFields.map(f => (
        <div key={f} style={{ marginBottom: 12 }}>{renderField(f)}</div>
      ))}
      {/* Phone: full width */}
      {phonePresent && (
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
    city:    getComp('locality') || getComp('postal_town') || getComp('administrative_area_level_3') || getComp('administrative_area_level_2'),
    state:   getComp('administrative_area_level_1'),
    pincode: getComp('postal_code'),
    lat, lng,
    place_id: placeId,
    _country_code: getComp('country', true),
    _country_name: getComp('country'),
  };
}

function PlacesAddressField({ question, mapsLoaded, addressData, onPlaceSelected }) {
  const containerRef = useRef(null);
  const inputRef     = useRef(null);
  const widgetRef    = useRef(null);
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

    // ── Path A disabled — fetchFields requires Places API v1 billing tier
    // Re-enable by removing `false &&` once billing is confirmed on the key.
    if (false && places.PlaceAutocompleteElement && containerRef.current) {
      try {
        const el = new places.PlaceAutocompleteElement({ includedRegionCodes: ['in'], types: ['geocode'] });
        widgetRef.current = el;
        setUsingNewApi(true);
        el.style.cssText = [
          '--gmpx-color-surface:#FFFFFF',
          '--gmpx-color-on-surface:#111810',
          '--gmpx-color-on-surface-variant:#6B7564',
          '--gmpx-color-outline:#E4E0D7',
          '--gmpx-color-primary:#16a34a',
          '--gmpx-font-family-base:Manrope,sans-serif',
          '--gmpx-font-size-base:14px',
          'width:100%',
        ].join(';');
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(el);
        el.addEventListener('gmp-placeselect', async ({ place }) => {
          try {
            await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'addressComponents', 'location', 'id'] });
          } catch (err) {
            console.warn('fetchFields failed, falling back to legacy autocomplete', err);
            onPlaceSelected(null);
            return;
          }
          if (!place.addressComponents?.length) {
            console.warn('addressComponents empty after fetchFields — place selection aborted');
            onPlaceSelected(null);
            return;
          }
          const lat = place.location?.lat?.() ?? null;
          const lng = place.location?.lng?.() ?? null;
          console.log('City captured:', _extractStructured(place.addressComponents, place.formattedAddress, lat, lng, place.id, true).city || 'none');
          handleStructured(_extractStructured(place.addressComponents, place.formattedAddress, lat, lng, place.id, true));
        });
        return;
      } catch (err) {
        console.warn('PlaceAutocompleteElement unavailable, using legacy Autocomplete:', err.message);
        widgetRef.current = null;
      }
    }

    // ── Legacy Autocomplete (primary path) ───────────────────────────────────
    if (places.Autocomplete && inputRef.current) {
      const ac = new places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'in' },
        types: ['geocode'],
      });
      ac.setFields(['address_components', 'geometry', 'formatted_address', 'place_id', 'name']);
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
        const structured = _extractStructured(place.address_components, place.formatted_address, lat, lng, place.place_id, false);
        console.log('[Sus10] City captured (legacy path):', structured?.city || 'none', '| state:', structured?.state || 'none');
        handleStructured(structured);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsLoaded]);

  useEffect(() => {
    return () => {
      if (usingNewApi && containerRef.current) containerRef.current.innerHTML = '';
      widgetRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIntlSubmit = async () => {
    if (!intlEmail || !intlEmail.includes('@')) return;
    try {
      await apiRequest('/waitlist/international', { method: 'POST', body: JSON.stringify({ email: intlEmail, ...notIndiaData }) });
      setIntlSaved(true);
    } catch (_) {}
  };

  const inputBase = {
    width: '100%', padding: '12px 14px', background: T.card,
    border: `1.5px solid ${error ? T.error : T.border}`,
    borderRadius: 12, color: T.ink, fontSize: 14,
    fontFamily: 'Manrope, sans-serif', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint, marginBottom: 6 }}>
        {question.label}
      </label>
      {question.helper_text && (
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 10, lineHeight: 1.5, fontFamily: 'Manrope, sans-serif' }}>{question.helper_text}</div>
      )}
      {(!mapsLoaded || !usingNewApi) && (
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => { setInputVal(e.target.value); if (addressData) onPlaceSelected(null); setError(''); setShowNotIndia(false); }}
          placeholder="Start typing your address..."
          style={inputBase}
          autoComplete="off"
        />
      )}
      {!mapsLoaded && (
        <div style={{ fontSize: 11, color: T.faint, marginTop: 4, fontFamily: 'Manrope, sans-serif' }}>Loading address suggestions…</div>
      )}
      {error && <div style={{ fontSize: 12, color: T.error, marginTop: 4, fontFamily: 'Manrope, sans-serif' }}>{error}</div>}
      {addressData?.city && !error && (
        <div style={{ fontSize: 12, color: T.green, marginTop: 4, fontFamily: 'Manrope, sans-serif' }}>
          ✓ {addressData.city.charAt(0).toUpperCase() + addressData.city.slice(1)}{addressData.state ? ', ' + addressData.state.charAt(0).toUpperCase() + addressData.state.slice(1) : ''}
        </div>
      )}
      {showNotIndia && (
        <div style={{ marginTop: 12, padding: 14, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 12 }}>
          <div style={{ fontSize: 13, color: '#92400e', marginBottom: 8, lineHeight: 1.6, fontFamily: 'Manrope, sans-serif' }}>
            Sus10 is currently available in select cities across India. We're expanding soon — drop your email and we'll notify you.
          </div>
          {!intlSaved ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="email" value={intlEmail} onChange={e => setIntlEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ ...inputBase, flex: 1, fontSize: 13, padding: '8px 12px' }} />
              <button type="button" onClick={handleIntlSubmit}
                style={{ padding: '8px 16px', background: '#f59e0b', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Manrope, sans-serif', whiteSpace: 'nowrap' }}>
                Notify me
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: T.green, fontFamily: 'Manrope, sans-serif' }}>✓ You're on the list — we'll be in touch!</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Single-select (icon radio cards) ────────────────────────────────────────

function SingleSelectQuestion({ question, value, onChange }) {
  const opts    = question.options || [];
  const useGrid = opts.length <= 4;
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 12 }}>{question.label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: useGrid ? '1fr 1fr' : '1fr', gap: 10 }}>
        {opts.map(opt => {
          const label    = typeof opt === 'string' ? opt : opt.label;
          const hint     = typeof opt === 'object' ? opt.hint : null;
          const selected = value === label;
          const IconComp = getOptionIcon(label);
          return (
            <button key={label} type="button" onClick={() => onChange(label)} style={{
              padding: '14px 16px',
              background:  selected ? T.greenLight : T.card,
              border:      `${selected ? 2 : 1}px solid ${selected ? T.green : T.border}`,
              borderRadius: 16,
              boxShadow:   selected ? `0 0 0 1px ${T.greenBorder}` : '0 2px 8px rgba(0,0,0,0.06)',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: selected ? T.green : T.surfaceAlt,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {IconComp
                  ? <IconComp size={16} color={selected ? '#fff' : T.muted} />
                  : <div style={{ width: 8, height: 8, borderRadius: '50%', background: selected ? '#fff' : T.green }} />
                }
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 600, color: T.ink }}>{label}</div>
              {hint && <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: T.faint }}>{hint}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Numeric input (large JetBrains Mono display + slider) ───────────────────

function NumericInputQuestion({ question, value, onChange, isAreaInput }) {
  const val     = value ?? '';
  const vNum    = parseFloat(val) || 0;
  const min     = question.validation?.min ?? 0;
  const rawMax  = question.validation?.max;
  const max     = rawMax ?? (isAreaInput ? 10000 : 100);
  const sliderMax = isAreaInput ? Math.min(max, 5000) : Math.min(max, 60);
  const hasError  = val !== '' && vNum && min && (vNum < min || (rawMax && vNum > rawMax));
  const unit      = isAreaInput ? 'sq ft' : (question.unit || 'floors');

  return (
    <div style={{ marginBottom: 24 }}>
      {question.helper_text && (
        <div style={{ fontSize: 12, color: T.muted, fontFamily: 'Manrope, sans-serif', marginBottom: 12, lineHeight: 1.5 }}>
          {question.helper_text}
        </div>
      )}
      <div style={{
        background: T.card,
        border: `1px solid ${hasError ? T.error : T.border}`,
        borderRadius: 16, padding: 20, textAlign: 'center',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
          <input
            type="number" value={val} onChange={e => onChange(e.target.value)}
            min={min} max={max} placeholder="0"
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 44, fontWeight: 700,
              color: vNum > 0 ? T.green : T.faint,
              border: 'none', background: 'transparent', outline: 'none',
              width: 140, textAlign: 'center', padding: 0,
            }}
          />
          <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 18, color: T.muted }}>{unit}</span>
        </div>
        <input
          type="range"
          min={min || 0} max={sliderMax} step={isAreaInput ? 50 : 1}
          value={vNum || 0}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', accentColor: T.green, marginTop: 12, display: 'block' }}
        />
      </div>
      {hasError && (
        <div style={{ fontSize: 12, color: T.error, marginTop: 4, fontFamily: 'Manrope, sans-serif' }}>
          Please enter a value between {min?.toLocaleString()} and {rawMax?.toLocaleString()} {unit}
        </div>
      )}
      {isAreaInput && vNum > 0 && (
        <>
          <PillarUnlockTracker area={vNum} />
          <SavingsHint area={vNum} />
        </>
      )}
    </div>
  );
}

// ─── Multi-select (checkbox cards) ───────────────────────────────────────────

function MultiSelectQuestion({ question, value = [], onChange }) {
  const opts          = question.options || [];
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
  const useGrid = opts.length <= 4;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 600, color: T.ink }}>{question.label}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: useGrid ? '1fr 1fr' : '1fr', gap: 10 }}>
        {opts.map(opt => {
          const label    = typeof opt === 'string' ? opt : opt.label;
          const selected = value.includes(label);
          const atCap    = capSelections && selectedCount >= capSelections && !selected;
          const noneSelected = value.includes('None of these');
          const disabled = atCap || (noneSelected && label !== 'None of these');
          const IconComp = getOptionIcon(label);
          return (
            <button key={label} type="button" onClick={() => !disabled && toggle(label)} style={{
              padding: '14px 16px',
              background:  selected ? T.greenLight : disabled ? T.surfaceAlt : T.card,
              border:      `${selected ? 2 : 1}px solid ${selected ? T.green : T.border}`,
              borderRadius: 16,
              boxShadow:   selected ? `0 0 0 1px ${T.greenBorder}` : '0 2px 8px rgba(0,0,0,0.06)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              textAlign: 'left', transition: 'all 0.15s', opacity: disabled ? 0.5 : 1,
              display: 'flex', flexDirection: 'column', gap: 8, position: 'relative',
            }}>
              {selected && (
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <CheckCircle2 size={14} color={T.green} />
                </div>
              )}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: selected ? T.green : T.surfaceAlt,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {IconComp
                  ? <IconComp size={16} color={selected ? '#fff' : T.muted} />
                  : <div style={{ width: 8, height: 8, borderRadius: '50%', background: selected ? '#fff' : T.green }} />
                }
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 600, color: T.ink }}>{label}</div>
            </button>
          );
        })}
      </div>
      {capSelections && (
        <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: T.faint, textAlign: 'center', marginTop: 8 }}>
          {selectedCount}/{capSelections} selected
        </div>
      )}
    </div>
  );
}

// ─── Yes / No toggle ─────────────────────────────────────────────────────────

function YesNoToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
      {['Yes', 'No'].map(opt => {
        const sel = opt === 'Yes' ? value === true : value === false;
        return (
          <button key={opt} type="button" onClick={() => onChange(opt === 'Yes')} style={{
            flex: 1, padding: '12px 0',
            background:  sel ? T.greenLight : T.card,
            border:      `${sel ? 2 : 1}px solid ${sel ? T.green : T.border}`,
            borderRadius: 16,
            boxShadow:   sel ? `0 0 0 1px ${T.greenBorder}` : '0 2px 8px rgba(0,0,0,0.06)',
            color: sel ? T.green : T.muted,
            fontSize: 14, fontWeight: sel ? 700 : 400,
            fontFamily: 'Manrope, sans-serif',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Balcony + boundary wall section (Sprint 5) ───────────────────────────────

function BalconyWallSection({ answers, setAnswers }) {
  const subLabelStyle = {
    display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint, marginBottom: 6,
  };
  const numCardStyle = {
    background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
    padding: '16px 20px', textAlign: 'center', marginTop: 6,
  };
  const numDisplayStyle = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700,
    color: T.green, border: 'none', background: 'transparent', outline: 'none',
    width: 80, textAlign: 'center', padding: 0,
  };

  return (
    <div style={{ marginTop: 8, marginBottom: 28 }}>
      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ flex: 1, height: 1, background: T.border }} />
        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: T.faint, whiteSpace: 'nowrap' }}>
          Optional — helps us calculate your full green potential
        </span>
        <div style={{ flex: 1, height: 1, background: T.border }} />
      </div>

      {/* Section A — Balconies */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 12 }}>
          Do you have balconies?
        </div>
        <YesNoToggle
          value={answers.has_balconies}
          onChange={val => setAnswers(prev => ({
            ...prev,
            has_balconies: val,
            ...(val === false ? { num_balconies: null, balcony_size_category: null } : {}),
          }))}
        />
        {answers.has_balconies === true && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
            <div>
              <label style={subLabelStyle}>Number of balconies</label>
              <div style={numCardStyle}>
                <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                  <input
                    type="number" min="1"
                    value={answers.num_balconies ?? ''}
                    onChange={e => setAnswers(prev => ({ ...prev, num_balconies: e.target.value ? parseInt(e.target.value, 10) : null }))}
                    placeholder="0"
                    style={numDisplayStyle}
                  />
                  <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: T.muted }}>units</span>
                </div>
              </div>
            </div>
            <div>
              <label style={subLabelStyle}>Typical balcony size</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {[
                  { value: 'small',  label: 'Small',  hint: 'Under 30 sq ft' },
                  { value: 'medium', label: 'Medium', hint: '30–60 sq ft' },
                  { value: 'large',  label: 'Large',  hint: 'Over 60 sq ft' },
                ].map(opt => {
                  const sel = answers.balcony_size_category === opt.value;
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => setAnswers(prev => ({ ...prev, balcony_size_category: opt.value }))}
                      style={{
                        padding: '10px 12px',
                        background:  sel ? T.greenLight : T.card,
                        border:      `${sel ? 2 : 1}px solid ${sel ? T.green : T.border}`,
                        borderRadius: 12,
                        display: 'flex', alignItems: 'center', gap: 8,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      }}>
                      <Maximize2 size={12} color={sel ? T.green : T.muted} />
                      <div>
                        <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 600, color: T.ink }}>{opt.label}</div>
                        <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: T.faint }}>{opt.hint}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section B — Boundary Wall */}
      <div>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 12 }}>
          Do you have a boundary or compound wall?
        </div>
        <YesNoToggle
          value={answers.has_boundary_wall}
          onChange={val => setAnswers(prev => ({
            ...prev,
            has_boundary_wall: val,
            ...(val === false ? { boundary_wall_length_ft: null } : {}),
          }))}
        />
        {answers.has_boundary_wall === true && (
          <div style={{ marginTop: 8 }}>
            <label style={subLabelStyle}>Approximate wall length</label>
            <div style={numCardStyle}>
              <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
                <input
                  type="number" min="1"
                  value={answers.boundary_wall_length_ft ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, boundary_wall_length_ft: e.target.value ? parseFloat(e.target.value) : null }))}
                  placeholder="0"
                  style={numDisplayStyle}
                />
                <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 18, color: T.muted }}>ft</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [config, setConfig]             = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError]   = useState(null);
  const [currentPage, setCurrentPage]   = useState(0);
  const [answers, setAnswers]           = useState({});
  const [honeypot, setHoneypot]         = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState(null);
  const [mapsLoaded, setMapsLoaded]     = useState(false);
  const [dialCode, setDialCode]         = useState('+91');
  const [showErrors, setShowErrors]     = useState(false);

  // Session tracking
  const currentPageRef = useRef(0);
  useEffect(() => {
    fireSessionEvent({ event: 'session_start', page: 1, user_agent: navigator.userAgent, referrer: document.referrer || null, ..._getUtmParams() });
    const handleUnload = () => {
      const payload = JSON.stringify({ event: 'session_abandon', page: currentPageRef.current + 1 });
      try { navigator.sendBeacon('/api/session/event', payload); } catch (_) {}
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  useEffect(() => {
    apiRequest('/calculator/config')
      .then(data => setConfig(data))
      .catch(err => setConfigError(err.message || 'Failed to load calculator'))
      .finally(() => setConfigLoading(false));
  }, []);

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) { setMapsLoaded(true); return; }
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

  const pages      = config?.pages || [];
  const page       = pages[currentPage] || {};
  const questions  = page.questions || [];
  const isLastPage = currentPage === pages.length - 1;
  const q1Value    = answers['Q1'] || '';

  // Derive terrace area question ID from config (first numeric_input on page 0 with large max)
  const terraceQId = useMemo(() => {
    const p0 = config?.pages?.[0]?.questions || [];
    return p0.find(q => q.type === 'numeric_input' && (q.validation?.max || 0) > 200)?.id;
  }, [config]);
  const terraceArea = parseFloat(answers[terraceQId] || 0) || 0;

  const isQuestionActive = useCallback((q) => {
    if (!q.show_when) return true;
    return q.show_when.includes(q1Value);
  }, [q1Value]);

  const handleTextGroup    = useCallback((field, val) => { setAnswers(prev => ({ ...prev, [field]: val })); }, []);
  const handleSingleSelect = useCallback((qid, val) => { setAnswers(prev => ({ ...prev, [qid]: val })); }, []);
  const handleMultiSelect  = useCallback((qid, val) => { setAnswers(prev => ({ ...prev, [qid]: val })); }, []);

  const handlePlaceSelected = useCallback((structured) => {
    setAnswers(prev => ({
      ...prev,
      address_data: structured,
      city:  structured ? (structured.city  || '').trim().toLowerCase() : '',
      state: structured ? (structured.state || '').trim().toLowerCase() : '',
    }));
  }, []);

  // ── Page validation (unchanged logic) ────────────────────────────────────
  const isPageValid = useCallback(() => {
    if (!questions.length) return false;
    for (const q of questions) {
      if (!isQuestionActive(q)) continue;
      if (q.type === 'text_group') {
        const fields = q.fields || [];
        for (const f of ['first_name', 'last_name']) {
          if (fields.includes(f) && !isValidName(answers[f] || '')) return false;
        }
        if (fields.includes('email') && !isValidEmail(answers['email'] || '')) return false;
        if (fields.includes('phone') && !isValidPhone(dialCode, answers['_phone_number'] || '')) return false;
      } else if (q.type === 'address_autocomplete') {
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

  // ── Submit (unchanged logic) ──────────────────────────────────────────────
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

      fireSessionEvent({ event: 'session_complete', assessment_id: assessmentId });
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
        <Loader2 style={{ color: T.green, width: 36, height: 36, animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (configError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, flexDirection: 'column', gap: 16 }}>
        <div style={{ color: T.error, fontSize: 18, fontFamily: 'Manrope, sans-serif' }}>Failed to load calculator</div>
        <div style={{ color: T.muted, fontSize: 14, fontFamily: 'Manrope, sans-serif' }}>{configError}</div>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: T.green, color: '#fff', borderRadius: 100, border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'Manrope, sans-serif' }}>
          Try Again
        </button>
      </div>
    );
  }

  if (submitting) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: T.greenLight, border: `2px solid ${T.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Leaf size={32} color={T.green} style={{ animation: 'spin 3s linear infinite' }} />
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: T.ink, marginTop: 24, marginBottom: 12 }}>
          Analysing your rooftop…
        </h2>
        <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14, color: T.muted, lineHeight: 1.65, maxWidth: 280, textAlign: 'center', margin: 0 }}>
          Takes about 15 seconds. Pulling solar radiation, rainfall and building data for your location.
        </p>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────
  const progressPct = Math.round(((currentPage + 1) / Math.max(pages.length, 1)) * 100);
  const savings     = savingsRange(terraceArea);

  return (
    <div className="calculator-shell" style={{ backgroundColor: T.bg, minHeight: '100vh' }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .calculator-shell input[type="number"]::-webkit-outer-spin-button,
        .calculator-shell input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .calculator-shell input[type="number"] { -moz-appearance: textfield; }
        .calculator-shell input:focus, .calculator-shell select:focus {
          border-color: #16a34a !important;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.12) !important;
          outline: none !important;
        }
        .pac-container {
          border-radius: 12px !important;
          border: 1.5px solid #E4E0D7 !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.10) !important;
          font-family: Manrope, sans-serif !important;
        }
        .pac-item { padding: 8px 14px !important; font-size: 13px !important; color: #111810 !important; }
        .pac-item:hover, .pac-item-selected { background: #F7F5EF !important; }
        .pac-item-query { color: #111810 !important; }
        .pac-matched { font-weight: 700 !important; }
      `}</style>

      {/* ── Fixed Header ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: '#FFFFFF', borderBottom: `1px solid ${T.border}`,
        padding: '18px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: T.green, letterSpacing: '0.05em' }}>
          Sus10
        </span>
        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: T.faint }}>
          Free rooftop assessment
        </span>
      </div>

      {/* ── Progress Strip ────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 57, left: 0, right: 0, zIndex: 49,
        background: '#FFFFFF', borderBottom: `1px solid ${T.border}`,
        padding: '14px 20px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: T.faint, textTransform: 'uppercase' }}>
              Step {currentPage + 1} of {pages.length || 3} — {page.title || ''}
            </div>
            {terraceArea > 0 && savings && (
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, fontWeight: 700, color: T.green, marginTop: 2 }}>
                Potential unlocked: {savings.range} ↑
              </div>
            )}
          </div>
          <PillarBubbles area={terraceArea} />
        </div>
        <div style={{ height: 6, borderRadius: 3, background: T.surfaceAlt, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: T.green, borderRadius: 3, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* ── Content Area ─────────────────────────────────────────────────── */}
      <div style={{ paddingTop: 160, paddingLeft: 20, paddingRight: 20, paddingBottom: 120, maxWidth: 500, margin: '0 auto' }}>

        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: T.ink, marginBottom: 8, marginTop: 0 }}>
          {page.title}
        </h2>
        <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14, color: T.muted, lineHeight: 1.6, marginBottom: 28, marginTop: 0 }}>
          {PAGE_INTROS[currentPage] || ''}
        </p>

        {/* Questions */}
        {questions.map((q, qi) => {
          if (q.show_when) {
            if (!q1Value) return null;
            if (!q.show_when.includes(q1Value)) return null;
          }
          const reactKey = `${q.id}_${q.track || qi}`;

          if (q.type === 'text_group') {
            return (
              <TextGroupQuestion key={reactKey} question={q} answers={answers} onFieldChange={handleTextGroup} dialCode={dialCode} onDialChange={setDialCode} />
            );
          }
          if (q.type === 'address_autocomplete') {
            return (
              <PlacesAddressField key={reactKey} question={q} mapsLoaded={mapsLoaded} addressData={answers.address_data} onPlaceSelected={handlePlaceSelected} />
            );
          }
          if (q.type === 'numeric_input') {
            const isAreaInput = q.id === terraceQId || (q.validation?.max || 0) > 200;
            const missingNum  = showErrors && !answers[q.id];
            return (
              <div key={reactKey}>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 8 }}>{q.label}</div>
                <NumericInputQuestion question={q} value={answers[q.id] || ''} onChange={val => setAnswers(prev => ({ ...prev, [q.id]: val }))} isAreaInput={isAreaInput} />
                {missingNum && (
                  <div style={{ fontSize: 12, color: T.error, marginTop: -16, marginBottom: 16, fontFamily: 'Manrope, sans-serif' }}>
                    This field is required
                  </div>
                )}
              </div>
            );
          }
          if (q.type === 'single_select') {
            const missingSelect = showErrors && (q.scored || q.validation?.required) && !answers[q.id];
            return (
              <div key={reactKey}>
                <SingleSelectQuestion question={q} value={answers[q.id] || ''} onChange={val => handleSingleSelect(q.id, val)} />
                {missingSelect && (
                  <div style={{ fontSize: 12, color: T.error, marginTop: -20, marginBottom: 16, fontFamily: 'Manrope, sans-serif' }}>
                    Please select an option to continue
                  </div>
                )}
              </div>
            );
          }
          if (q.type === 'multi_select') {
            const val         = answers[q.id] || [];
            const missingMulti = showErrors && (q.scored || q.validation?.required) && val.length === 0;
            return (
              <div key={reactKey}>
                <MultiSelectQuestion question={q} value={val} onChange={v => handleMultiSelect(q.id, v)} />
                {missingMulti && (
                  <div style={{ fontSize: 12, color: T.error, marginTop: -20, marginBottom: 16, fontFamily: 'Manrope, sans-serif' }}>
                    Please select at least one option to continue
                  </div>
                )}
              </div>
            );
          }
          console.warn(`Sus10 calculator: unknown question type "${q.type}" (id=${q.id}) — skipping`);
          return null;
        })}

        {/* Balcony & boundary wall — page 0 only (Sprint 5) */}
        {currentPage === 0 && (
          <BalconyWallSection answers={answers} setAnswers={setAnswers} />
        )}

        {/* Planting density slider — page 2 only, authenticated users only */}
        {isAuthenticated && currentPage === 1 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 6 }}>Planting Density</div>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>
              How densely do you want to plant? Higher density = more plants but more maintenance.
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <input
                  type="range" min="0.5" max="3" step="0.5"
                  value={answers.planting_density || 1}
                  onChange={e => setAnswers(prev => ({ ...prev, planting_density: parseFloat(e.target.value) }))}
                  style={{ flex: 1, accentColor: T.green }}
                />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: T.green, minWidth: 100, textAlign: 'right' }}>
                  {answers.planting_density || 1} plants/sq ft
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Manrope, sans-serif', fontSize: 11, color: T.faint, marginTop: 4 }}>
                <span>0.5 — Light</span>
                <span>1.0 — Standard</span>
                <span>3.0 — Dense</span>
              </div>
            </div>
          </div>
        )}

        {/* Savings confirmation — last page only */}
        {isLastPage && terraceArea > 0 && savings && (
          <div style={{ background: T.greenLight, border: `1px solid ${T.greenBorder}`, borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: T.green, lineHeight: 1.5, margin: 0 }}>
              Based on your answers, your rooftop could save <strong>{savings.range}</strong> per year. Your full breakdown is one step away.
            </p>
          </div>
        )}

        {/* Honeypot */}
        <div style={{ display: 'none' }} aria-hidden="true">
          <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
        </div>

        {/* Submit error */}
        {submitError && (
          <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, color: T.error, fontSize: 14, fontFamily: 'Manrope, sans-serif', marginBottom: 20 }}>
            {submitError}
          </div>
        )}
      </div>

      {/* ── Sticky Nav ───────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '100%', maxWidth: 500,
          background: `linear-gradient(to top, ${T.bg} 55%, transparent)`,
          padding: '16px 20px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            {currentPage > 0 && (
              <button type="button" onClick={() => { setShowErrors(false); setCurrentPage(p => p - 1); }} style={{
                border: `1px solid ${T.border}`, borderRadius: 12, background: 'transparent',
                padding: '12px 20px', fontSize: 14, color: T.muted,
                fontFamily: 'Manrope, sans-serif', cursor: 'pointer',
              }}>
                ← Back
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isPageValid()) { setShowErrors(true); return; }
              setShowErrors(false);
              if (isLastPage) handleSubmit(); else setCurrentPage(p => p + 1);
            }}
            style={{
              background: T.green, color: '#FFFFFF', borderRadius: 12,
              padding: '12px 28px', fontSize: 14, fontWeight: 700,
              fontFamily: 'Manrope, sans-serif',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(22,163,74,0.30)',
            }}
          >
            {isLastPage
              ? <><span>Get my free report</span><Sparkles size={16} /></>
              : 'Continue →'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
