import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

/**
 * Google Maps view for a vendor project.
 * Shows all buildings with lat/lng as markers; info window on click.
 *
 * Props:
 *   buildings  — array of building survey objects (need .latitude, .longitude, .building_name)
 *   complexLat — project complex latitude (map center fallback)
 *   complexLng — project complex longitude
 */
export default function ProjectMap({ buildings = [], complexLat, complexLng }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const locatedBuildings = buildings.filter(b => b.latitude && b.longitude);

  useEffect(() => {
    let cancelled = false;

    function init() {
      if (cancelled || !containerRef.current) return;
      if (!window.google?.maps) {
        setTimeout(init, 300);
        return;
      }

      // Determine center: prefer complex coords, else average of buildings, else Mumbai
      let center = { lat: 19.076, lng: 72.8777 };
      if (complexLat && complexLng) {
        center = { lat: complexLat, lng: complexLng };
      } else if (locatedBuildings.length > 0) {
        const avgLat = locatedBuildings.reduce((s, b) => s + parseFloat(b.latitude), 0) / locatedBuildings.length;
        const avgLng = locatedBuildings.reduce((s, b) => s + parseFloat(b.longitude), 0) / locatedBuildings.length;
        center = { lat: avgLat, lng: avgLng };
      }

      const map = new window.google.maps.Map(containerRef.current, {
        center,
        zoom: locatedBuildings.length > 0 ? 16 : 12,
        mapTypeId: 'satellite',
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [],
      });
      mapRef.current = map;

      // Clear old markers
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      if (locatedBuildings.length === 0) return;

      const infoWindow = new window.google.maps.InfoWindow();

      locatedBuildings.forEach((building, idx) => {
        const lat = parseFloat(building.latitude);
        const lng = parseFloat(building.longitude);
        const geo = building.geo_enrichment;

        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map,
          title: building.building_name,
          label: {
            text: String(idx + 1),
            color: '#0d1710',
            fontWeight: 'bold',
            fontSize: '12px',
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 16,
            fillColor: '#4ade80',
            fillOpacity: 1,
            strokeColor: '#0d1710',
            strokeWeight: 2,
          },
        });

        const solarLine = geo?.solar?.max_kwp
          ? `<div style="color:#fbbf24">☀️ ${geo.solar.max_kwp} kWp · ${geo.solar.max_panels} panels</div>`
          : '';
        const aqiLine = geo?.aqi?.aqi != null
          ? `<div style="color:#38bdf8">💨 AQI ${geo.aqi.aqi} · ${geo.aqi.category || ''}</div>`
          : '';
        const rooftopLine = building.rooftop?.area_sqft
          ? `<div style="color:#d7e8dd">Rooftop: ${building.rooftop.area_sqft.toLocaleString()} sqft</div>`
          : '';

        marker.addListener('click', () => {
          infoWindow.setContent(`
            <div style="font-family:Manrope,sans-serif;min-width:180px;padding:4px 0">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px">${building.building_name}</div>
              <div style="font-size:11px;color:#6b7280;margin-bottom:6px">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
              ${rooftopLine}${solarLine}${aqiLine}
            </div>
          `);
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });

      // Fit bounds if multiple buildings
      if (locatedBuildings.length > 1) {
        const bounds = new window.google.maps.LatLngBounds();
        locatedBuildings.forEach(b => bounds.extend({ lat: parseFloat(b.latitude), lng: parseFloat(b.longitude) }));
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      }
    }

    init();
    return () => { cancelled = true; };
  }, [buildings, complexLat, complexLng]);

  if (locatedBuildings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MapPin className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground font-medium">No coordinates yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Add an address when creating or editing a building — coordinates are set automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>{locatedBuildings.length} building{locatedBuildings.length !== 1 ? 's' : ''} mapped</span>
        <span className="text-xs">Click a marker for details</span>
      </div>
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden border border-border" style={{ height: '480px' }} />
      <div className="flex flex-wrap gap-2">
        {locatedBuildings.map((b, i) => (
          <div key={b.survey_id} className="flex items-center gap-1.5 text-xs bg-muted rounded-full px-3 py-1">
            <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
            {b.building_name}
          </div>
        ))}
      </div>
    </div>
  );
}
