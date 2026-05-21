import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sun, Sprout, Droplets, Recycle, ArrowLeft, ArrowRight,
  Building2, TrendingUp, Leaf, Loader2, Mail,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Navbar from '../components/layout/Navbar';
import ReportDownloadDialog from '../components/report/ReportDownloadDialog';
import { apiRequest, formatCurrency } from '../lib/utils';

const ICONS = { solar: Sun, biogas: Recycle, rainwater: Droplets, greening: Sprout };

function HeadlineNumber({ value, unit, color }) {
  const formatted = (typeof value === 'number') ? value.toLocaleString('en-IN') : (value ?? '—');
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-3xl md:text-4xl font-bold leading-none" style={{ color }}>{formatted}</span>
      <span className="text-sm text-muted-foreground">{unit}</span>
    </div>
  );
}

function PillarWidget({ widget, index }) {
  const Icon = ICONS[widget.key] || Leaf;
  const accent = widget.color;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link
        to={widget.drill_route}
        className="group block h-full"
        data-testid={`widget-${widget.key}`}
      >
        <Card className="h-full hover:shadow-lg transition-all border-border/60 overflow-hidden">
          <div className="h-1 w-full" style={{ backgroundColor: accent }} />
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}1A`, color: accent }}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-sm font-medium tracking-tight">{widget.title}</div>
            </div>
            <HeadlineNumber value={widget.headline_value} unit={widget.headline_unit} color={accent} />
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {(widget.subheadings || []).filter(Boolean).map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 inline-block h-1 w-1 rounded-full bg-muted-foreground/40" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-5">
              <span className="inline-flex items-center text-sm font-medium gap-1 group-hover:gap-2 transition-all" style={{ color: accent }}>
                Explore solution <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function BiogasAdjuster({ families, waste, onChange }) {
  return (
    <Card className="border-emerald-700/40 bg-slate-900/80 backdrop-blur-sm" data-testid="biogas-adjuster">
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Recycle className="h-5 w-5 text-emerald-400" />
          <div>
            <div className="font-medium text-slate-50">Tune biogas inputs</div>
            <p className="text-xs text-slate-400">Enter values to match your building. Numbers above update live.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2 text-sm text-slate-200">
              <span>Families / apartments</span>
              <input
                type="number"
                value={families}
                onChange={(e) => onChange({ families: Number(e.target.value), waste })}
                min={1}
                max={500}
                step={1}
                className="w-20 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm font-medium text-slate-100 text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                data-testid="adjuster-families-input"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2 text-sm text-slate-200">
              <span>Kitchen waste per family</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={waste.toFixed(2)}
                  onChange={(e) => onChange({ families, waste: Number(e.target.value) })}
                  min={0.10}
                  max={3.00}
                  step={0.10}
                  className="w-20 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm font-medium text-slate-100 text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  data-testid="adjuster-waste-input"
                />
                <span className="text-slate-400" data-testid="adjuster-waste-value">kg / day</span>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          CPCB norms: ~0.4–0.5 kg per person/day organic waste. We assume 4 people per family by default.
        </p>
      </CardContent>
    </Card>
  );
}

export default function BuildingPotentialPage() {
  const { buildingId } = useParams();
  const [searchParams] = useSearchParams();
  const initialFamilies = Number(searchParams.get('families') || 0);
  const initialWaste = Number(searchParams.get('waste') || 0);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState(initialFamilies > 0 ? initialFamilies : null);
  const [waste, setWaste] = useState(initialWaste > 0 ? initialWaste : 0.5);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const fetchPotential = useCallback(async (overrides = {}) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      const f = overrides.families ?? families;
      const w = overrides.waste ?? waste;
      if (f) sp.set('families', String(f));
      if (w) sp.set('waste_kg_per_family_per_day', String(w));
      const r = await apiRequest(`/buildings/${buildingId}/potential?${sp.toString()}`);
      setData(r);
      // First load: seed families from server's default if user didn't provide.
      // For non-residential buildings the server returns null; default to 10
      // so the slider has somewhere reasonable to start.
      if (!families) setFamilies(r?.inputs?.families || 10);
      if (!overrides.waste && r?.inputs?.waste_kg_per_family_per_day) setWaste(r.inputs.waste_kg_per_family_per_day);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId]);

  useEffect(() => { fetchPotential(); }, [fetchPotential]);

  const onAdjusterChange = ({ families: f, waste: w }) => {
    setFamilies(f);
    setWaste(w);
    // Debounce-free; numbers are cheap. For polish, wrap in setTimeout if needed.
    fetchPotential({ families: f, waste: w });
  };

  const summary = data?.summary;
  const building = data?.building;
  const showBiogasAdjuster = useMemo(
    () => (data?.widgets || []).some(w => w.key === 'biogas'),
    [data],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container-max section-padding py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to={`/buildings/${buildingId}`}>
            <Button variant="ghost" size="icon" data-testid="potential-back-btn"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="min-w-0">
            <Badge variant="outline" className="mb-2">Sustenance potential · at a glance</Badge>
            <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight truncate" data-testid="potential-page-title">
              {building?.name || 'Building'}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              {building?.address || '—'} · {building?.city || '—'}
              {building?.usable_terrace_sqm ? ` · ${Number(building.usable_terrace_sqm).toLocaleString('en-IN')} sqm terrace` : ''}
            </p>
          </div>
        </div>

        {loading && !data ? (
          <div className="py-24 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : !data ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Could not load this building's potential.</CardContent></Card>
        ) : (
          <>
            {/* Narrative hero — translates numbers into human meaning */}
            {data.narrative?.headline && (
              <Card className="mb-5 border-emerald-700/40 bg-gradient-to-br from-emerald-950/60 via-slate-900/80 to-slate-950 overflow-hidden" data-testid="narrative-hero">
                <CardContent className="p-6 md:p-8">
                  <p
                    className="text-xl md:text-2xl leading-snug text-emerald-50 font-medium"
                    data-testid="narrative-headline"
                  >
                    {/* Safe markdown-style bold rendering — no innerHTML.
                        Split on `**…**` and render bold parts via React. */}
                    {(data.narrative.headline || '').split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <span key={i} className="text-emerald-300 font-bold">{part.slice(2, -2)}</span>;
                      }
                      return <span key={i}>{part}</span>;
                    })}
                  </p>
                  {(data.narrative.chips || []).length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2" data-testid="narrative-chips">
                      {data.narrative.chips.map((c) => (
                        <span key={`${c.label}-${c.value}`} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/50 border border-emerald-700/50 px-3 py-1 text-xs text-emerald-100">
                          <span className="opacity-70">{c.label}</span>
                          <span className="font-semibold">{c.value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Headline strip */}
            {summary && (
              <Card className="mb-6 border-slate-700/60 bg-slate-900/80 backdrop-blur-sm" data-testid="potential-summary-strip">
                <CardContent className="p-5 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total annual savings</div>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(summary.total_annual_savings_inr || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">CO₂ avoided / year</div>
                    <div className="text-2xl font-bold flex items-baseline gap-1 text-slate-50">
                      {Number(summary.total_co2_offset_tonnes_per_year || 0).toLocaleString('en-IN')}
                      <span className="text-sm text-slate-400">tonnes</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Solar generation</div>
                    <div className="text-2xl font-bold flex items-baseline gap-1 text-slate-50">
                      {Number(summary.solar_kwh_per_year || 0).toLocaleString('en-IN')}
                      <span className="text-sm text-slate-400">kWh</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Rainwater captured</div>
                    <div className="text-2xl font-bold flex items-baseline gap-1 text-slate-50">
                      {Number(summary.rainwater_kl_per_year || 0).toLocaleString('en-IN')}
                      <span className="text-sm text-slate-400">kL</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 4 widget cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-testid="potential-widgets-grid">
              {(data.widgets || []).map((w, i) => <PillarWidget key={w.key} widget={w} index={i} />)}
            </div>

            {/* Biogas adjuster */}
            {showBiogasAdjuster && families && (
              <BiogasAdjuster families={families} waste={waste} onChange={onAdjusterChange} />
            )}

            {/* Disclaimer + Next steps */}
            <Card className="mt-6 border-t-2 border-emerald-700/40 bg-slate-900/60">
              <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4 inline mr-1 text-primary" />
                  Estimates use MNRE / CPCB / IS standards. Verify with site survey before commissioning.
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20"
                    onClick={() => setEmailDialogOpen(true)}
                    data-testid="email-me-pdf-btn"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email me this report
                  </Button>
                  <Link to={`/buildings/${buildingId}`}>
                    <Button variant="outline" size="sm" data-testid="see-full-report-btn">See full report</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Email me PDF dialog */}
      <ReportDownloadDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        buildingId={buildingId}
        families={families}
        waste={waste}
        mode="email"
      />
    </div>
  );
}
