import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, RefreshCw, Leaf, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { apiRequest } from '../lib/utils';
import { toast } from 'sonner';
import AdminShell from '../components/layout/AdminShell';

const CATEGORIES = [
  'annual_vegetable', 'short_cycle_herb', 'perennial_shrub', 'medicinal_aromatic',
  'woody_tree', 'creeper_climber', 'ornamental_ground', 'butterfly_pollinator',
];

const CATEGORY_COLORS = {
  annual_vegetable:     'bg-green-100 text-green-800',
  short_cycle_herb:     'bg-lime-100 text-lime-800',
  perennial_shrub:      'bg-emerald-100 text-emerald-800',
  medicinal_aromatic:   'bg-teal-100 text-teal-800',
  woody_tree:           'bg-amber-100 text-amber-800',
  creeper_climber:      'bg-orange-100 text-orange-800',
  ornamental_ground:    'bg-pink-100 text-pink-800',
  butterfly_pollinator: 'bg-purple-100 text-purple-800',
};

const PLANT_TYPES = ['food', 'medicinal', 'ornamental', 'mixed'];
const CLIMATE_ZONES = ['hot-humid', 'hot-dry', 'composite', 'cold-dry'];
const PAGE_SIZE = 25;

const blank = () => ({
  common_name: '', scientific_name: '', family: '',
  plant_category: 'annual_vegetable', plant_type: 'food',
  local_names: {},
  yield_kg_per_plant_yr: 0, yield_confidence: 'medium',
  harvest_months: [], seasonality_factor: 1.0,
  survival_rate_urban_rooftop: 0.8,
  co2_kg_per_plant_yr: 0.3, co2_for_esg_reporting: false,
  water_lpd_manual: 1.0, water_lpd_drip: 0.6, water_lpd_mist: 0.4,
  max_height_ft: 2.0, root_depth_cm: 25, wind_tolerance: 'medium', heat_tolerance: 'high',
  weight_kg_per_plant: 2.0, terrace_suitability_score: 7, high_rise_suitable: true,
  container_minimum_litres: 15,
  climate_zones: ['hot-humid', 'composite'],
  optimal_climate: 'hot-humid',
  methods: { grow_bag: true, raised_bed: true, nft_hydroponics: false, dwc_hydroponics: false, vertical_panel: false, trellis: false },
  data_sources: [],
  shivani_validated: false,
  active: true,
});

function CategoryBadge({ category }) {
  const color = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800';
  const label = category?.replace(/_/g, ' ') || '—';
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>;
}

