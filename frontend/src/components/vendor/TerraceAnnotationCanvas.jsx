/**
 * TerraceAnnotationCanvas
 *
 * Interactive satellite image overlay for rooftop AI analysis.
 * - Scroll/pinch to zoom · drag canvas to pan
 * - Each box is a free-form 4-point polygon (corners drag independently)
 * - Rotation handle above each active box spins the whole shape
 * - Live calculations update as shapes are adjusted
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  X, RotateCcw, CheckCircle2, Loader2, Zap, Leaf, Maximize2, Info,
  Brain, Cpu, ZoomIn, ZoomOut, RotateCw,
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
  // Returns area in SVG coord-space units²
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function centroid(pts) {
  return [
    pts.reduce((s, [x]) => s + x, 0) / pts.length,
    pts.reduce((s, [, y]) => s + y, 0) / pts.length,
  ];
}

function rotatePoint([x, y], [cx, cy], angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos];
}

// box_2d [y1,x1,y2,x2] → 4 polygon points [[x,y], …] clockwise TL→TR→BR→BL
function box2dToPoints([y1, x1, y2, x2]) {
  return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
}

// Points → SVG points string
function ptsStr(pts) {
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

// ── Convert AI analysis JSON → flat box array ────────────────────────────────
function analysisToBoxes(analysis) {
  if (!analysis) return [];
  const boxes = [];

  if (analysis.building_boundary_box?.length === 4) {
    boxes.push({
      id: 'boundary', type: 'boundary', label: 'Building Boundary',
      points: box2dToPoints(analysis.building_boundary_box),
    });
  }

  (analysis.detected_objects || []).forEach((obj, i) => {
    if (!obj.box_2d?.length) return;
    boxes.push({
      id: `obj_${i}`, type: 'obstacle',
      label: (obj.label || 'obstacle').replace(/_/g, ' '),
      points: box2dToPoints(obj.box_2d),
      confidence: obj.confidence,
    });
  });

  (analysis.shadow_regions || []).forEach((sr, i) => {
    if (!sr.box_2d?.length) return;
    boxes.push({
      id: `shadow_${i}`, type: 'shadow',
      label: `Shadow — ${(sr.source || 'unknown').replace(/_/g, ' ')}`,
      points: box2dToPoints(sr.box_2d),
    });
  });

  if (analysis.existing_vegetation?.present) {
    const vb = analysis.existing_vegetation.box_2d;
    if (vb?.length === 4) {
      boxes.push({
        id: 'vegetation_0', type: 'vegetation',
        label: analysis.existing_vegetation.type?.replace(/_/g, ' ') || 'vegetation',
        points: box2dToPoints(vb),
      });
    }
  }

  return boxes;
}

// ── Live calculation from current box state ──────────────────────────────────
function recalculate(boxes, footprintSqft) {
  const boundary = boxes.find(b => b.type === 'boundary');
  if (!boundary || footprintSqft <= 0) return null;

  const boundaryArea = shoelaceArea(boundary.points);
  if (boundaryArea <= 0) return null;

  const obstacleArea = boxes.filter(b => b.type === 'obstacle')
    .reduce((s, b) => s + shoelaceArea(b.points), 0);
  const shadowArea = boxes.filter(b => b.type === 'shadow')
    .reduce((s, b) => s + shoelaceArea(b.points), 0);

  const obstaclePct = Math.min(50, (obstacleArea / boundaryArea) * 100);
  const shadowPct   = Math.min(50, (shadowArea   / boundaryArea) * 100);
  const usablePct   = Math.max(5, 100 - obstaclePct - shadowPct);
  const usableSqft  = Math.round(footprintSqft * (usablePct / 100));

  const solarKw        = Math.round((usableSqft / 71.7) * 10) / 10;
  const annualKwh      = Math.round(solarKw * 1800);
  const savingsInr     = Math.round(annualKwh * 8);
  const co2SolarTonnes = Math.round(annualKwh * 0.00082 * 10) / 10;
  const plants         = Math.floor(usableSqft / 2.7);

  return {
    usable_pct: Math.round(usablePct), usable_sqft: usableSqft,
    obstacle_pct: Math.round(obstaclePct), shadow_pct: Math.round(shadowPct),
    solar_kw: solarKw, annual_kwh: annualKwh, savings_inr_yr1: savingsInr,
    co2_solar_tonnes_yr: co2SolarTonnes, plants,
    co2_greening_kg_yr: Math.round(plants * 20),
  };
}

// ── AnnotationBox — free-form polygon with corner + rotation handles ──────────
function AnnotationBox({ box, isActive, onDelete }) {
  const style = BOX_STYLES[box.type] || BOX_STYLES.obstacle;
  const pts   = box.points;
  const [cx, cy] = centroid(pts);

  // Rotation handle: above the midpoint of the first edge (TL→TR), offset 36px upward
  const topMidX = (pts[0][0] + pts[1][0]) / 2;
  const topMidY = (pts[0][1] + pts[1][1]) / 2;
  // Direction perpendicular to edge, outward
  const edgeDx = pts[1][0] - pts[0][0];
  const edgeDy = pts[1][1] - pts[0][1];
  const edgeLen = Math.hypot(edgeDx, edgeDy) || 1;
  const perpX = -edgeDy / edgeLen;
  const perpY =  edgeDx / edgeLen;
  const rotHandleX = topMidX + perpX * -36; // outward from the polygon
  const rotHandleY = topMidY + perpY * -36;

  const HANDLE_R  = 14; // corner handle radius
  const ROT_R     = 11; // rotation handle radius
  const labelW    = Math.max(70, box.label.length * 7.5);
  const [lx, ly]  = pts[0]; // label anchor at first corner

  return (
    <g filter="url(#box-shadow)">
      {/* Filled polygon */}
      <polygon
        points={ptsStr(pts)}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={isActive ? 4 : 3}
        strokeDasharray={style.dash || undefined}
        style={{ cursor: 'move' }}
        data-box-id={box.id}
        data-handle="move"
      />

      {/* Label pill */}
      {isActive && (
        <g>
          <rect
            x={lx} y={Math.max(0, ly - 26)}
            width={labelW} height={20}
            fill={style.stroke} rx={4}
            style={{ pointerEvents: 'none' }}
          />
          <text
            x={lx + 6} y={Math.max(0, ly - 26) + 14}
            fill="white" fontSize={11} fontWeight="bold"
            fontFamily="system-ui,sans-serif"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {box.label.length > 20 ? box.label.slice(0, 18) + '…' : box.label}
          </text>
          <g style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onDelete(box.id); }}>
            <circle cx={lx + labelW + 12} cy={Math.max(0, ly - 26) + 10} r={11} fill={style.stroke} />
            <text
              x={lx + labelW + 12} y={Math.max(0, ly - 26) + 15}
              fill="white" fontSize={13} textAnchor="middle"
              fontFamily="system-ui,sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >×</text>
          </g>
        </g>
      )}

      {/* Confidence badge (always shown) */}
      {box.confidence != null && (
        <text
          x={cx} y={cy + 5}
          fill="white" fontSize={11} textAnchor="middle" fontWeight="bold"
          fontFamily="system-ui,sans-serif"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {Math.round(box.confidence * 100)}%
        </text>
      )}

      {/* Active handles */}
      {isActive && (
        <>
          {/* Rotation connector line */}
          <line
            x1={topMidX} y1={topMidY}
            x2={rotHandleX} y2={rotHandleY}
            stroke="white" strokeWidth={1.5} opacity={0.6}
            style={{ pointerEvents: 'none' }}
          />

          {/* Rotation handle */}
          <g
            data-box-id={box.id}
            data-handle="rotate"
            data-center-x={cx}
            data-center-y={cy}
            style={{ cursor: 'grab' }}
          >
            <circle
              cx={rotHandleX} cy={rotHandleY}
              r={ROT_R + 4}
              fill="transparent"
              data-box-id={box.id} data-handle="rotate"
              data-center-x={cx} data-center-y={cy}
            />
            <circle
              cx={rotHandleX} cy={rotHandleY} r={ROT_R}
              fill="#facc15" stroke="#0d1710" strokeWidth={2}
              style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))' }}
              data-box-id={box.id} data-handle="rotate"
              data-center-x={cx} data-center-y={cy}
            />
            <text
              x={rotHandleX} y={rotHandleY + 4}
              fill="#0d1710" fontSize={10} textAnchor="middle" fontWeight="bold"
              fontFamily="system-ui,sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >↻</text>
          </g>

          {/* Corner handles — one per point, drag independently */}
          {pts.map(([hx, hy], i) => (
            <g key={i} data-box-id={box.id} data-handle={`pt${i}`} style={{ cursor: 'crosshair' }}>
              {/* Larger invisible hit area */}
              <circle
                cx={hx} cy={hy} r={ROT_R + 8} fill="transparent"
                data-box-id={box.id} data-handle={`pt${i}`}
              />
              <circle
                cx={hx} cy={hy} r={HANDLE_R}
                fill="white" stroke={style.stroke} strokeWidth={3}
                style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))' }}
                data-box-id={box.id} data-handle={`pt${i}`}
              />
            </g>
          ))}
        </>
      )}
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TerraceAnnotationCanvas({
  imageB64, analysis, footprintSqft = 0, city = '',
  provider = 'gemini', modelName, latencyMs, costUsd,
  onSave, onClose, saving = false,
}) {
  const svgRef   = useRef(null);
  const dragRef  = useRef({ active: false });
  const panRef   = useRef({ active: false });
  const [vb, setVb]               = useState({ x: 0, y: 0, w: 1000, h: 1000 });
  const vbRef = useRef(vb);
  useEffect(() => { vbRef.current = vb; }, [vb]);

  const initialBoxes = useMemo(() => analysisToBoxes(analysis), [analysis]);
  const [boxes, setBoxes]           = useState(initialBoxes);
  const [activeBoxId, setActiveBoxId] = useState(null);
  const [isDirty, setIsDirty]       = useState(false);

  const calculations = useMemo(() => recalculate(boxes, footprintSqft || 5000), [boxes, footprintSqft]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
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

  // ── Pointer down ─────────────────────────────────────────────────────────
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
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveBoxId(boxId);

    const coords = getSVGCoords(e);
    const box    = boxes.find(b => b.id === boxId);
    if (!box) return;

    const [cx, cy] = centroid(box.points);

    dragRef.current = {
      active: true, boxId, handle,
      startX: coords.x, startY: coords.y,
      originalPoints: box.points.map(p => [...p]),
      centerX: cx, centerY: cy,
      // For rotation: initial angle from center to pointer
      startAngle: handle === 'rotate' ? Math.atan2(coords.y - cy, coords.x - cx) : 0,
    };
  }, [boxes, getSVGCoords]);

  // ── Pointer move ─────────────────────────────────────────────────────────
  const handlePointerMove = useCallback(e => {
    if (dragRef.current.active) {
      const { boxId, handle, startX, startY, originalPoints, centerX, centerY, startAngle } = dragRef.current;
      const { x, y } = getSVGCoords(e);

      setBoxes(prev => prev.map(box => {
        if (box.id !== boxId) return box;

        // Move whole shape
        if (handle === 'move') {
          const dx = x - startX;
          const dy = y - startY;
          return { ...box, points: originalPoints.map(([px, py]) => [px + dx, py + dy]) };
        }

        // Rotate whole shape
        if (handle === 'rotate') {
          const angle = Math.atan2(y - centerY, x - centerX) - startAngle;
          return { ...box, points: originalPoints.map(pt => rotatePoint(pt, [centerX, centerY], angle)) };
        }

        // Move single corner (pt0 … pt3)
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

    // Pan
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

  const handleDelete = useCallback(id => {
    setBoxes(prev => prev.filter(b => b.id !== id));
    setIsDirty(true);
    setActiveBoxId(null);
  }, []);

  const handleReset = () => {
    setBoxes(initialBoxes);
    setIsDirty(false);
    setActiveBoxId(null);
    setVb({ x: 0, y: 0, w: 1000, h: 1000 });
  };

  const handleSave = () => {
    if (!onSave) return;
    // Provide box_2d bounding box per shape for backward compat
    const exportBoxes = boxes.map(b => {
      const xs = b.points.map(([x]) => x);
      const ys = b.points.map(([, y]) => y);
      return {
        ...b,
        box_2d: [Math.min(...ys), Math.min(...xs), Math.max(...ys), Math.max(...xs)],
      };
    });
    onSave({
      boxes: exportBoxes,
      is_human_verified: true,
      original_analysis: analysis,
      calculations,
      delta: { boxes_from_ai: initialBoxes.length, boxes_after_edit: boxes.length, was_modified: isDirty },
    });
  };

  const conf      = analysis?.confidence_score;
  const zoomLevel = Math.round((1000 / vb.w) * 100);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Rooftop Analysis</span>
          {isDirty ? (
            <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px]">✎ Edited — not yet saved</Badge>
          ) : (
            <Badge variant="outline" className="text-blue-500 border-blue-400 text-[10px]">
              {PROVIDER_ICON[provider]} AI Generated ({modelName || provider})
            </Badge>
          )}
          {conf != null && <span className="text-[10px] text-muted-foreground">AI confidence: {Math.round(conf * 100)}%</span>}
          {latencyMs && <span className="text-[10px] text-muted-foreground hidden md:inline">{(latencyMs / 1000).toFixed(1)}s</span>}
          {costUsd   && <span className="text-[10px] text-muted-foreground hidden md:inline">${costUsd.toFixed(4)}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!isDirty && vb.w === 1000} className="gap-1.5 text-xs h-7">
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs h-7">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            {isDirty ? 'Save Corrections' : 'Save & Verify'}
          </Button>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas + sidebar */}
      <div className="flex flex-1 overflow-hidden">

        {/* Canvas */}
        <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative">

          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 text-[10px] text-white/70 bg-black/60 rounded px-2 py-1 backdrop-blur-sm">
            <Info className="h-3 w-3 flex-shrink-0" />
            Scroll to zoom · Drag canvas to pan · Drag corners to reshape · Yellow ↻ to rotate
          </div>

          {/* Zoom controls */}
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
            {[
              { icon: ZoomIn,   title: 'Zoom in',  fn: () => zoomTo(0.7,  vb.x + vb.w / 2, vb.y + vb.h / 2) },
              { icon: ZoomOut,  title: 'Zoom out', fn: () => zoomTo(1.43, vb.x + vb.w / 2, vb.y + vb.h / 2) },
              { icon: Maximize2,title: 'Fit',      fn: () => setVb({ x: 0, y: 0, w: 1000, h: 1000 }) },
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
            >
              <defs>
                <filter id="box-shadow" x="-15%" y="-15%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#000" floodOpacity="0.9" />
                </filter>
              </defs>

              <image
                href={`data:image/jpeg;base64,${imageB64}`}
                x="0" y="0" width="1000" height="1000"
                preserveAspectRatio="xMidYMid slice"
              />

              {/* Inactive boxes first, active box on top */}
              {[...boxes.filter(b => b.id !== activeBoxId), ...boxes.filter(b => b.id === activeBoxId)].map(box => (
                <AnnotationBox
                  key={box.id}
                  box={box}
                  isActive={activeBoxId === box.id}
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

        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 border-l border-border bg-card overflow-y-auto">

          {/* Legend */}
          <div className="p-3 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Legend</p>
            <div className="space-y-1">
              {Object.entries(BOX_STYLES).map(([type, s]) => (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-3 rounded-sm flex-shrink-0"
                    style={{ border: `2px ${s.dash ? 'dashed' : 'solid'} ${s.stroke}`, background: s.fill === 'none' ? 'transparent' : s.fill }} />
                  <span className="capitalize text-foreground">{s.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs mt-1">
                <div className="w-4 h-4 rounded-full bg-yellow-400 flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-black">↻</div>
                <span className="text-muted-foreground">Rotation handle (drag to rotate)</span>
              </div>
            </div>
          </div>

          {/* Detected items */}
          <div className="p-3 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
              Detected Items ({boxes.length})
            </p>
            <div className="space-y-1">
              {boxes.map(box => {
                const s = BOX_STYLES[box.type] || BOX_STYLES.obstacle;
                return (
                  <div
                    key={box.id}
                    className={`flex items-center justify-between rounded px-2 py-1.5 cursor-pointer transition-colors ${
                      activeBoxId === box.id ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setActiveBoxId(activeBoxId === box.id ? null : box.id)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.stroke }} />
                      <span className="text-xs truncate capitalize">{box.label}</span>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-destructive ml-1"
                      onClick={e => { e.stopPropagation(); handleDelete(box.id); }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {boxes.length === 0 && <p className="text-xs text-muted-foreground italic">No items detected</p>}
            </div>
          </div>

          {/* AI notes */}
          {analysis?.data_quality_notes && (
            <div className="p-3 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">AI Notes</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{analysis.data_quality_notes}</p>
            </div>
          )}

          {/* Calculations */}
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
                  <div className="flex justify-between"><span>CO₂ offset</span><span className="font-mono">{calculations.co2_solar_tonnes_yr} t/yr</span></div>
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

              <details className="text-[10px] text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">How are these calculated?</summary>
                <div className="mt-2 space-y-1 pl-2 border-l border-border">
                  <p>Usable = footprint × (1 − obstacles% − shadow%) via polygon area</p>
                  <p>Solar kW = usable sqft ÷ 71.7 (150W per sqm)</p>
                  <p>Annual kWh = solar kW × 1,800 hrs/yr (India avg)</p>
                  <p>Year 1 savings = kWh × ₹8/kWh</p>
                  <p>CO₂ solar = kWh × 0.82 kg/kWh (India grid)</p>
                  <p>Plants = usable sqft ÷ 2.7 (container spacing)</p>
                </div>
              </details>
            </div>
          )}

          <div className="p-3 border-t border-border mt-auto">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {provider === 'claude' ? <Cpu className="h-3 w-3" /> : <Brain className="h-3 w-3" />}
              <span>{modelName || provider} • Adjust shapes to correct the AI</span>
            </div>
            {isDirty && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Your corrections improve future analyses.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
