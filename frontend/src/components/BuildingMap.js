import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Leaf, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { getBuildingTypeLabel, getAQILevel } from '../lib/utils';

export default function BuildingMap({ buildings, center, zoom = 12, onBuildingClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const navigate = useNavigate();
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (!window.google || !mapRef.current) return;

      try {
        const { Map } = await window.google.maps.importLibrary('maps');
        const { AdvancedMarkerElement } = await window.google.maps.importLibrary('marker');

        const mapOptions = {
          center: center || { lat: 28.4595, lng: 77.0266 }, // Default to Gurugram
          zoom: zoom,
          mapId: 'sus10_map', // Required for AdvancedMarkerElement
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        };

        mapInstanceRef.current = new Map(mapRef.current, mapOptions);
        infoWindowRef.current = new window.google.maps.InfoWindow();
        
        setMapReady(true);
      } catch (error) {
        console.error('Map initialization error:', error);
      }
    };

    initMap();

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => {
        if (marker.setMap) marker.setMap(null);
      });
      markersRef.current = [];
    };
  }, [center, zoom]);

  // Update markers when buildings change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !buildings.length) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker.setMap) marker.setMap(null);
    });
    markersRef.current = [];

    // Add new markers
    buildings.forEach(building => {
      if (!building.latitude || !building.longitude) return;

      const position = { lat: building.latitude, lng: building.longitude };
      
      // Create custom marker element
      const markerDiv = document.createElement('div');
      markerDiv.className = 'custom-marker';
      markerDiv.innerHTML = `
        <div style="
          background: ${building.is_approved ? '#22c55e' : '#f59e0b'};
          color: white;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          border: 3px solid white;
          transition: transform 0.2s;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
            <path d="M9 22v-4h6v4"/>
            <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/>
          </svg>
        </div>
      `;

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: position,
        content: markerDiv,
        title: building.address,
      });

      // Add click listener
      marker.addListener('click', () => {
        const aqiInfo = building.current_aqi ? getAQILevel(building.current_aqi) : null;
        
        const content = `
          <div style="padding: 12px; max-width: 280px; font-family: system-ui, sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111;">
              ${building.address}
            </h3>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">
              📍 ${building.city} • ${getBuildingTypeLabel(building.building_type)}
            </p>
            <div style="display: flex; gap: 16px; margin-bottom: 12px;">
              ${building.building_footprint_area ? `
                <div>
                  <div style="font-size: 18px; font-weight: 700; color: #22c55e;">
                    ${building.building_footprint_area.toLocaleString()}
                  </div>
                  <div style="font-size: 11px; color: #888;">sqm footprint</div>
                </div>
              ` : ''}
              ${building.usable_terrace_area ? `
                <div>
                  <div style="font-size: 18px; font-weight: 700; color: #3b82f6;">
                    ${building.usable_terrace_area.toLocaleString()}
                  </div>
                  <div style="font-size: 11px; color: #888;">sqm terrace</div>
                </div>
              ` : ''}
              ${aqiInfo ? `
                <div>
                  <div style="font-size: 18px; font-weight: 700; color: ${aqiInfo.color.replace('text-', '')};">
                    ${building.current_aqi}
                  </div>
                  <div style="font-size: 11px; color: #888;">AQI</div>
                </div>
              ` : ''}
            </div>
            <button 
              onclick="window.location.href='/buildings/${building.building_id}'"
              style="
                width: 100%;
                padding: 8px 16px;
                background: #22c55e;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
              "
            >
              View Report →
            </button>
          </div>
        `;

        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (buildings.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      buildings.forEach(b => {
        if (b.latitude && b.longitude) {
          bounds.extend({ lat: b.latitude, lng: b.longitude });
        }
      });
      mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
    } else if (buildings.length === 1 && buildings[0].latitude) {
      mapInstanceRef.current.setCenter({ 
        lat: buildings[0].latitude, 
        lng: buildings[0].longitude 
      });
      mapInstanceRef.current.setZoom(15);
    }

  }, [buildings, mapReady, navigate]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-border">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span>Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500" />
            <span>Pending</span>
          </div>
        </div>
      </div>

      {/* Building count */}
      <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border">
        <span className="text-sm font-medium">{buildings.length} buildings</span>
      </div>
    </div>
  );
}
