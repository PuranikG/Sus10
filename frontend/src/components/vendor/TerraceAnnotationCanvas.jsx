/**
 * TerraceAnnotationCanvas
 *
 * Interactive satellite image overlay for rooftop AI analysis.
 * Layout: [filter strip | canvas | grouped sidebar]
 *
 * Polygon editing:
 *   - Drag a corner node to move it
 *   - Click the small square midpoint handle between two nodes to insert a new node
 *   - Double-click a corner node to remove it (minimum 3 nodes)
 *   - Yellow ↻ handle above first edge to rotate the entire polygon
 *   - Drag the polygon body to move the whole shape
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  X, RotateCcw, CheckCircle2, Loader2, Zap, Leaf, Maximize2, Info,
  Brain, Cpu, ZoomIn, ZoomOut, Eye, EyeOff, ChevronRight,
} from 'lucide-react';

// ── Colors per box type ──────────────────────────────────────────────────────
const BOX_STYLES = {
  boundary:   { stroke: '#60a5fa', fill: 'none',       label: 'Boundary',   dash: '12 5' },
  obstacle:   { stroke: '#f87171', fill: '#f8717130',  label: 'Obstacle',   dash: null   },
  shadow:     { stroke: '#fbbf24', fill: '#fbbf2430',  label: 'Shadow',     dash: null   },
  vegetation: { stroke: '#4ade80', fill: '#4ade8030',  label: 'Vegetation', dash: null   },
};

const PROVIDER_ICON = { gemini: '✦', claude: '◆', auto: '⬡' };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Polygon helpers ──────────────────────────────────────────────────────────
function shoelaceArea(pts) {
  const n = pts.length;
  let a = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

function centroid(pts) {
  return [
    pts.reduce((s, [x]) => s + x, 0) / pts.length,
    pts.reduce((s, [, y]) => s + y, 0) / pts.length,
  ];
}

function rotatePoint([x, y], [cx, cy], angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos];
}

function box2dToPoints([y1, x1, y2, x2]) {
  return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
}

function ptsStr(pts) {
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

// Ray-casting point-in-polygon — used for zone filtering
function pointInPolygon([px, py], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ── Per-building zone suggestions ────────────────────────────────────────────
// Given the other buildings in the project (with lat/lng) and the satellite
// image center + zoom, compute where each building appears in canvas space
// (0–1000) and create a labelled boundary zone placeholder for it.
//
// Users can then resize these with the N-node polygon tools to trace the
// actual roof edge, and the Zone filter will correctly isolate each wing's
// obstacles.
//
// Projection math:
//   Google Maps Static API (scale=2) → 1280 effective pixels → canvas 1000 units
//   metersPerPixel = earthCirc × cos(lat) / (256 × 2^zoom × 2)
//   canvasUnitsPerMeter = (1000 / 1280) / metersPerPixel
function otherBuildingsToZones(otherBuildings, centerLat, centerLng, zoomUsed) {
  if (!otherBuildings?.length || !centerLat || !centerLng || !zoomUsed) return [];
  const EARTH_CIRC  = 40_075_017;
  const GOOGLE_PX   = 640 * 2; // scale=2
  const latRad      = centerLat * Math.PI / 180;
  const mPerPx      = EARTH_CIRC * Math.cos(latRad) / (256 * Math.pow(2, zoomUsed) * 2);
  const cvPerM      = (1000 / GOOGLE_PX) / mPerPx;

  return otherBuildings
    .filter(b => b.latitude && b.longitude)
    .map(b => {
      const lat = parseFloat(b.latitude);
      const lng = parseFloat(b.longitude);
      const eastM  = (lng - centerLng) * 111320 * Math.cos(latRad);
      const northM = (lat - centerLat) * 111320;
      const px = 500 + eastM * cvPerM;
      const py = 500 - northM * cvPerM;
      if (px < -160 || px > 1160 || py < -160 || py > 1160) return null;
      // 160×160 canvas-unit square, centered on the building pin
      const h = 80;
      return {
        id: `zone_${b.survey_id}`,
        type: 'boundary',
        label: b.building_name ? `${b.building_name} Boundary` : 'Building Zone',
        points: [[px-h,py-h],[px+h,py-h],[px+h,py+h],[px-h,py+h]],
        isAutoZone: true,
      };
    })
    .filter(Boolean);
}

// ── Parse AI analysis → box array ───────────────────────────────────────────
function analysisToBoxes(analysis, buildingName) {
  if (!analysis) return [];
  const boxes = [];
  if (analysis.building_boundary_box?.length === 4) {
    boxes.push({
      id: 'boundary',
      type: 'boundary',
      label: buildingName ? `${buildingName} Boundary` : 'Building Boundary',
      points: box2dToPoints(analysis.building_boundary_box),
    });
  }
  (analysis.detected_objects || []).forEach((obj, i) => {
    if (!obj.box_2d?.length) return;
    boxes.push({ id: `obj_${i}`, type: 'obstacle', label: (obj.label || 'obstacle').replace(/_/g, ' '), points: box2dToPoints(obj.box_2d), confidence: obj.confidence });
  });
  (analysis.shadow_regions || []).forEach((sr, i) => {
    if (!sr.box_2d?.length) return;
    boxes.push({ id: `shadow_${i}`, type: 'shadow', label: `Shadow — ${(sr.source || 'unknown').replace(/_/g, ' ')}`, points: box2dToPoints(sr.box_2d) });
  });
  if (analysis.existing_vegetation?.present) {
    const vb = analysis.existing_vegetation.box_2d;
    if (vb?.length === 4) boxes.push({ id: 'vegetation_0', type: 'vegetation', label: (analysis.existing_vegetation.type || 'vegetation').replace(/_/g, ' '), points: box2dToPoints(vb) });
  }
  return boxes;
}

// ── Calculations ─────────────────────────────────────────────────────────────
function recalculate(boxes, footprintSqft) {
  const boundary = boxes.find(b => b.type === 'boundary');
  if (!boundary || footprintSqft <= 0) return null;
  const bArea = shoelaceArea(boundary.points);
  if (bArea <= 0) return null;
  const obstacleArea = boxes.filter(b => b.type === 'obstacle').reduce((s, b) => s + shoelaceArea(b.points), 0);
  const shadowArea   = boxes.filter(b => b.type === 'shadow').reduce((s, b) => s + shoelaceArea(b.points), 0);
  const obstaclePct  = Math.min(50, (obstacleArea / bArea) * 100);
  const shadowPct    = Math.min(50, (shadowArea   / bArea) * 100);
  const usablePct    = Math.max(5, 100 - obstaclePct - shadowPct);
  const usableSqft   = Math.round(footprintSqft * (usablePct / 100));
  const solarKw      = Math.round((usableSqft / 71.7) * 10) / 10;
  const annualKwh    = Math.round(solarKw * 1800);
  const plants       = Math.floor(usableSqft / 2.7);
  return {
    usable_pct: Math.round(usablePct), usable_sqft: usableSqft,
    obstacle_pct: Math.round(obstaclePct), shadow_pct: Math.round(shadowPct),
    solar_kw: solarKw, annual_kwh: annualKwh,
    savings_inr_yr1: Math.round(annualKwh * 8),
    co2_solar_tonnes_yr: Math.round(annualKwh * 0.00082 * 10) / 10,
    plants, co2_greening_kg_yr: Math.round(plants * 20),
  };
}

// ── AnnotationBox ─────────────────────────────────────────────────────────────
// Supports N-node freeform polygons.
// Corner handles:   drag to reposition that node
// Midpoint handles: click the small square to insert a new node at that edge's midpoint
// Double-click corner: removes that node (minimum 3 nodes enforced by parent)
function AnnotationBox({ box, isActive, isHovered, onDelete }) {
  const style = BOX_STYLES[box.type] || BOX_STYLES.obstacle;
  const pts   = box.points;
  const n     = pts.length;
  const [cx, cy] = centroid(pts);

  // Rotation handle: perpendicular above the midpoint of the first edge
  const edgeDx = pts[1][0] - pts[0][0], edgeDy = pts[1][1] - pts[0][1];
  const edgeLen = Math.hypot(edgeDx, edgeDy) || 1;
  const topMidX = (pts[0][0] + pts[1][0]) / 2;
  const topMidY = (pts[0][1] + pts[1][1]) / 2;
  const rotHandleX = topMidX + (-edgeDy / edgeLen) * -36;
  const rotHandleY = topMidY + ( edgeDx / edgeLen) * -36;

  const CORNER_R = 13, ROT_R = 11, MID_HALF = 6;
  const strokeW = isActive ? 4 : isHovered ? 3.5 : 3;
  const [lx, ly] = pts[0];
  const labelW   = Math.max(70, box.label.length * 7.5);

  return (
    <g filter="url(#box-shadow)">
      {/* Hover glow ring */}
      {isHovered && !isActive && (
        <polygon points={ptsStr(pts)} fill="none" stroke={style.stroke}
          strokeWidth={8} strokeOpacity={0.3} style={{ pointerEvents: 'none' }} />
      )}

      {/* Main polygon */}
      <polygon
        points={ptsStr(pts)}
        fill={isHovered && !isActive ? style.fill?.replace('30', '50') || style.fill : style.fill}
        stroke={style.stroke}
        strokeWidth={strokeW}
        strokeDasharray={style.dash || undefined}
        style={{ cursor: 'move' }}
        data-box-id={box.id}
        data-handle="move"
      />

      {/* Confidence badge */}
      {box.confidence != null && (
        <text x={cx} y={cy + 5} fill="white" fontSize={11} textAnchor="middle" fontWeight="bold"
          fontFamily="system-ui,sans-serif" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {Math.round(box.confidence * 100)}%
        </text>
      )}

      {/* Node count hint when polygon has been extended beyond 4 corners */}
      {isActive && n > 4 && (
        <text x={cx} y={cy - 10} fill={style.stroke} fontSize={9} textAnchor="middle"
          fontFamily="system-ui,sans-serif" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {n} nodes
        </text>
      )}

      {/* Active-only handles */}
      {isActive && (
        <>
          {/* Label + close button */}
          <rect x={lx} y={Math.max(0, ly - 26)} width={labelW} height={20} fill={style.stroke} rx={4} style={{ pointerEvents: 'none' }} />
          <text x={lx + 6} y={Math.max(0, ly - 26) + 14} fill="white" fontSize={11} fontWeight="bold"
            fontFamily="system-ui,sans-serif" style={{ pointerEvents: 'none', userSelect: 'none' }}>
            {box.label.length > 20 ? box.label.slice(0, 18) + '…' : box.label}
          </text>
          <g style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onDelete(box.id); }}>
            <circle cx={lx + labelW + 12} cy={Math.max(0, ly - 26) + 10} r={11} fill={style.stroke} />
            <text x={lx + labelW + 12} y={Math.max(0, ly - 26) + 15} fill="white" fontSize={13}
              textAnchor="middle" fontFamily="system-ui,sans-serif" style={{ pointerEvents: 'none', userSelect: 'none' }}>×</text>
          </g>

          {/* Rotation handle */}
          <line x1={topMidX} y1={topMidY} x2={rotHandleX} y2={rotHandleY}
            stroke="white" strokeWidth={1.5} opacity={0.6} style={{ pointerEvents: 'none' }} />
          <circle cx={rotHandleX} cy={rotHandleY} r={ROT_R + 4} fill="transparent"
            data-box-id={box.id} data-handle="rotate" style={{ cursor: 'grab' }} />
          <circle cx={rotHandleX} cy={rotHandleY} r={ROT_R} fill="#facc15" stroke="#0d1710" strokeWidth={2}
            style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))' }}
            data-box-id={box.id} data-handle="rotate" />
          <text x={rotHandleX} y={rotHandleY + 4} fill="#0d1710" fontSize={10} textAnchor="middle" fontWeight="bold"
            fontFamily="system-ui,sans-serif" style={{ pointerEvents: 'none', userSelect: 'none' }}>↻</text>

          {/* Midpoint handles — click to insert new node */}
          {pts.map(([x1, y1], i) => {
            const [x2, y2] = pts[(i + 1) % n];
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            return (
              <g key={`mid${i}`} style={{ cursor: 'copy' }}>
                <circle cx={mx} cy={my} r={MID_HALF + 6} fill="transparent"
                  data-box-id={box.id} data-handle={`mid${i}`} data-mid-after={i} />
                <rect x={mx - MID_HALF} y={my - MID_HALF} width={MID_HALF * 2} height={MID_HALF * 2}
                  fill="white" stroke={style.stroke} strokeWidth={2} rx={2}
                  data-box-id={box.id} data-handle={`mid${i}`} data-mid-after={i} />
              </g>
            );
          })}

          {/* Corner handles — drag to move; double-click to remove (if N > 3) */}
          {pts.map(([hx, hy], i) => (
            <g key={`pt${i}`} style={{ cursor: 'crosshair' }}>
              <circle cx={hx} cy={hy} r={CORNER_R + 8} fill="transparent"
                data-box-id={box.id} data-handle={`pt${i}`} />
              <circle cx={hx} cy={hy} r={CORNER_R} fill="white" stroke={style.stroke} strokeWidth={3}
                style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))' }}
                data-box-id={box.id} data-handle={`pt${i}`} />
              {n > 3 && (
                <text x={hx} y={hy + 4} fill={style.stroke} fontSize={11} fontWeight="bold"
                  textAnchor="middle" fontFamily="system-ui,sans-serif"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>·</text>
              )}
            </g>
          ))}
        </>
      )}
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TerraceAnnotationCanvas({
  imageB64, analysis, footprintSqft = 0,
  buildingName,       // e.g. "A Wing" — labels the boundary box and the header
  centerLat,          // lat of the satellite image center (= this building's lat)
  centerLng,          // lng of the satellite image center
  zoomUsed,           // Google Maps zoom level used when fetching the satellite image
  otherBuildings,     // [{survey_id, building_name, latitude, longitude}] — other wings
  savedBoxes,         // corrected_annotations from a prior human save — used instead of AI analysis
  provider = 'gemini', modelName, latencyMs, costUsd,
  onSave, onClose, saving = false,
}) {
  const svgRef  = useRef(null);
  const dragRef = useRef({ active: false });
  const panRef  = useRef({ active: false });
  const [vb, setVb] = useState({ x: 0, y: 0, w: 1000, h: 1000 });
  const vbRef = useRef(vb);
  useEffect(() => { vbRef.current = vb; }, [vb]);

  const initialBoxes = useMemo(() => {
    const zoneBoxes = otherBuildingsToZones(otherBuildings, centerLat, centerLng, zoomUsed);
    if (savedBoxes?.boxes?.length) {
      // Human-corrected boxes exist — use them directly, skip AI re-parse
      return [...savedBoxes.boxes, ...zoneBoxes];
    }
    const aiBoxes = analysisToBoxes(analysis, buildingName);
    return [...aiBoxes, ...zoneBoxes];
  }, [savedBoxes, analysis, buildingName, otherBuildings, centerLat, centerLng, zoomUsed]);
  const [boxes, setBoxes]               = useState(initialBoxes);
  const [activeBoxId, setActiveBoxId]   = useState(null);
  const [hoveredBoxId, setHoveredBoxId] = useState(null);
  const [isDirty, setIsDirty]           = useState(false);

  const [hiddenTypes, setHiddenTypes]         = useState(new Set());
  const [zoneId, setZoneId]                   = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  const boundaries = useMemo(() => boxes.filter(b => b.type === 'boundary'), [boxes]);

  const visibleBoxes = useMemo(() => {
    let result = boxes;
    if (zoneId) {
      const zone = boxes.find(b => b.id === zoneId);
      if (zone) {
        result = result.filter(b => {
          if (b.id === zoneId) return true;
          if (b.type === 'boundary') return false;
          return pointInPolygon(centroid(b.points), zone.points);
        });
      }
    }
    return result.filter(b => !hiddenTypes.has(b.type));
  }, [boxes, zoneId, hiddenTypes]);

  const calculations = useMemo(() => recalculate(visibleBoxes, footprintSqft || 5000), [visibleBoxes, footprintSqft]);

  const groupedBoxes = useMemo(() => {
    const groups = {};
    visibleBoxes.forEach(b => {
      if (!groups[b.type]) groups[b.type] = [];
      groups[b.type].push(b);
    });
    return groups;
  }, [visibleBoxes]);

  // ── Zoom ─────────────────────────────────────────────────────────────────
  const zoomTo = useCallback((factor, cx = 500, cy = 500) => {
    setVb(prev => {
      const newW = clamp(prev.w * factor, 80, 2000);
      const rf   = newW / prev.w;
      return {
        x: clamp(cx - (cx - prev.x) * rf, -newW * 0.4, 1000 - newW * 0.6),
        y: clamp(cy - (cy - prev.y) * rf, -newW * 0.4, 1000 - newW * 0.6),
        w: newW, h: newW,
      };
    });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = e => {
      e.preventDefault();
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const sp = pt.matrixTransform(svg.getScreenCTM().inverse());
      const delta = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaMode === 2 ? e.deltaY * 300 : e.deltaY;
      zoomTo(delta < 0 ? 0.8 : 1.25, sp.x, sp.y);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomTo]);

  const getSVGCoords = useCallback(e => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const sp = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: sp.x, y: sp.y };
  }, []);

  // ── Pointer handlers ──────────────────────────────────────────────────────
  const handlePointerDown = useCallback(e => {
    const boxId  = e.target.dataset.boxId;
    const handle = e.target.dataset.handle;

    if (!boxId || !handle) {
      setActiveBoxId(null);
      panRef.current = { active: true, startX: e.clientX, startY: e.clientY, startVb: { ...vbRef.current } };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    e.preventDefault();
    setActiveBoxId(boxId);

    // Midpoint click → insert a new node between the two adjacent corners, then drag it
    if (handle.startsWith('mid')) {
      const afterIdx = parseInt(e.target.dataset.midAfter, 10);
      const box = boxes.find(b => b.id === boxId);
      if (!box) return;
      const pts = box.points;
      const insertAt = afterIdx + 1;
      const mx = (pts[afterIdx][0] + pts[insertAt % pts.length][0]) / 2;
      const my = (pts[afterIdx][1] + pts[insertAt % pts.length][1]) / 2;
      const newPoints = [
        ...pts.slice(0, insertAt),
        [mx, my],
        ...pts.slice(insertAt),
      ];
      setBoxes(prev => prev.map(b => b.id === boxId ? { ...b, points: newPoints } : b));
      setIsDirty(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      const coords = getSVGCoords(e);
      dragRef.current = {
        active: true, boxId, handle: `pt${insertAt}`,
        startX: coords.x, startY: coords.y,
        originalPoints: newPoints.map(p => [...p]),
        centerX: mx, centerY: my, startAngle: 0,
      };
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const coords = getSVGCoords(e);
    const box    = boxes.find(b => b.id === boxId);
    if (!box) return;
    const [cxc, cyc] = centroid(box.points);
    dragRef.current = {
      active: true, boxId, handle,
      startX: coords.x, startY: coords.y,
      originalPoints: box.points.map(p => [...p]),
      centerX: cxc, centerY: cyc,
      startAngle: handle === 'rotate' ? Math.atan2(coords.y - cyc, coords.x - cxc) : 0,
    };
  }, [boxes, getSVGCoords]);

  const handlePointerMove = useCallback(e => {
    if (dragRef.current.active) {
      const { boxId, handle, startX, startY, originalPoints, centerX, centerY, startAngle } = dragRef.current;
      const { x, y } = getSVGCoords(e);
      setBoxes(prev => prev.map(box => {
        if (box.id !== boxId) return box;
        if (handle === 'move') {
          const dx = x - startX, dy = y - startY;
          return { ...box, points: originalPoints.map(([px, py]) => [px + dx, py + dy]) };
        }
        if (handle === 'rotate') {
          const angle = Math.atan2(y - centerY, x - centerX) - startAngle;
          return { ...box, points: originalPoints.map(pt => rotatePoint(pt, [centerX, centerY], angle)) };
        }
        const ptIdx = parseInt(handle.replace('pt', ''), 10);
        if (!isNaN(ptIdx)) {
          const newPts = originalPoints.map(p => [...p]);
          newPts[ptIdx] = [x, y];
          return { ...box, points: newPts };
        }
        return box;
      }));
      setIsDirty(true);
      return;
    }
    if (panRef.current.active) {
      const { startX, startY, startVb } = panRef.current;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      setVb({
        ...startVb,
        x: clamp(startVb.x - (e.clientX - startX) * startVb.w / rect.width,  -startVb.w * 0.4, 1000 - startVb.w * 0.6),
        y: clamp(startVb.y - (e.clientY - startY) * startVb.h / rect.height, -startVb.h * 0.4, 1000 - startVb.h * 0.6),
      });
    }
  }, [getSVGCoords]);

  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false;
    panRef.current.active  = false;
  }, []);

  // Double-click a corner node → remove it (if N > 3)
  const handleDoubleClick = useCallback(e => {
    const boxId  = e.target.dataset.boxId;
    const handle = e.target.dataset.handle;
    if (!handle?.startsWith('pt') || !boxId) return;
    const ptIdx = parseInt(handle.replace('pt', ''), 10);
    setBoxes(prev => prev.map(box => {
      if (box.id !== boxId || box.points.length <= 3) return box;
      return { ...box, points: box.points.filter((_, i) => i !== ptIdx) };
    }));
    setIsDirty(true);
  }, []);

  const handleDelete = useCallback(id => {
    setBoxes(prev => prev.filter(b => b.id !== id));
    setIsDirty(true);
    setActiveBoxId(null);
    setHoveredBoxId(null);
  }, []);

  const handleReset = () => {
    setBoxes(initialBoxes);
    setIsDirty(false);
    setActiveBoxId(null);
    setHoveredBoxId(null);
    setHiddenTypes(new Set());
    setZoneId(null);
    setVb({ x: 0, y: 0, w: 1000, h: 1000 });
  };

  const handleSave = () => {
    if (!onSave) return;
    const exportBoxes = boxes.map(b => {
      const xs = b.points.map(([x]) => x), ys = b.points.map(([, y]) => y);
      return { ...b, box_2d: [Math.min(...ys), Math.min(...xs), Math.max(...ys), Math.max(...xs)] };
    });
    onSave({ boxes: exportBoxes, is_human_verified: true, original_analysis: analysis, calculations,
      delta: { boxes_from_ai: initialBoxes.length, boxes_after_edit: boxes.length, was_modified: isDirty } });
  };

  const toggleType = type => setHiddenTypes(prev => {
    const next = new Set(prev);
    next.has(type) ? next.delete(type) : next.add(type);
    return next;
  });

  const toggleGroup = type => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(type) ? next.delete(type) : next.add(type);
    return next;
  });

  const conf      = analysis?.confidence_score;
  const zoomLevel = Math.round((1000 / vb.w) * 100);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">
            Rooftop Analysis{buildingName ? ` — ${buildingName}` : ''}
          </span>
          {isDirty
            ? <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px]">✎ Edited — not yet saved</Badge>
            : <Badge variant="outline" className="text-blue-500 border-blue-400 text-[10px]">{PROVIDER_ICON[provider]} AI Generated ({modelName || provider})</Badge>
          }
          {conf != null && <span className="text-[10px] text-muted-foreground">AI confidence: {Math.round(conf * 100)}%</span>}
          {latencyMs && <span className="text-[10px] text-muted-foreground hidden md:inline">{(latencyMs / 1000).toFixed(1)}s</span>}
          {costUsd   && <span className="text-[10px] text-muted-foreground hidden md:inline">${costUsd.toFixed(4)}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}
            disabled={!isDirty && vb.w === 1000 && !zoneId && hiddenTypes.size === 0}
            className="gap-1.5 text-xs h-7">
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs h-7">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            {isDirty ? 'Save Corrections' : 'Save & Verify'}
          </Button>
          {onClose && <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="h-4 w-4" /></button>}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left filter strip ─────────────────────────────────────────── */}
        <div className="w-44 flex-shrink-0 border-r border-border bg-card overflow-y-auto">

          {boundaries.length > 0 && (
            <div className="p-3 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Building Zone</p>
              <div className="space-y-1">
                <button
                  onClick={() => setZoneId(null)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${!zoneId ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  All Buildings
                </button>
                {boundaries.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setZoneId(zoneId === b.id ? null : b.id)}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${zoneId === b.id ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Layers</p>
            <div className="space-y-1">
              {Object.entries(BOX_STYLES).map(([type, s]) => {
                const count = boxes.filter(b => b.type === type).length;
                if (count === 0) return null;
                const hidden = hiddenTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded transition-colors ${hidden ? 'opacity-40' : ''} hover:bg-muted`}
                  >
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ border: `2px ${s.dash ? 'dashed' : 'solid'} ${s.stroke}`, background: s.fill === 'none' ? 'transparent' : s.fill }} />
                    <span className="flex-1 text-left capitalize text-foreground">{s.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{count}</span>
                    {hidden ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-3 pb-3 space-y-2 border-t border-border pt-3">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>Add node</strong> — click the ▪ square handle on any polygon edge
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>Remove node</strong> — double-click any corner handle (min 3 nodes)
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>Rotate</strong> — drag the yellow ↻ handle above the first edge
            </p>
            {(otherBuildings?.length > 0) && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">
                <strong>~ zones</strong> — other building boundaries are auto-placed from map pins. Resize them to match the actual roof, then use Zone filter.
              </p>
            )}
          </div>
        </div>

        {/* ── Canvas ────────────────────────────────────────────────────── */}
        <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative">
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 text-[10px] text-white/70 bg-black/60 rounded px-2 py-1 backdrop-blur-sm">
            <Info className="h-3 w-3 flex-shrink-0" />
            Scroll to zoom · Drag to pan · Drag corners · ▪ midpoint adds node · Dbl-click node removes it
          </div>

          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
            {[
              { icon: ZoomIn,    title: 'Zoom in',  fn: () => zoomTo(0.7,  vb.x + vb.w / 2, vb.y + vb.h / 2) },
              { icon: ZoomOut,   title: 'Zoom out', fn: () => zoomTo(1.43, vb.x + vb.w / 2, vb.y + vb.h / 2) },
              { icon: Maximize2, title: 'Fit',      fn: () => setVb({ x: 0, y: 0, w: 1000, h: 1000 }) },
            ].map(({ icon: Icon, title, fn }) => (
              <button key={title} onClick={fn} title={title}
                className="w-7 h-7 flex items-center justify-center bg-black/70 hover:bg-black/90 text-white rounded border border-white/20 transition-colors">
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
            <div className="text-[10px] text-white/60 text-center mt-0.5 font-mono">{zoomLevel}%</div>
          </div>

          {imageB64 ? (
            <svg
              ref={svgRef}
              viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
              className="max-w-full max-h-full"
              style={{ aspectRatio: '1', display: 'block', touchAction: 'none', cursor: 'grab' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onDoubleClick={handleDoubleClick}
            >
              <defs>
                <filter id="box-shadow" x="-15%" y="-15%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#000" floodOpacity="0.9" />
                </filter>
              </defs>
              <image href={`data:image/jpeg;base64,${imageB64}`} x="0" y="0" width="1000" height="1000" preserveAspectRatio="xMidYMid slice" />

              {[...visibleBoxes.filter(b => b.id !== activeBoxId), ...visibleBoxes.filter(b => b.id === activeBoxId)].map(box => (
                <AnnotationBox
                  key={box.id}
                  box={box}
                  isActive={activeBoxId === box.id}
                  isHovered={hoveredBoxId === box.id && activeBoxId !== box.id}
                  onDelete={handleDelete}
                />
              ))}
            </svg>
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/40">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Loading satellite image…</span>
            </div>
          )}
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 border-l border-border bg-card overflow-y-auto">

          <div className="border-b border-border">
            <div className="px-3 py-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Detected ({visibleBoxes.length}{visibleBoxes.length < boxes.length ? `/${boxes.length}` : ''})
              </p>
              {(zoneId || hiddenTypes.size > 0) && (
                <button className="text-[10px] text-primary hover:underline"
                  onClick={() => { setZoneId(null); setHiddenTypes(new Set()); }}>
                  clear filters
                </button>
              )}
            </div>

            {Object.entries(groupedBoxes).map(([type, typeBoxes]) => {
              const s = BOX_STYLES[type] || BOX_STYLES.obstacle;
              const collapsed = collapsedGroups.has(type);
              return (
                <div key={type}>
                  <button
                    onClick={() => toggleGroup(type)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors border-t border-border/50"
                  >
                    <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${collapsed ? '' : 'rotate-90'}`} />
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ border: `2px ${s.dash ? 'dashed' : 'solid'} ${s.stroke}`, background: s.fill === 'none' ? 'transparent' : s.fill }} />
                    <span className="text-xs font-medium capitalize text-foreground flex-1 text-left">{s.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded-full px-1.5">{typeBoxes.length}</span>
                  </button>

                  {!collapsed && typeBoxes.map(box => (
                    <div
                      key={box.id}
                      className={`flex items-center gap-2 pl-8 pr-3 py-1.5 cursor-pointer transition-colors ${
                        activeBoxId === box.id ? 'bg-muted' : hoveredBoxId === box.id ? 'bg-muted/50' : 'hover:bg-muted/30'
                      }`}
                      onClick={() => setActiveBoxId(activeBoxId === box.id ? null : box.id)}
                      onMouseEnter={() => setHoveredBoxId(box.id)}
                      onMouseLeave={() => setHoveredBoxId(null)}
                    >
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.stroke }} />
                      <span className="text-xs capitalize text-foreground truncate flex-1">{box.label}</span>
                      {box.isAutoZone && (
                        <span className="text-[10px] text-amber-500" title="Auto-placed from building pin — resize to match actual roof">~</span>
                      )}
                      {box.confidence != null && (
                        <span className="text-[10px] font-mono text-muted-foreground">{Math.round(box.confidence * 100)}%</span>
                      )}
                      {box.points.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">{box.points.length}pt</span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {analysis?.data_quality_notes && (
            <div className="p-3 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">AI Notes</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{analysis.data_quality_notes}</p>
            </div>
          )}

          {calculations && (
            <div className="p-3 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Calculated {isDirty ? '(your adjustments)' : '(AI analysis)'}
              </p>

              <div className="bg-muted/40 rounded-lg p-3 border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Usable Rooftop</p>
                <p className="text-xl font-bold font-mono">{calculations.usable_sqft.toLocaleString()} <span className="text-sm font-normal">sq ft</span></p>
                <div className="mt-1.5 space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-primary">Usable</span>
                    <span className="font-mono font-bold text-primary">{calculations.usable_pct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${calculations.usable_pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span>Obstacles {calculations.obstacle_pct}%</span>
                    <span>Shadow {calculations.shadow_pct}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 border border-yellow-200 dark:border-yellow-900">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-[10px] text-yellow-700 dark:text-yellow-400 uppercase tracking-wide font-bold">Solar Potential</p>
                </div>
                <p className="text-lg font-bold text-yellow-800 dark:text-yellow-300 font-mono">{calculations.solar_kw} kW</p>
                <div className="mt-1 space-y-0.5 text-[10px] text-yellow-700 dark:text-yellow-400">
                  <div className="flex justify-between"><span>Annual generation</span><span className="font-mono">{calculations.annual_kwh.toLocaleString()} kWh</span></div>
                  <div className="flex justify-between"><span>Year 1 savings</span><span className="font-mono font-bold">₹{calculations.savings_inr_yr1.toLocaleString('en-IN')}</span></div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-1.5 mb-1">
                  <Leaf className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <p className="text-[10px] text-green-700 dark:text-green-400 uppercase tracking-wide font-bold">Greening Potential</p>
                </div>
                <p className="text-lg font-bold text-green-800 dark:text-green-300 font-mono">{calculations.plants.toLocaleString()} plants</p>
                <div className="mt-1 text-[10px] text-green-700 dark:text-green-400">
                  <div className="flex justify-between"><span>CO₂ sequestration</span><span className="font-mono">{calculations.co2_greening_kg_yr.toLocaleString()} kg/yr</span></div>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {provider === 'claude' ? <Cpu className="h-3 w-3" /> : <Brain className="h-3 w-3" />}
              <span>{modelName || provider} · N-node polygons · click ▪ to add node</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
