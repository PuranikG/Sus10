/**
 * TerraceAnnotationCanvas
 *
 * Interactive satellite image overlay for rooftop AI analysis.
 * - Draggable/resizable bounding boxes (building boundary, obstacles, shadows)
 * - Live calculations update as boxes are adjusted
 * - "Save & Verify" stores corrected annotations as ground truth (training data)
 *
 * Coordinate system: SVG viewBox="0 0 1000 1000" maps directly to the AI's
 * normalized 0-1000 bounding box coords [ymin, xmin, ymax, xmax].
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  X, RotateCcw, CheckCircle2, Loader2, Zap, Leaf, Maximize2, Info,
  Brain, Cpu
} from 'lucide-react';

// ── Colors per box type ─────────────────────────────────────────────────────
const BOX_STYLES = {
  boundary:   { stroke: '#3b82f6', fill: 'none',       label: 'Boundary',  dash: '8 4' },
  obstacle:   { stroke: '#ef4444', fill: '#ef444428',  label: 'Obstacle',  dash: null  },
  shadow:     { stroke: '#f59e0b', fill: '#f59e0b28',  label: 'Shadow',    dash: null  },
  vegetation: { stroke: '#22c55e', fill: '#22c55e28',  label: 'Vegetation',dash: null  },
};

const PROVIDER_ICON = { gemini: '✦', claude: '◆', auto: '⬡' };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Convert AI analysis JSON → flat box array ───────────────────────────────
function analysisToBoxes(analysis) {
  if (!analysis) return [];
  const boxes = [];

  if (analysis.building_boundary_box?.length === 4) {
    boxes.push({
      id: 'boundary',
      type: 'boundary',
      label: 'Building Boundary',
      box_2d: [...analysis.building_boundary_box],
    });
  }

  (analysis.detected_objects || []).forEach((obj, i) => {
    if (!obj.box_2d?.length) return;
    boxes.push({
      id: `obj_${i}`,
      type: 'obstacle',
      label: (obj.label || 'obstacle').replace(/_/g, ' '),
      box_2d: [...obj.box_2d],
      confidence: obj.confidence,
    });
  });

  (analysis.shadow_regions || []).forEach((sr, i) => {
    if (!sr.box_2d?.length) return;
    boxes.push({
      id: `shadow_${i}`,
      type: 'shadow',
      label: `Shadow — ${(sr.source || 'unknown').replace(/_/g, ' ')}`,
      box_2d: [...sr.box_2d],
    });
  });

  if (analysis.existing_vegetation?.present) {
    // Vegetation doesn't always have a bounding box; use a small default if missing
    const vegBox = analysis.existing_vegetation.box_2d;
    if (vegBox?.length === 4) {
      boxes.push({
        id: 'vegetation_0',
        type: 'vegetation',
        label: analysis.existing_vegetation.type?.replace(/_/g, ' ') || 'vegetation',
        box_2d: [...vegBox],
      });
    }
  }

  return boxes;
}

// ── Live calculation from current box state (all areas in sq ft) ─────────────
function recalculate(boxes, footprintSqft) {
  const boundary = boxes.find(b => b.type === 'boundary');
  if (!boundary || footprintSqft <= 0) return null;

  const [by1, bx1, by2, bx2] = boundary.box_2d;
  const boundaryArea = (by2 - by1) * (bx2 - bx1);
  if (boundaryArea <= 0) return null;

  const obstacles = boxes.filter(b => b.type === 'obstacle');
  const shadows   = boxes.filter(b => b.type === 'shadow');

  const obstacleArea = obstacles.reduce((s, b) => {
    const [y1, x1, y2, x2] = b.box_2d;
    return s + Math.max(0, (y2 - y1) * (x2 - x1));
  }, 0);

  const shadowArea = shadows.reduce((s, b) => {
    const [y1, x1, y2, x2] = b.box_2d;
    return s + Math.max(0, (y2 - y1) * (x2 - x1));
  }, 0);

  const obstaclePct  = Math.min(50, (obstacleArea / boundaryArea) * 100);
  const shadowPct    = Math.min(50, (shadowArea   / boundaryArea) * 100);
  const usablePct    = Math.max(5, 100 - obstaclePct - shadowPct);
  const usableSqft   = Math.round(footprintSqft * (usablePct / 100));

  // Solar: 13.94 W per sq ft (= 150 W/sqm ÷ 10.764 sqft/sqm)
  // 1 kW per 71.7 sq ft of usable panel area
  const solarKw         = Math.round((usableSqft / 71.7) * 10) / 10;
  const annualKwh       = Math.round(solarKw * 1800);           // 1,800 kWh/kW/yr India avg
  const savingsInr      = Math.round(annualKwh * 8);            // ₹8/kWh avg
  const co2SolarTonnes  = Math.round(annualKwh * 0.00082 * 10) / 10; // India grid factor

  // Greening: ~1 plant per 2.7 sq ft (= 4 plants/sqm × 0.0929 sqm/sqft)
  const plants         = Math.floor(usableSqft / 2.7);
  const co2GreeningKg  = Math.round(plants * 20);

  return {
    usable_pct:          Math.round(usablePct),
    usable_sqft:         usableSqft,
    obstacle_pct:        Math.round(obstaclePct),
    shadow_pct:          Math.round(shadowPct),
    solar_kw:            solarKw,
    annual_kwh:          annualKwh,
    savings_inr_yr1:     savingsInr,
    co2_solar_tonnes_yr: co2SolarTonnes,
    plants,
    co2_greening_kg_yr:  co2GreeningKg,
  };
}

// ── Box component ────────────────────────────────────────────────────────────
function AnnotationBox({ box, isActive, onDelete }) {
  const [y1, x1, y2, x2] = box.box_2d;
  const style = BOX_STYLES[box.type] || BOX_STYLES.obstacle;
  const w = x2 - x1;
  const h = y2 - y1;
  const HANDLE_R = 10;

  return (
    <g>
      {/* Main rect */}
      <rect
        x={x1} y={y1} width={w} height={h}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={isActive ? 3 : 2}
        strokeDasharray={style.dash || undefined}
        rx={3}
        style={{ cursor: 'move' }}
        data-box-id={box.id}
        data-handle="move"
      />

      {/* Label pill */}
      {h > 30 || isActive ? (
        <g>
          <rect
            x={x1} y={Math.max(0, y1 - 22)}
            width={Math.min(w, Math.max(60, box.label.length * 7.5))}
            height={18}
            fill={style.stroke}
            rx={3}
            style={{ pointerEvents: 'none' }}
          />
          <text
            x={x1 + 5} y={Math.max(0, y1 - 22) + 12}
            fill="white"
            fontSize={10}
            fontWeight="bold"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {box.label.length > 20 ? box.label.slice(0, 18) + '…' : box.label}
          </text>
          {/* Delete button */}
          <g
            style={{ cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); onDelete(box.id); }}
          >
            <circle
              cx={x1 + Math.min(w, Math.max(60, box.label.length * 7.5)) + 8}
              cy={Math.max(0, y1 - 22) + 9}
              r={8}
              fill={style.stroke}
            />
            <text
              x={x1 + Math.min(w, Math.max(60, box.label.length * 7.5)) + 8}
              y={Math.max(0, y1 - 22) + 13}
              fill="white"
              fontSize={10}
              textAnchor="middle"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >×</text>
          </g>
        </g>
      ) : null}

      {/* Confidence badge */}
      {box.confidence != null && (
        <text
          x={x1 + w - 4} y={y1 + 12}
          fill={style.stroke}
          fontSize={9}
          textAnchor="end"
          fontWeight="bold"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {Math.round(box.confidence * 100)}%
        </text>
      )}

      {/* Corner resize handles */}
      {isActive && [
        ['nw', x1, y1],
        ['ne', x2, y1],
        ['sw', x1, y2],
        ['se', x2, y2],
      ].map(([handle, hx, hy]) => (
        <circle
          key={handle}
          cx={hx} cy={hy}
          r={HANDLE_R}
          fill="white"
          stroke={style.stroke}
          strokeWidth={2}
          style={{
            cursor: handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize',
          }}
          data-box-id={box.id}
          data-handle={handle}
        />
      ))}
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TerraceAnnotationCanvas({
  imageB64,
  analysis,
  footprintSqft = 0,
  city = '',
  provider = 'gemini',
  modelName,
  latencyMs,
  costUsd,
  onSave,
  onClose,
  saving = false,
}) {
  const svgRef = useRef(null);
  const dragRef = useRef({ active: false });

  const initialBoxes = useMemo(() => analysisToBoxes(analysis), [analysis]);
  const [boxes, setBoxes] = useState(initialBoxes);
  const [activeBoxId, setActiveBoxId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const calculations = useMemo(
    () => recalculate(boxes, footprintSqft || 5000),
    [boxes, footprintSqft]
  );

  const getSVGCoords = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const handlePointerDown = useCallback((e) => {
    const target = e.target;
    const boxId = target.dataset.boxId;
    const handle = target.dataset.handle;
    if (!boxId || !handle) {
      setActiveBoxId(null);
      return;
    }

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const coords = getSVGCoords(e);
    const originalBox = boxes.find(b => b.id === boxId)?.box_2d;
    if (!originalBox) return;

    setActiveBoxId(boxId);
    dragRef.current = {
      active: true,
      boxId,
      handle,
      startX: coords.x,
      startY: coords.y,
      originalBox: [...originalBox],
    };
  }, [boxes, getSVGCoords]);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const { boxId, handle, startX, startY, originalBox } = dragRef.current;
    const { x, y } = getSVGCoords(e);
    const dx = x - startX;
    const dy = y - startY;

    setBoxes(prev => prev.map(box => {
      if (box.id !== boxId) return box;
      let [y1, x1, y2, x2] = originalBox;
      const MIN = 20;

      if (handle === 'move') {
        return { ...box, box_2d: [
          clamp(y1 + dy, 0, 1000 - (y2 - y1)),
          clamp(x1 + dx, 0, 1000 - (x2 - x1)),
          clamp(y2 + dy, y2 - y1, 1000),
          clamp(x2 + dx, x2 - x1, 1000),
        ]};
      }
      if (handle === 'nw') return { ...box, box_2d: [clamp(y1+dy, 0, y2-MIN), clamp(x1+dx, 0, x2-MIN), y2, x2] };
      if (handle === 'ne') return { ...box, box_2d: [clamp(y1+dy, 0, y2-MIN), x1, y2, clamp(x2+dx, x1+MIN, 1000)] };
      if (handle === 'sw') return { ...box, box_2d: [y1, clamp(x1+dx, 0, x2-MIN), clamp(y2+dy, y1+MIN, 1000), x2] };
      if (handle === 'se') return { ...box, box_2d: [y1, x1, clamp(y2+dy, y1+MIN, 1000), clamp(x2+dx, x1+MIN, 1000)] };
      return box;
    }));
    setIsDirty(true);
  }, [getSVGCoords]);

  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const handleDelete = useCallback((boxId) => {
    setBoxes(prev => prev.filter(b => b.id !== boxId));
    setIsDirty(true);
    setActiveBoxId(null);
  }, []);

  const handleReset = () => {
    setBoxes(initialBoxes);
    setIsDirty(false);
    setActiveBoxId(null);
  };

  const handleSave = () => {
    if (!onSave) return;
    onSave({
      boxes,
      is_human_verified: true,
      original_analysis: analysis,
      calculations,
      delta: {
        boxes_from_ai: initialBoxes.length,
        boxes_after_edit: boxes.length,
        was_modified: isDirty,
      },
    });
  };

  const conf = analysis?.confidence_score;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">Rooftop Analysis</span>
          {isDirty ? (
            <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px]">
              ✎ Edited — not yet saved
            </Badge>
          ) : (
            <Badge variant="outline" className="text-blue-500 border-blue-400 text-[10px]">
              {PROVIDER_ICON[provider]} AI Generated ({modelName || provider})
            </Badge>
          )}
          {conf != null && (
            <span className="text-[10px] text-muted-foreground">
              AI confidence: {Math.round(conf * 100)}%
            </span>
          )}
          {latencyMs && (
            <span className="text-[10px] text-muted-foreground hidden md:inline">
              {(latencyMs / 1000).toFixed(1)}s
            </span>
          )}
          {costUsd && (
            <span className="text-[10px] text-muted-foreground hidden md:inline">
              ${costUsd.toFixed(4)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!isDirty}
            className="gap-1.5 text-xs h-7"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to AI
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5 text-xs h-7"
          >
            {saving
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <CheckCircle2 className="h-3 w-3" />
            }
            {isDirty ? 'Save Corrections' : 'Save & Verify'}
          </Button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main content: canvas + sidebar ──────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Annotation canvas */}
        <div className="flex-1 bg-black/80 flex items-center justify-center overflow-hidden relative">

          {/* Instructions hint */}
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 text-[10px] text-white/60 bg-black/40 rounded px-2 py-1">
            <Info className="h-3 w-3" />
            Drag boxes to adjust · Click corner handles to resize · ✕ to remove
          </div>

          {imageB64 ? (
            <svg
              ref={svgRef}
              viewBox="0 0 1000 1000"
              className="max-w-full max-h-full"
              style={{ aspectRatio: '1', display: 'block', touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* Satellite image fills the viewBox */}
              <image
                href={`data:image/jpeg;base64,${imageB64}`}
                x="0" y="0"
                width="1000" height="1000"
                preserveAspectRatio="xMidYMid slice"
              />

              {/* Render boxes — inactive first, active last (on top) */}
              {[...boxes.filter(b => b.id !== activeBoxId), ...boxes.filter(b => b.id === activeBoxId)].map(box => (
                <AnnotationBox
                  key={box.id}
                  box={box}
                  isActive={activeBoxId === box.id}
                  onDelete={handleDelete}
                />
              ))}

              {/* Click on SVG background to deselect */}
              <rect
                x="0" y="0" width="1000" height="1000"
                fill="transparent"
                style={{ cursor: 'default' }}
                onPointerDown={(e) => { if (e.target === e.currentTarget) setActiveBoxId(null); }}
              />
            </svg>
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/40">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Loading satellite image…</span>
            </div>
          )}
        </div>

        {/* ── Sidebar: detections + calculations ──────────────────────── */}
        <div className="w-72 flex-shrink-0 border-l border-border bg-card overflow-y-auto">

          {/* Legend */}
          <div className="p-3 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Legend</p>
            <div className="space-y-1">
              {Object.entries(BOX_STYLES).map(([type, s]) => (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-4 h-3 rounded-sm flex-shrink-0"
                    style={{
                      border: `2px ${s.dash ? 'dashed' : 'solid'} ${s.stroke}`,
                      background: s.fill === 'none' ? 'transparent' : s.fill,
                    }}
                  />
                  <span className="capitalize text-foreground">{s.label}</span>
                </div>
              ))}
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
                    className={`flex items-center justify-between rounded px-2 py-1 cursor-pointer transition-colors ${
                      activeBoxId === box.id ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setActiveBoxId(activeBoxId === box.id ? null : box.id)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ background: s.stroke }}
                      />
                      <span className="text-xs truncate capitalize text-foreground">{box.label}</span>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-destructive ml-1 flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleDelete(box.id); }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {boxes.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No items detected</p>
              )}
            </div>
          </div>

          {/* AI qualitative notes */}
          {analysis?.data_quality_notes && (
            <div className="p-3 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">AI Notes</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{analysis.data_quality_notes}</p>
            </div>
          )}

          {/* Live calculations */}
          {calculations && (
            <div className="p-3 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Calculated {isDirty ? '(your adjustments)' : '(AI analysis)'}
              </p>

              {/* Usable area */}
              <div className="bg-muted/40 rounded-lg p-3 border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Usable Rooftop</p>
                <p className="text-xl font-bold text-foreground font-mono">
                  {calculations.usable_sqft.toLocaleString()} <span className="text-sm font-normal">sq ft</span>
                </p>
                <div className="mt-1.5 space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-primary">Usable</span>
                    <span className="font-mono font-bold text-primary">{calculations.usable_pct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full"
                      style={{ width: `${calculations.usable_pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span>Obstacles {calculations.obstacle_pct}%</span>
                    <span>Shadow {calculations.shadow_pct}%</span>
                  </div>
                </div>
              </div>

              {/* Solar */}
              <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 border border-yellow-200 dark:border-yellow-900">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-[10px] text-yellow-700 dark:text-yellow-400 uppercase tracking-wide font-bold">Solar Potential</p>
                </div>
                <p className="text-lg font-bold text-yellow-800 dark:text-yellow-300 font-mono">
                  {calculations.solar_kw} kW
                </p>
                <div className="mt-1 space-y-0.5 text-[10px]">
                  <div className="flex justify-between text-yellow-700 dark:text-yellow-400">
                    <span>Annual generation</span>
                    <span className="font-mono">{calculations.annual_kwh.toLocaleString()} kWh</span>
                  </div>
                  <div className="flex justify-between text-yellow-700 dark:text-yellow-400">
                    <span>Year 1 savings</span>
                    <span className="font-mono font-bold">
                      ₹{calculations.savings_inr_yr1.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-yellow-700 dark:text-yellow-400">
                    <span>CO₂ offset</span>
                    <span className="font-mono">{calculations.co2_solar_tonnes_yr} t/yr</span>
                  </div>
                </div>
              </div>

              {/* Greening */}
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-1.5 mb-1">
                  <Leaf className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <p className="text-[10px] text-green-700 dark:text-green-400 uppercase tracking-wide font-bold">Greening Potential</p>
                </div>
                <p className="text-lg font-bold text-green-800 dark:text-green-300 font-mono">
                  {calculations.plants.toLocaleString()} plants
                </p>
                <div className="mt-1 text-[10px] text-green-700 dark:text-green-400">
                  <div className="flex justify-between">
                    <span>CO₂ sequestration</span>
                    <span className="font-mono">{calculations.co2_greening_kg_yr.toLocaleString()} kg/yr</span>
                  </div>
                </div>
              </div>

              {/* How calculations are derived */}
              <details className="text-[10px] text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">How are these calculated?</summary>
                <div className="mt-2 space-y-1 pl-2 border-l border-border">
                  <p>Usable area = rooftop footprint × (1 − obstacles% − shadow%)</p>
                  <p>Solar kW = usable sq ft ÷ 71.7 (= 150W per sqm)</p>
                  <p>Annual kWh = solar kW × 1,800 hrs/yr (India average)</p>
                  <p>Year 1 savings = kWh × ₹8/kWh</p>
                  <p>CO₂ solar = kWh × 0.82 kg/kWh (India grid factor)</p>
                  <p>Plants = usable sq ft ÷ 2.7 (container garden spacing)</p>
                  <p>CO₂ greening = plants × 20 kg/yr each</p>
                </div>
              </details>
            </div>
          )}

          {/* Provider info footer */}
          <div className="p-3 border-t border-border mt-auto">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {provider === 'claude' ? <Cpu className="h-3 w-3" /> : <Brain className="h-3 w-3" />}
              <span>{modelName || provider} • Adjust boxes to correct the AI</span>
            </div>
            {isDirty && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                Your corrections will be used to improve future analyses.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
