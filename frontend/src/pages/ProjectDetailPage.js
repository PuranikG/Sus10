import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, MapPin, Plus, Trash2, Loader2, Search,
  Sun, Sprout, Flame, Droplets, TrendingUp, Leaf, Sparkles, BarChart3,
  Download, ExternalLink, Check, X, Eye, Brain, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { apiRequest } from '../lib/utils';
import Navbar from '../components/layout/Navbar';
import { toast } from 'sonner';

export default function ProjectDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rollup, setRollup] = useState(null);
  const [computingRollup, setComputingRollup] = useState(false);
  const [showAddBuildings, setShowAddBuildings] = useState(false);

  const loadGroup = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/groups/${groupId}`);
      setGroup(data);
    } catch (e) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [groupId, navigate]);

  const loadRollup = useCallback(async () => {
    if (!group || !group.building_ids?.length) {
      setRollup(null);
      return;
    }
    try {
      setComputingRollup(true);
      const data = await apiRequest(`/sustenance/group/${groupId}`);
      setRollup(data);
    } catch (e) {
      toast.error('Failed to compute rollup');
    } finally {
      setComputingRollup(false);
    }
  }, [groupId, group]);

  useEffect(() => { loadGroup(); }, [loadGroup]);
  useEffect(() => { if (group) loadRollup(); }, [group, loadRollup]);

  const handleRemoveBuilding = async (buildingId) => {
    try {
      await apiRequest(`/groups/${groupId}/buildings/${buildingId}`, { method: 'DELETE' });
      toast.success('Building removed from project');
      loadGroup();
    } catch (e) {
      toast.error('Failed to remove building');
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Delete project "${group.name}"? Buildings will NOT be deleted.`)) return;
    try {
      await apiRequest(`/groups/${groupId}`, { method: 'DELETE' });
      toast.success('Project deleted');
      navigate('/projects');
    } catch (e) {
      toast.error('Failed to delete project');
    }
  };

  if (loading || !group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" /> All Projects
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 data-testid="project-name" className="text-3xl font-bold flex items-center gap-3 flex-wrap">
              {group.name}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 uppercase tracking-wider">
                Beta
              </span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="capitalize">{group.type}</Badge>
              {group.primary_city && <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1" />{group.primary_city}</Badge>}
              <Badge data-testid="building-count-badge"><Building2 className="h-3 w-3 mr-1" />{(group.building_ids?.length || 0)} buildings</Badge>
            </div>
            {group.description && <p className="text-muted-foreground mt-2">{group.description}</p>}
          </div>
          <div className="flex gap-2">
            <Button data-testid="add-buildings-btn" onClick={() => setShowAddBuildings(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Buildings
            </Button>
            <Button variant="outline" onClick={handleDeleteProject} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="buildings" className="space-y-4">
          <TabsList>
            <TabsTrigger data-testid="tab-buildings" value="buildings">
              <Building2 className="h-4 w-4 mr-2" /> Buildings
            </TabsTrigger>
            <TabsTrigger data-testid="tab-sustenance" value="sustenance">
              <Leaf className="h-4 w-4 mr-2" /> Sustenance Potential
            </TabsTrigger>
            <TabsTrigger data-testid="tab-rollup" value="rollup">
              <BarChart3 className="h-4 w-4 mr-2" /> Group Rollup (BRSR)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buildings">
            <BuildingsTab group={group} onRemove={handleRemoveBuilding} />
          </TabsContent>
          <TabsContent value="sustenance">
            <SustenancePerBuildingTab rollup={rollup} computing={computingRollup} />
          </TabsContent>
          <TabsContent value="rollup">
            <GroupRollupTab rollup={rollup} computing={computingRollup} group={group} />
          </TabsContent>
        </Tabs>
      </div>

      <AddBuildingsDialog
        open={showAddBuildings}
        onOpenChange={setShowAddBuildings}
        group={group}
        onUpdated={loadGroup}
      />
    </div>
  );
}

// ===================== BUILDINGS TAB =====================
function BuildingsTab({ group, onRemove }) {
  if (!group.buildings || group.buildings.length === 0) {
    return (
      <Card className="text-center py-12 border-dashed">
        <CardContent>
          <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No buildings in this project yet. Click <strong>Add Buildings</strong> above.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {group.buildings.map(b => (
        <Card key={b.building_id} data-testid={`grp-building-${b.building_id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{b.name || b.address}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{b.address}</p>
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  <Badge variant="outline" className="capitalize">{b.building_type}</Badge>
                  {b.building_footprint_area && (
                    <Badge variant="secondary">{Math.round(b.building_footprint_area)} m² footprint</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Link to={`/buildings/${b.building_id}`}>
                  <Button size="icon" variant="ghost" title="View building">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
                <Button size="icon" variant="ghost" onClick={() => onRemove(b.building_id)} className="text-destructive" title="Remove">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ===================== SUSTENANCE PER BUILDING TAB =====================
function SustenancePerBuildingTab({ rollup, computing }) {
  if (computing) return <CardLoader text="Computing 4-pillar potential for all buildings…" />;
  if (!rollup || !rollup.buildings?.length) return <EmptyState text="Add buildings to see per-building sustenance analysis." />;

  return (
    <div className="space-y-4">
      {rollup.buildings.map(b => (
        <BuildingSustenanceCard key={b.building_id} b={b} />
      ))}
    </div>
  );
}

function BuildingSustenanceCard({ b }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [geminiResult, setGeminiResult] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      const result = await apiRequest(
        `/sustenance/building/${b.building_id}/gemini-analyze`,
        { method: 'POST' }
      );
      setGeminiResult(result);
      setShowAnalysis(true);
      if (result.success) {
        toast.success(
          result.cached
            ? `Gemini analysis loaded (cached, ${result.cached_age_hours}h old)`
            : 'Gemini rooftop analysis complete'
        );
      } else {
        toast.error('Analysis failed: ' + (result.error || 'unknown'));
      }
    } catch (e) {
      toast.error('Failed to run Gemini analysis: ' + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card data-testid={`sustenance-card-${b.building_id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-lg">{b.building_name}</CardTitle>
            <CardDescription>
              {b.city} · {b.footprint_sqm} m² footprint · {b.usable_terrace_sqm} m² usable terrace
            </CardDescription>
          </div>
          <Button
            data-testid={`gemini-analyze-${b.building_id}`}
            size="sm"
            variant="outline"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="gap-2 relative"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {analyzing ? 'Analyzing…' : geminiResult ? 'View Annotation' : 'Analyze with Gemini'}
            <span className="absolute -top-2 -right-2 px-1.5 py-0 rounded text-[9px] font-bold bg-amber-500 text-white shadow-sm">
              BETA
            </span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PillarCard
            icon={<Sun className="h-5 w-5" />}
            color="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
            label="Solar PV"
            primary={`${b.summary.solar_kwp} kWp`}
            secondary={`${b.summary.solar_kwh_per_year.toLocaleString()} kWh/yr`}
          />
          <PillarCard
            icon={<Sprout className="h-5 w-5" />}
            color="bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300"
            label="Plantation"
            primary={`${b.summary.plants_count} plants`}
            secondary={b.summary.annual_food_kg > 0 ? `${Math.round(b.summary.annual_food_kg)} kg food/yr` : 'Mixed/Ornamental'}
          />
          <PillarCard
            icon={<Flame className="h-5 w-5" />}
            color="bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300"
            label="Biogas"
            primary={`${b.summary.biogas_m3_per_year} m³/yr`}
            secondary={b.pillars.biogas.recommended_plant_size?.split('(')[0]?.trim() || 'Plant sized'}
          />
          <PillarCard
            icon={<Droplets className="h-5 w-5" />}
            color="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
            label="Rainwater"
            primary={`${b.summary.rainwater_kl_per_year} kL/yr`}
            secondary={`${b.pillars.rainwater.households_supported} households`}
          />
        </div>
        <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">₹{(b.summary.total_annual_savings_inr).toLocaleString()}</span>
            <span className="text-muted-foreground">savings/yr</span>
          </div>
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">{b.summary.total_co2_offset_tonnes_per_year} tCO₂e</span>
            <span className="text-muted-foreground">offset/yr</span>
          </div>
          <Link to={`/buildings/${b.building_id}`} className="ml-auto text-primary hover:underline text-xs">
            View detailed report →
          </Link>
        </div>

        {/* Solar details */}
        <div className="mt-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 text-xs">
          <strong className="text-amber-900 dark:text-amber-200">☀️ Solar setup:</strong>{' '}
          {b.pillars.solar.recommended_tilt_degrees}° tilt, {b.pillars.solar.panel_orientation}.
          GHI: {b.pillars.solar.ghi_kwh_per_m2_per_day} kWh/m²/day (MNRE).
        </div>
      </CardContent>

      <GeminiAnalysisDialog
        open={showAnalysis}
        onOpenChange={setShowAnalysis}
        result={geminiResult}
        buildingName={b.building_name}
      />
    </Card>
  );
}

function GeminiAnalysisDialog({ open, onOpenChange, result, buildingName }) {
  const [slideIdx, setSlideIdx] = useState(0);

  // Reset to first slide whenever the dialog re-opens with a new result
  useEffect(() => { if (open) setSlideIdx(0); }, [open, result]);

  if (!result) return null;
  const a = result.analysis || {};
  const slides = result.slides || [];

  const handleDownloadCurrentSlide = () => {
    const s = slides[slideIdx];
    if (!s?.image_b64) return;
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${s.image_b64}`;
    link.download = `Sus10_${(buildingName || 'building').replace(/\W+/g, '_')}_${s.id}.jpg`;
    link.click();
  };

  const handleDownloadAll = () => {
    slides.forEach((s, i) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${s.image_b64}`;
        link.download = `Sus10_${(buildingName || 'building').replace(/\W+/g, '_')}_${String(i + 1).padStart(2, '0')}_${s.id}.jpg`;
        link.click();
      }, i * 250);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0" data-testid="gemini-analysis-dialog">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-600" />
            Sustenance Visual Report — {buildingName}
          </DialogTitle>
          <DialogDescription>
            Model: <span className="font-mono text-xs">{result.model}</span>
          </DialogDescription>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {result.cached && <Badge variant="outline" className="text-[10px]">Cached</Badge>}
            {slides.length > 0 && <span>{slides.length} slides</span>}
          </div>
        </DialogHeader>

        {!result.success ? (
          <div className="m-6 p-4 rounded-md bg-destructive/10 text-destructive text-sm">
            {result.error || 'Analysis failed'}
          </div>
        ) : slides.length === 0 ? (
          <div className="m-6 p-4 rounded-md bg-amber-50 text-amber-900 text-sm">
            No slides could be generated for this image.
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-4">
            {/* Slide nav strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2" data-testid="slide-nav">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSlideIdx(i)}
                  data-testid={`slide-nav-${s.id}`}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    i === slideIdx
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {i + 1}. {s.title}
                  {s.count !== null && s.count !== undefined && (
                    <span className="ml-1.5 opacity-70">({s.count})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Current slide */}
            {slides[slideIdx] && (
              <div className="relative rounded-lg overflow-hidden border bg-slate-950">
                <img
                  src={`data:image/jpeg;base64,${slides[slideIdx].image_b64}`}
                  alt={slides[slideIdx].title}
                  className="w-full h-auto"
                  data-testid="current-slide-image"
                />
                {/* Prev / next overlay buttons */}
                {slideIdx > 0 && (
                  <button
                    type="button"
                    data-testid="prev-slide-btn"
                    onClick={() => setSlideIdx(i => Math.max(0, i - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {slideIdx < slides.length - 1 && (
                  <button
                    type="button"
                    data-testid="next-slide-btn"
                    onClick={() => setSlideIdx(i => Math.min(slides.length - 1, i + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Slide-specific summary lines */}
            {slides[slideIdx]?.summary_lines?.length > 0 && (
              <div className="rounded-md border-l-4 border-violet-500 bg-violet-50 dark:bg-violet-950/20 p-3">
                <div className="text-xs font-medium text-violet-900 dark:text-violet-200 mb-1.5">Summary</div>
                <ul className="text-sm text-violet-900 dark:text-violet-100 space-y-1">
                  {slides[slideIdx].summary_lines.map((line, i) => (
                    <li key={`${slideIdx}-${i}-${(line || '').slice(0, 40)}`} className="leading-snug">• {line}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Slide controls */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                Slide <span className="font-medium text-foreground">{slideIdx + 1}</span> of {slides.length}
              </div>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="download-current-btn"
                  onClick={handleDownloadCurrentSlide}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Download Slide
                </Button>
                <Button
                  size="sm"
                  data-testid="download-all-btn"
                  onClick={handleDownloadAll}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Download All ({slides.length})
                </Button>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground">
              Imagery: {result.image_source} · zoom {result.image_zoom} · AI confidence {Math.round((a.confidence_score || 0) * 100)}%.
              Annotations are AI-generated — verify on-site before procurement.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-sm font-semibold mt-1 capitalize">{value}</div>
    </div>
  );
}

function PillarCard({ icon, color, label, primary, secondary }) {
  return (
    <div className="rounded-lg border p-3">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-md ${color} mb-2`}>{icon}</div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-1">{primary}</div>
      <div className="text-xs text-muted-foreground">{secondary}</div>
    </div>
  );
}

// ===================== GROUP ROLLUP TAB (BRSR) =====================
function GroupRollupTab({ rollup, computing, group }) {
  if (computing) return <CardLoader text="Computing group-level rollup…" />;
  if (!rollup || !rollup.summary || rollup.buildings?.length === 0) {
    return <EmptyState text="Add buildings to see group-level BRSR/ESG rollup." />;
  }
  const s = rollup.summary;

  return (
    <div className="space-y-6">
      <Card data-testid="brsr-narrative-card" className="bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/20 border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            BRSR / ESG Narrative
          </CardTitle>
          <CardDescription>
            Aligned with SEBI BRSR Section A.6 (Environmental Disclosures) — ready for sustainability report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed">{s.brsr_narrative}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Building2 />} label="Buildings" value={s.buildings_count} color="text-slate-600" />
        <StatCard icon={<Sun />} label="Solar Capacity" value={`${Math.round(s.total_solar_kwp)} kWp`} sub={`${Math.round(s.total_solar_kwh_per_year / 1000)} MWh/yr`} color="text-amber-600" />
        <StatCard icon={<Sprout />} label="Plants" value={s.total_plants_count.toLocaleString()} sub={s.total_food_kg_per_year > 0 ? `${Math.round(s.total_food_kg_per_year).toLocaleString()} kg food/yr` : ''} color="text-green-600" />
        <StatCard icon={<Flame />} label="Biogas" value={`${Math.round(s.total_biogas_m3_per_year).toLocaleString()} m³/yr`} color="text-orange-600" />
        <StatCard icon={<Droplets />} label="Rainwater" value={`${Math.round(s.total_rainwater_kl_per_year).toLocaleString()} kL/yr`} color="text-blue-600" />
        <StatCard icon={<Leaf />} label="CO₂ Offset" value={`${s.total_co2_offset_tonnes_per_year} tCO₂e`} sub="per year" color="text-emerald-600" />
        <StatCard icon={<TrendingUp />} label="Annual Savings" value={`₹${s.total_annual_savings_inr.toLocaleString()}`} color="text-emerald-600" />
        <StatCard icon={<BarChart3 />} label="Total Footprint" value={`${Math.round(s.total_footprint_sqm).toLocaleString()} m²`} sub={`${Math.round(s.total_terrace_sqm).toLocaleString()} m² rooftop`} color="text-slate-600" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-Building Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2 pr-3">Building</th>
                  <th className="py-2 px-3 text-right">Solar (kWp)</th>
                  <th className="py-2 px-3 text-right">Plants</th>
                  <th className="py-2 px-3 text-right">Biogas (m³/yr)</th>
                  <th className="py-2 px-3 text-right">Rainwater (kL/yr)</th>
                  <th className="py-2 pl-3 text-right">CO₂ (t/yr)</th>
                </tr>
              </thead>
              <tbody>
                {rollup.buildings.map(b => (
                  <tr key={b.building_id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{b.building_name}</td>
                    <td className="py-2 px-3 text-right">{b.summary.solar_kwp}</td>
                    <td className="py-2 px-3 text-right">{b.summary.plants_count}</td>
                    <td className="py-2 px-3 text-right">{b.summary.biogas_m3_per_year}</td>
                    <td className="py-2 px-3 text-right">{b.summary.rainwater_kl_per_year}</td>
                    <td className="py-2 pl-3 text-right font-semibold text-emerald-600">{b.summary.total_co2_offset_tonnes_per_year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`${color} mb-2`}>{icon}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold mt-1">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function CardLoader({ text }) {
  return (
    <Card className="py-12 text-center">
      <CardContent>
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
        <p className="text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }) {
  return (
    <Card className="py-12 text-center border-dashed">
      <CardContent>
        <p className="text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

// ===================== ADD BUILDINGS DIALOG (POI search + import) =====================
function AddBuildingsDialog({ open, onOpenChange, group, onUpdated }) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState(group?.primary_city || 'Bangalore');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState({});
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (group?.primary_city) setCity(group.primary_city);
  }, [group]);

  const handleSearch = async () => {
    if (!query.trim()) return toast.error('Enter a brand/POI name');
    try {
      setSearching(true);
      setResults([]);
      setSelected({});
      const data = await apiRequest(`/poi/search?poi_name=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}`);
      setResults(data.results || []);
      if ((data.results || []).length === 0) toast.info('No results — try another POI or city');
    } catch (e) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (idx) => {
    setSelected(s => ({ ...s, [idx]: !s[idx] }));
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleAddSelected = async () => {
    const chosen = results.filter((_, i) => selected[i]);
    if (chosen.length === 0) return toast.error('Select buildings to add');
    try {
      setImporting(true);
      const buildingIds = [];

      for (const r of chosen) {
        if (r.source === 'database' && r.building_id) {
          buildingIds.push(r.building_id);
        } else if (r.google_place_id) {
          const res = await apiRequest('/poi/import', {
            method: 'POST',
            body: JSON.stringify({
              google_place_id: r.google_place_id,
              name: r.name,
              address: r.address,
              city: r.city,
              latitude: r.latitude,
              longitude: r.longitude,
              building_type: 'commercial',
            }),
          });
          if (res.building?.building_id) buildingIds.push(res.building.building_id);
        }
      }

      if (buildingIds.length > 0) {
        await apiRequest(`/groups/${group.group_id}/buildings`, {
          method: 'POST',
          body: JSON.stringify({ building_ids: buildingIds }),
        });
        toast.success(`Added ${buildingIds.length} buildings to project`);
        onUpdated();
        onOpenChange(false);
      }
    } catch (e) {
      toast.error('Failed to add buildings: ' + (e.message || ''));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col" data-testid="add-buildings-dialog">
        <DialogHeader>
          <DialogTitle>Add Buildings to "{group?.name}"</DialogTitle>
          <DialogDescription>
            Search Google Places by brand/POI name (e.g., "Incubex", "WeWork") or address. We'll auto-fetch building footprint polygons.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div>
            <Label className="text-xs">Search POI / Brand / Address</Label>
            <Input
              data-testid="poi-search-input"
              placeholder="e.g., Incubex, WeWork, DLF Cyber City"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div>
            <Label className="text-xs">City</Label>
            <select
              data-testid="poi-city-select"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {['Bangalore', 'Mumbai', 'Delhi', 'Gurugram', 'Noida', 'Pune', 'Hyderabad', 'Chennai'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <Button data-testid="poi-search-btn" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-2 space-y-2 min-h-[200px]">
          {results.length === 0 && !searching && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Enter a brand or POI name and click search.
            </div>
          )}
          {results.map((r, idx) => {
            const isSelected = !!selected[idx];
            return (
              <button
                key={idx}
                type="button"
                data-testid={`poi-result-${idx}`}
                onClick={() => toggleSelect(idx)}
                className={`w-full text-left p-3 rounded-md border transition flex items-start gap-3 ${
                  isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-primary border-primary' : 'border-input'
                }`}>
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{r.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{r.address}</div>
                  <div className="flex gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[10px] capitalize">{r.source === 'database' ? '✓ In DB' : 'Google Places'}</Badge>
                    {r.city && <Badge variant="secondary" className="text-[10px]">{r.city}</Badge>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-3">
          <div className="text-sm text-muted-foreground">
            {selectedCount > 0 && <span>{selectedCount} selected</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              data-testid="add-selected-btn"
              onClick={handleAddSelected}
              disabled={importing || selectedCount === 0}
            >
              {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add {selectedCount > 0 ? `${selectedCount} ` : ''}Building{selectedCount === 1 ? '' : 's'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
