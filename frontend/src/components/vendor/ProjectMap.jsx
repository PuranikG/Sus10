import { useEffect, useRef, useState } from 'react';
import { MapPin, Target } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * Google Maps satellite view for a vendor project.
 *
 * Props:
 *   buildings          — array of building survey objects
 *   complexLat/Lng     — project-level coords (stored when address was picked with Places)
 *   complexAddress     — fallback: geocode this string if no lat/lng
 *   onBuildingLocated  — (surveyId, lat, lng) => void — called when user clicks map to pin a building
 */
export default function ProjectMap({ buildings = [], complexLat, complexLng, complexAddress, onBuildingLocated }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const clickListenerRef = useRef(null);

  const [placingId, setPlacingId] = useState(null); // survey_id of building being pinned

  const locatedBuildings = buildings.filter(b => b.latitude && b.longitude);
  const unlocatedBuildings = buildings.filter(b => !b.latitude || !b.longitude);

  // Re-draw markers whenever buildings or placing state changes
  useEffect(() => {
    let cancelled = false;

    function drawMarkers(map) {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      if (!infoWindowRef.current) {
        infoWindowRef.current = new window.google.maps.InfoWindow();
      }

      locatedBuildings.forEach((building, idx) => {
        const lat = parseFloat(building.latitude);
        const lng = parseFloat(building.longitude);
        const geo = building.geo_enrichment;

        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map,
          title: building.building_name,
          label: { text: String(idx + 1), color: '#0d1710', fontWeight: 'bold', fontSize: '12px' },
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
          ? `<div style="color:#fbbf24;margin-top:4px">☀️ ${geo.solar.max_kwp} kWp · ${geo.solar.max_panels} panels</div>` : '';
        const aqiLine = geo?.aqi?.aqi != null
          ? `<div style="color:#38bdf8">💨 AQI ${geo.aqi.aqi} · ${geo.aqi.category || ''}</div>` : '';
        const rooftopLine = building.rooftop?.area_sqft
          ? `<div style="color:#555">Rooftop: ${Number(building.rooftop.area_sqft).toLocaleString()} sqft</div>` : '';

        marker.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div style="font-family:Manrope,sans-serif;min-width:180px;padding:4px 0">
              <div style="font-weight:700;font-size:14px;margin-bottom:2px">${building.building_name}</div>
              <div style="font-size:11px;color:#6b7280;margin-bottom:4px">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
              ${rooftopLine}${solarLine}${aqiLine}
            </div>
          `);
          infoWindowRef.current.open(map, marker);
        });

        markersRef.current.push(marker);
      });

      if (locatedBuildings.length > 1) {
        const bounds = new window.google.maps.LatLngBounds();
        locatedBuildings.forEach(b => bounds.extend({ lat: parseFloat(b.latitude), lng: parseFloat(b.longitude) }));
        map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
      }
    }

    function attachClickHandler(map) {
      if (clickListenerRef.current) {
        window.google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
      if (!placingId || !onBuildingLocated) return;

      map.setOptions({ cursor: 'crosshair' });
      clickListenerRef.current = map.addListener('click', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        onBuildingLocated(placingId, lat, lng);
        setPlacingId(null);
      });
    }

    function init() {
      if (cancelled || !containerRef.current) return;
      if (!window.google?.maps) { setTimeout(init, 300); return; }

      if (mapRef.current) {
        // Map already exists — just redraw markers and click handler
        attachClickHandler(mapRef.current);
        drawMarkers(mapRef.current);
        if (!placingId) mapRef.current.setOptions({ cursor: '' });
        return;
      }

      // First init: determine center
      const defaultCenter = { lat: 19.076, lng: 72.8777 };
      let center = defaultCenter;
      let zoom = 13;

      if (complexLat && complexLng) {
        center = { lat: Number(complexLat), lng: Number(complexLng) };
        zoom = 16;
      } else if (locatedBuildings.length > 0) {
        const avgLat = locatedBuildings.reduce((s, b) => s + parseFloat(b.latitude), 0) / locatedBuildings.length;
        const avgLng = locatedBuildings.reduce((s, b) => s + parseFloat(b.longitude), 0) / locatedBuildings.length;
        center = { lat: avgLat, lng: avgLng };
        zoom = 16;
      }

      const map = new window.google.maps.Map(containerRef.current, {
        center,
        zoom,
        mapTypeId: 'satellite',
        tilt: 0,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });
      mapRef.current = map;

      drawMarkers(map);
      attachClickHandler(map);

      // Geocode complexAddress if still using default center
      if (!complexLat && !complexLng && locatedBuildings.length === 0 && complexAddress) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: complexAddress + ', India' }, (results, status) => {
          if (cancelled || status !== 'OK' || !results[0]) return;
          map.setCenter(results[0].geometry.location);
          map.setZoom(16);
        });
      }
    }

    init();
    return () => { cancelled = true; };
  }, [buildings, complexLat, complexLng, complexAddress, placingId]);

  const buildingToPlace = unlocatedBuildings.find(b => b.survey_id === placingId);

  return (
    <div className="space-y-3">
      {/* Placing-mode banner */}
      {placingId && buildingToPlace && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2.5 text-sm">
          <Target className="h-4 w-4 text-primary animate-pulse flex-shrink-0" />
          <span className="text-primary font-medium">
            Click anywhere on the map to place <strong>{buildingToPlace.building_name}</strong>
          </span>
          <Button size="sm" variant="ghost" className="ml-auto h-6 text-xs" onClick={() => setPlacingId(null)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Map */}
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden border border-border" style={{ height: '460px' }} />

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {locatedBuildings.map((b, i) => (
          <div key={b.survey_id} className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-full px-3 py-1">
            <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
            {b.building_name}
          </div>
        ))}
        {unlocatedBuildings.map(b => (
          <button
            key={b.survey_id}
            onClick={() => setPlacingId(b.survey_id === placingId ? null : b.survey_id)}
            className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1 border transition-colors ${
              placingId === b.survey_id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:border-primary hover:text-primary'
            }`}
          >
            <MapPin className="h-3 w-3" />
            {b.building_name}
            <span className="text-[10px] opacity-70">· pin on map</span>
          </button>
        ))}
      </div>

      {unlocatedBuildings.length > 0 && !placingId && (
        <p className="text-xs text-muted-foreground px-1">
          {unlocatedBuildings.length} building{unlocatedBuildings.length > 1 ? 's' : ''} without coordinates —
          click the chip above to place on map, or add an address in the building form.
        </p>
      )}
    </div>
  );
}