export default function AdminPlantsPage() {
  const [plants, setPlants] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [seedConfirm, setSeedConfirm] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterActive, setFilterActive] = useState('all');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);

  const load = useCallback(async (page = currentPage) => {
    setLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (filterType !== 'all') params.set('plant_type', filterType);
      if (filterZone !== 'all') params.set('climate_zone', filterZone);
      if (filterActive !== 'all') params.set('active', filterActive);
      const r = await apiRequest(`/admin/plants?${params}`);
      setPlants(r?.plants || []);
      setTotal(r?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterCategory, filterType, filterZone, filterActive]);

  useEffect(() => { load(currentPage); }, [load, currentPage]);

  const applyFilter = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const startNew = () => { setEditing(blank()); setOpen(true); };
  const startEdit = (p) => { setEditing({ ...p }); setOpen(true); };

  const save = async () => {
    const payload = {
      ...editing,
      yield_kg_per_plant_yr: Number(editing.yield_kg_per_plant_yr) || 0,
      co2_kg_per_plant_yr: Number(editing.co2_kg_per_plant_yr) || 0,
      water_lpd_manual: Number(editing.water_lpd_manual) || 0,
      water_lpd_drip: Number(editing.water_lpd_drip) || 0,
      water_lpd_mist: Number(editing.water_lpd_mist) || 0,
      terrace_suitability_score: Number(editing.terrace_suitability_score) || 5,
      container_minimum_litres: Number(editing.container_minimum_litres) || 10,
      weight_kg_per_plant: Number(editing.weight_kg_per_plant) || 1,
      max_height_ft: Number(editing.max_height_ft) || 1,
      root_depth_cm: Number(editing.root_depth_cm) || 20,
    };
    try {
      if (editing.plant_id) {
        await apiRequest(`/admin/plants/${editing.plant_id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Plant updated');
      } else {
        await apiRequest('/admin/plants', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Plant created');
      }
      setOpen(false);
      load(currentPage);
    } catch (e) {
      toast.error(e.message || 'Save failed');
    }
  };

  const toggleActive = async (plant) => {
    try {
      await apiRequest(`/admin/plants/${plant.plant_id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...plant, active: !plant.active }),
      });
      toast.success(plant.active ? 'Deactivated' : 'Activated');
      load(currentPage);
    } catch (e) {
      toast.error('Update failed');
    }
  };

  const toggleValidated = async (plant) => {
    try {
      await apiRequest(`/admin/plants/${plant.plant_id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...plant, shivani_validated: !plant.shivani_validated }),
      });
      toast.success(plant.shivani_validated ? 'Validation removed' : 'Marked as validated');
      load(currentPage);
    } catch (e) {
      toast.error('Update failed');
    }
  };

  const runSeed = async () => {
    setSeeding(true);
    try {
      const r = await apiRequest('/admin/plants/seed', { method: 'POST' });
      toast.success(`Seeded ${r.seeded} records`);
      setSeedConfirm(false);
      setCurrentPage(1);
      load(1);
    } catch (e) {
      toast.error('Seed failed');
    } finally { setSeeding(false); }
  };

  const toggleZone = (zone) => {
    const zones = editing.climate_zones || [];
    setEditing({ ...editing, climate_zones: zones.includes(zone) ? zones.filter(z => z !== zone) : [...zones, zone] });
  };

  const setMethod = (key, val) => {
    setEditing({ ...editing, methods: { ...(editing.methods || {}), [key]: val } });
  };

  return (
    <AdminShell
      title="Plant Database"
      subtitle={`${total} species · curated for Indian climate-aware rooftop plantation`}
      actions={
        <>
          <Button size="sm" variant="outline" onClick={() => load(currentPage)} data-testid="plants-refresh"><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setSeedConfirm(true)} data-testid="plants-seed-btn">
            <Leaf className="h-4 w-4 mr-1" /> Seed Database
          </Button>
          <Button size="sm" onClick={startNew} data-testid="plants-new-btn"><Plus className="h-4 w-4 mr-1" /> New Plant</Button>
        </>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={filterCategory} onValueChange={applyFilter(setFilterCategory)}>
          <SelectTrigger className="h-8 text-xs w-48"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={applyFilter(setFilterType)}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {PLANT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterZone} onValueChange={applyFilter(setFilterZone)}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="All zones" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All zones</SelectItem>
            {CLIMATE_ZONES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterActive} onValueChange={applyFilter(setFilterActive)}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Active/Inactive" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Record count */}
          <div className="px-4 py-3 border-b text-sm text-muted-foreground" data-testid="plants-count">
            {loading
              ? 'Loading…'
              : total === 0
                ? 'No plants match filters'
                : `Showing ${rangeStart}–${rangeEnd} of ${total.toLocaleString('en-IN')} plants`}
          </div>

          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Yield (kg/yr)</TableHead>
                    <TableHead>CO₂ (kg/yr)</TableHead>
                    <TableHead>Climate zones</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>High-rise</TableHead>
                    <TableHead>Validated</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plants.map(p => (
                    <TableRow key={p.plant_id} data-testid={`plant-row-${p.plant_id}`}>
                      <TableCell className="font-medium min-w-[180px]">
                        <div>{p.common_name}</div>
                        <div className="text-xs text-muted-foreground italic">{p.scientific_name}</div>
                      </TableCell>
                      <TableCell><CategoryBadge category={p.plant_category} /></TableCell>
                      <TableCell className="text-xs capitalize">{p.plant_type}</TableCell>
                      <TableCell className="text-xs">{p.yield_kg_per_plant_yr ?? '—'}</TableCell>
                      <TableCell className="text-xs">{p.co2_kg_per_plant_yr ?? '—'}</TableCell>
                      <TableCell className="text-xs max-w-[160px]">
                        <div className="flex flex-wrap gap-1">
                          {(p.climate_zones || []).map(z => (
                            <span key={z} className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded">{z}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{p.terrace_suitability_score}/10</TableCell>
                      <TableCell>
                        {p.high_rise_suitable
                          ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                          : <XCircle className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleValidated(p)}
                          title="Toggle Shivani validated"
                          className="p-0.5 rounded hover:bg-muted"
                        >
                          {p.shivani_validated
                            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                            : <XCircle className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={!!p.active}
                          onCheckedChange={() => toggleActive(p)}
                          data-testid={`plant-active-${p.plant_id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(p)} data-testid={`plant-edit-${p.plant_id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {plants.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="text-center py-10 text-muted-foreground">No plants match filters</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination controls */}
          {!loading && total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" data-testid="plants-pagination">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="plants-prev"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                data-testid="plants-next"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seed confirmation dialog */}
      <Dialog open={seedConfirm} onOpenChange={setSeedConfirm}>
        <DialogContent data-testid="seed-confirm-dialog">
          <DialogHeader><DialogTitle>Seed Plant Database</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will upsert all 297 built-in species records. Existing plants with matching IDs will not be overwritten. Safe to run multiple times.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSeedConfirm(false)}>Cancel</Button>
            <Button onClick={runSeed} disabled={seeding} data-testid="seed-confirm-btn">
              {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Leaf className="h-4 w-4 mr-1" />}
              Seed Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit / New dialog */}
      {editing && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="plant-editor">
            <DialogHeader>
              <DialogTitle>{editing.plant_id ? `Edit — ${editing.common_name}` : 'New plant'}</DialogTitle>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="md:col-span-2">
                <Label>Common name *</Label>
                <Input value={editing.common_name || ''} onChange={e => setEditing({ ...editing, common_name: e.target.value })} />
              </div>
              <div>
                <Label>Scientific name</Label>
                <Input value={editing.scientific_name || ''} onChange={e => setEditing({ ...editing, scientific_name: e.target.value })} className="italic" />
              </div>
              <div>
                <Label>Family</Label>
                <Input value={editing.family || ''} onChange={e => setEditing({ ...editing, family: e.target.value })} />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={editing.plant_category} onValueChange={v => setEditing({ ...editing, plant_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type *</Label>
                <Select value={editing.plant_type} onValueChange={v => setEditing({ ...editing, plant_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLANT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Yield kg/plant/yr</Label>
                <Input type="number" step="0.1" value={editing.yield_kg_per_plant_yr ?? ''} onChange={e => setEditing({ ...editing, yield_kg_per_plant_yr: e.target.value })} />
              </div>
              <div>
                <Label>CO₂ kg/plant/yr</Label>
                <Input type="number" step="0.1" value={editing.co2_kg_per_plant_yr ?? ''} onChange={e => setEditing({ ...editing, co2_kg_per_plant_yr: e.target.value })} />
              </div>
              <div>
                <Label>Terrace suitability score (1–10)</Label>
                <Input type="number" min="1" max="10" value={editing.terrace_suitability_score ?? ''} onChange={e => setEditing({ ...editing, terrace_suitability_score: e.target.value })} />
              </div>
              <div>
                <Label>Container min litres</Label>
                <Input type="number" value={editing.container_minimum_litres ?? ''} onChange={e => setEditing({ ...editing, container_minimum_litres: e.target.value })} />
              </div>
              <div>
                <Label>Max height (ft)</Label>
                <Input type="number" step="0.5" value={editing.max_height_ft ?? ''} onChange={e => setEditing({ ...editing, max_height_ft: e.target.value })} />
              </div>
              <div>
                <Label>Root depth (cm)</Label>
                <Input type="number" value={editing.root_depth_cm ?? ''} onChange={e => setEditing({ ...editing, root_depth_cm: e.target.value })} />
              </div>
              <div>
                <Label>Water manual (L/day)</Label>
                <Input type="number" step="0.1" value={editing.water_lpd_manual ?? ''} onChange={e => setEditing({ ...editing, water_lpd_manual: e.target.value })} />
              </div>
              <div>
                <Label>Water drip (L/day)</Label>
                <Input type="number" step="0.1" value={editing.water_lpd_drip ?? ''} onChange={e => setEditing({ ...editing, water_lpd_drip: e.target.value })} />
              </div>
              <div>
                <Label>Optimal climate</Label>
                <Select value={editing.optimal_climate || ''} onValueChange={v => setEditing({ ...editing, optimal_climate: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLIMATE_ZONES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Survival rate (0–1)</Label>
                <Input type="number" step="0.01" min="0" max="1" value={editing.survival_rate_urban_rooftop ?? ''} onChange={e => setEditing({ ...editing, survival_rate_urban_rooftop: e.target.value })} />
              </div>

              <div className="md:col-span-2">
                <Label>Climate zones</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CLIMATE_ZONES.map(z => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => toggleZone(z)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        (editing.climate_zones || []).includes(z)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card hover:bg-muted'
                      }`}
                    >{z}</button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <Label>Growing methods</Label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {Object.keys(editing.methods || {}).map(key => (
                    <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!(editing.methods || {})[key]}
                        onChange={e => setMethod(key, e.target.checked)}
                        className="rounded"
                      />
                      {key.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={!!editing.high_rise_suitable} onCheckedChange={v => setEditing({ ...editing, high_rise_suitable: v })} />
                  High-rise suitable
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={!!editing.co2_for_esg_reporting} onCheckedChange={v => setEditing({ ...editing, co2_for_esg_reporting: v })} />
                  CO₂ for ESG reporting
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={!!editing.shivani_validated} onCheckedChange={v => setEditing({ ...editing, shivani_validated: v })} />
                  Shivani validated
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={!!editing.active} onCheckedChange={v => setEditing({ ...editing, active: v })} />
                  Active
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} data-testid="plant-save-btn">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminShell>
  );
}
