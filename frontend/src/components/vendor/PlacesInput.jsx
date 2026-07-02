import { useEffect, useRef } from 'react';

/**
 * Google Places Autocomplete input.
 * Requires Maps JS API loaded with &libraries=places (already in index.html).
 *
 * Props:
 *   value        — controlled display value
 *   onChange     — called with the raw string as user types
 *   onPlaceSelect — called with { address, city, lat, lng } when a suggestion is picked
 *   placeholder  — input placeholder text
 *   className    — extra classes (merged with base Input styling)
 */
export default function PlacesInput({ value, onChange, onPlaceSelect, placeholder = 'Search address…', className = '' }) {
  const inputRef = useRef(null);
  const acRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    function init() {
      if (cancelled || !inputRef.current) return;
      if (!window.google?.maps?.places) {
        setTimeout(init, 300);
        return;
      }
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'in' },
        fields: ['geometry', 'formatted_address', 'address_components', 'name'],
      });
      acRef.current = ac;

      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place?.geometry?.location) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const addr = place.formatted_address || place.name || '';

        // Pull city from address_components
        const comps = place.address_components || [];
        const cityComp =
          comps.find(c => c.types.includes('locality')) ||
          comps.find(c => c.types.includes('administrative_area_level_2')) ||
          comps.find(c => c.types.includes('administrative_area_level_1'));

        onChange?.(addr);
        onPlaceSelect?.({ address: addr, city: cityComp?.long_name || '', lat, lng });
      });
    }

    init();
    return () => {
      cancelled = true;
      if (acRef.current) {
        window.google?.maps?.event?.clearInstanceListeners?.(acRef.current);
      }
    };
  }, []);

  // Keep input value in sync when controlled value changes externally
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value = value || '';
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      defaultValue={value || ''}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      className={[
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1',
        'text-sm shadow-sm transition-colors placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      ].join(' ')}
    />
  );
}
