import { useEffect, useRef, useState } from 'react';
import { MapPin, Target, Pencil } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * Google Maps satellite view for a vendor project.
 *
 * Props:
 *   buildings          — array of building survey objects
 *   complexLat/Lng     — project-level coords (stored when address was picked with Places)
 *   complexAddress     — fallback: geocode this string if no lat/lng
 *   onBuildingLocated  — (surveyId, lat, lng) => void — called when user confirms a pin
 */
export default function ProjectMap({ buildings = [], complexLat, complexLng, complexAddress, onBuildingLocated }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const clickListenerRef = useRef(null);

  const [placingId, setPlacingId] = useState(null); // survey_id of building being pinned/moved

  const locatedBuildings = buildings.filter(b => b.latitude && b.longitude);
  const unlocatedBuildings = buildings.filter(b => !b.latitude || !b.longitude);

  // The building currently being placed/moved (search all, not just unlocated)
  const buildingToPlace = buildings.find(b => b.survey_id === placingId);
  const isMovingExisting = !!(buildingToPlace?.latitude && buildingToPlace?.longitude);

  useEffect(() => {
    let cancelled = false;

    function drawMarkers(map) {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      if (!infoWindowRef.current) {
        infoWindowRef.current = new window.google.maps.InfoWindow();
      }

      locatedBuildings.forEach((building, idx) => {
        // Hide the green marker while the orange drag marker is active for this building
        if (building.survey_id === placingId) return;

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

    function attachDragPin(map) {
      if (clickListenerRef.current) {
        window.google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
      if (map._placingMarker) {
        map._placingMarker.setMap(null);
        map._placingMarker = null;
      }

      if (!placingId || !onBuildingLocated) {
        map.setOptions({ cursor: '' });
        return;
      }

      map.setOptions({ cursor: '' });

      // Start the drag marker at existing coords if moving, otherwise at map center
      const building = buildings.find(b => b.survey_id === placingId);
      const startPos = building?.latitude && building?.longitude
        ? { lat: parseFloat(building.latitude), lng: parseFloat(building.longitude) }
        : map.getCenter();

      const dragMarker = new window.google.maps.Marker({
        position: startPos,
        map,
        draggable: true,
        title: 'Drag to exact location, then click Confirm',
        animation: window.google.maps.Animation.DROP,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: '#f59e0b',
          fillOpacity: 1,
          strokeColor: '#0d1710',
          strokeWeight: 2,
        },
        label: { text: '📍', fontSize: '16px' },
        zIndex: 999,
      });
      map._placingMarker = dragMarker;

      // Pan to the drag marker if moving an existing pin
      if (building?.latitude && building?.longitude) {
        map.panTo(startPos);
      }
    }

    function init() {
      if (cancelled || !containerRef.current) return;
      if (!window.google?.maps) { setTimeout(init, 300); return; }

      if (mapRef.current) {
        attachDragPin(mapRef.current);
        drawMarkers(mapRef.current);
        return;
      }

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
      attachDragPin(map);

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

  const cancelPlacing = () => {
    const map = mapRef.current;
    if (map?._placingMarker) { map._placingMarker.setMap(null); map._placingMarker = null; }
    setPlacingId(null);
  };

  const confirmPlacement = () => {
    const map = mapRef.current;
    if (!map?._placingMarker) return;
    const pos = map._placingMarker.getPosition();
    onBuildingLocated(placingId, pos.lat(), pos.lng());
    map._placingMarker.setMap(null);
    map._placingMarker = null;
    setPlacingId(null);
  };

  return (
    <div className="space-y-3">
      {/* Placing / moving mode banner */}
      {placingId && buildingToPlace && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/40 rounded-lg px-4 py-2.5 text-sm">
          <Target className="h-4 w-4 text-amber-500 animate-pulse flex-shrink-0" />
          <span className="text-amber-600 dark:text-amber-400 font-medium flex-1">
            {isMovingExisting
              ? <>Drag the <strong>orange pin</strong> to the correct location for <strong>{buildingToPlace.building_name}</strong>, then confirm</>
              : <>Drag the <strong>orange pin</strong> to <strong>{buildingToPlace.building_name}</strong>, then confirm</>
            }
          </span>
          <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-black" onClick={confirmPlacement}>
            Confirm Location
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelPlacing}>
            Cancel
          </Button>
        </div>
      )}

      {/* Map */}
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden border border-border" style={{ height: '460px' }} />

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {/* Located buildings — show with move-pin button */}
        {locatedBuildings.map((b, i) => (
          <div
            key={b.survey_id}
            className={`group flex items-center gap-1.5 text-xs rounded-full px-3 py-1 border transition-colors ${
              placingId === b.survey_id
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40'
                : 'bg-primary/10 text-primary border-primary/20'
            }`}
          >
            <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px]">
              {i + 1}
            </span>
            {b.building_name}
            <button
              onClick={() => setPlacingId(b.survey_id === placingId ? null : b.survey_id)}
              title="Move pin to correct location"
              className="ml-1 opacity-0 group-hover:opacity-100 hover:text-amber-500 transition-opacity"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}

        {/* Unlocated buildings — pin on map */}
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
