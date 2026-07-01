import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, Plus, Building2, Zap, Leaf,
  MapPin, Download, FileText, CheckCircle2, Scan, ShieldCheck, Brain
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { apiRequest } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import TerraceAnnotationCanvas from '../components/vendor/TerraceAnnotationCanvas';

export default function CommercialProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const isNew = projectId === 'new';

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('setup');
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    complex_name: '',
    complex_address: '',
    complex_city: '',
    complex_type: 'it_park',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    budget_range: '',
    timeline_months: 6,
  });

  // AI terrace analysis state
  const ANALYSIS_EMPTY = {
    open: false, loading: false, saving: false,
    surveyId: null, imageB64: null, analysis: null,
    provider: null, modelName: null, latencyMs: null, costUsd: null,
  };
  const [analysisState, setAnalysisState] = useState(ANALYSIS_EMPTY);

  const [formData, setFormData] = useState({
    building_name: '',
    building_type: 'office',
    latitude: '',
    longitude: '',
    rooftop: {
      area_sqft: '',
      condition: 'good',
      waterproofing: 'present',
      load_capacity_kg_per_sqm: '',
      access_type: 'staircase',
      existing_structures: [],
      shading_percentage: '',
    },
    balconies: {
      has_balconies: false,
      count: '',
      avg_size_sqft: '',
      material: 'rcc',
      orientation: [],
      railing_type: 'grill',
    },
    walls: {
      has_boundary_walls: false,
      perimeter_meters: '',
      avg_height_meters: '',
      material: 'brick',
      sun_exposure: 'full',
      moisture_issues: false,
    },
    utility: {
      annual_electricity_kwh: '',
      monthly_avg_kwh: '',
      rate_per_unit_rupees: '',
      escalation_pct_per_year: 5,
    },
    existing_solar: {
      has_solar: false,
      capacity_kw: '',
      expansion_possible: true,
      max_expansion_kw: '',
    },
    survey_notes: '',
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isNew) {
      setLoading(false);
    } else {
      loadProject();
    }
  }, [isAuthenticated, projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/vendor/projects/${projectId}`);
      setProject(data);
    } catch (e) {
      toast.error('Failed to load project');
      navigate('/vendor/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!createForm.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    try {
      setCreating(true);
      const data = await apiRequest('/vendor/projects', {
        method: 'POST',
        body: JSON.stringify({ ...createForm, timeline_months: Number(createForm.timeline_months) }),
      });
      toast.success('Project created');
      navigate(`/vendor/projects/${data.vendor_project_id}`, { replace: true });
    } catch (e) {
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleAddBuilding = async () => {
    try {
      if (!formData.building_name) {
        toast.error('Building name is required');
        return;
      }

      const payload = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        rooftop: {
          ...formData.rooftop,
          area_sqft: parseFloat(formData.rooftop.area_sqft) || 0,
          load_capacity_kg_per_sqm: parseInt(formData.rooftop.load_capacity_kg_per_sqm) || 0,
          shading_percentage: parseFloat(formData.rooftop.shading_percentage) || 0,
        },
        balconies: {
          ...formData.balconies,
          count: parseInt(formData.balconies.count) || 0,
          avg_size_sqft: parseFloat(formData.balconies.avg_size_sqft) || 0,
        },
        walls: {
          ...formData.walls,
          perimeter_meters: parseFloat(formData.walls.perimeter_meters) || 0,
          avg_height_meters: parseFloat(formData.walls.avg_height_meters) || 0,
        },
        utility: {
          ...formData.utility,
          annual_electricity_kwh: parseFloat(formData.utility.annual_electricity_kwh) || 0,
          monthly_avg_kwh: parseFloat(formData.utility.monthly_avg_kwh) || 0,
          rate_per_unit_rupees: parseFloat(formData.utility.rate_per_unit_rupees) || 0,
        },
        existing_solar: {
          ...formData.existing_solar,
          capacity_kw: parseFloat(formData.existing_solar.capacity_kw) || null,
          max_expansion_kw: parseFloat(formData.existing_solar.max_expansion_kw) || 0,
        },
      };

      await apiRequest(`/vendor/projects/${projectId}/buildings`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast.success('Building added successfully');
      setShowAddBuilding(false);
      setFormData({
        building_name: '',
        building_type: 'office',
        latitude: '',
        longitude: '',
        rooftop: { area_sqft: '', condition: 'good', waterproofing: 'present', load_capacity_kg_per_sqm: '', access_type: 'staircase', existing_structures: [], shading_percentage: '' },
        balconies: { has_balconies: false, count: '', avg_size_sqft: '', material: 'rcc', orientation: [], railing_type: 'grill' },
        walls: { has_boundary_walls: false, perimeter_meters: '', avg_height_meters: '', material: 'brick', sun_exposure: 'full', moisture_issues: false },
        utility: { annual_electricity_kwh: '', monthly_avg_kwh: '', rate_per_unit_rupees: '', escalation_pct_per_year: 5 },
        existing_solar: { has_solar: false, capacity_kw: '', expansion_possible: true, max_expansion_kw: '' },
        survey_notes: '',
      });
      loadProject();
    } catch (e) {
      toast.error('Failed to add building');
    }
  };

  const handleGenerateProposal = async () => {
    try {
      setGeneratingProposal(true);
      await apiRequest(`/vendor/projects/${projectId}/generate-proposal`, {
        method: 'POST',
        body: JSON.stringify({ include_solar: true, include_greening: true }),
      });
      toast.success('Proposal generated successfully');
      loadProject();
    } catch (e) {
      toast.error('Failed to generate proposal');
    } finally {
      setGeneratingProposal(false);
    }
  };

  // ── AI rooftop analysis ─────────────────────────────────────────────────
  const handleAnalyseRooftop = async (survey) => {
    if (!survey.latitude || !survey.longitude) {
      toast.error('Add lat/lng coordinates to this building first');
      return;
    }
    const footprintSqft = survey.rooftop?.area_sqft || 5000;
    setAnalysisState({ ...ANALYSIS_EMPTY, loading: true, surveyId: survey.survey_id });
    try {
      const result = await apiRequest('/vendor/buildings/analyse-terrace', {
        method: 'POST',
        body: JSON.stringify({
          lat: parseFloat(survey.latitude),
          lng: parseFloat(survey.longitude),
          address: survey.building_name || '',
          building_name: survey.building_name,
          city: project?.complex_city || '',
          footprint_sqft: footprintSqft,
          provider: 'auto',
        }),
      });
      if (!result.success) throw new Error(result.error || 'Analysis failed');
      setAnalysisState({
        open: true, loading: false, saving: false,
        surveyId: survey.survey_id,
        imageB64: result.satellite_image_b64 || null,
        analysis: result.analysis,
        provider: result.provider_used || (result.model?.includes('gemini') ? 'gemini' : 'claude'),
        modelName: result.model,
        latencyMs: result.latency_ms,
        costUsd: result.cost_usd,
        footprintSqft,
      });
    } catch (e) {
      toast.error(`AI analysis failed: ${e.message}`);
      setAnalysisState(ANALYSIS_EMPTY);
    }
  };

  const handleViewExistingAnalysis = async (survey) => {
    // Re-fetch the satellite image for a previously-analysed building
    if (!survey.latitude || !survey.longitude) {
      toast.error('No coordinates stored for this building');
      return;
    }
    setAnalysisState({ ...ANALYSIS_EMPTY, loading: true, surveyId: survey.survey_id });
    try {
      const imgResult = await apiRequest(
        `/vendor/buildings/satellite-image?lat=${survey.latitude}&lng=${survey.longitude}`
      );
      const ta = survey.terrace_analysis;
      const footprintSqft = survey.rooftop?.area_sqft || 5000;
      setAnalysisState({
        open: true, loading: false, saving: false,
        surveyId: survey.survey_id,
        imageB64: imgResult.image_b64 || null,
        analysis: ta?.corrected_annotations
          ? { ...ta.ai_result, _from_correction: true }
          : ta?.ai_result,
        provider: ta?.provider || 'gemini',
        modelName: ta?.model,
        latencyMs: null,
        costUsd: null,
        footprintSqft,
        existingCorrections: ta?.corrected_annotations,
      });
    } catch (e) {
      toast.error(`Failed to load analysis: ${e.message}`);
      setAnalysisState(ANALYSIS_EMPTY);
    }
  };

  const handleSaveTerraceAnalysis = async ({ boxes, calculations, is_human_verified, original_analysis, delta }) => {
    setAnalysisState(prev => ({ ...prev, saving: true }));
    try {
      await apiRequest(
        `/vendor/projects/${projectId}/buildings/${analysisState.surveyId}/terrace`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            terrace_analysis: {
              provider: analysisState.provider,
              model: analysisState.modelName,
              ai_result: original_analysis,
              corrected_annotations: { boxes, is_human_verified },
              calculations,
              delta,
              run_at: new Date().toISOString(),
            },
          }),
        }
      );
      toast.success(is_human_verified ? 'Analysis saved — marked as human-verified' : 'Analysis saved');
      setAnalysisState(ANALYSIS_EMPTY);
      loadProject();
    } catch (e) {
      toast.error('Failed to save analysis');
      setAnalysisState(prev => ({ ...prev, saving: false }));
    }
  };
  // ────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isNew && !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Project not found.</p>
      </div>
    );
  }

  const totalRooftopSqft = project?.building_surveys?.reduce(
    (sum, b) => sum + (b.rooftop?.area_sqft || 0), 0
  ) || 0;
  const totalBalconies = project?.building_surveys?.reduce(
    (sum, b) => sum + (b.balconies?.count || 0), 0
  ) || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky top nav */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-6 h-14">
          <button
            onClick={() => navigate('/vendor/projects')}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Projects</span>
          </button>
          <span className="text-border">|</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-foreground truncate">
                {isNew ? 'New Project' : project?.name}
              </h1>
              {project?.complex_city && (
                <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{project.complex_city}
                </span>
              )}
              {project?.complex_type && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary hidden md:inline">
                  {project.complex_type.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {!isNew && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {project?.building_surveys?.length || 0} buildings
              </span>
            )}
            <Badge className="capitalize text-[10px]">{isNew ? 'new' : project?.status}</Badge>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-border px-6">
          {[
            { value: 'setup', label: 'Setup', locked: false },
            { value: 'buildings', label: `Buildings (${project?.building_surveys?.length || 0})`, locked: isNew },
            { value: 'solar', label: 'Solar', locked: isNew },
            { value: 'greening', label: 'Greening', locked: isNew },
            { value: 'proposal', label: 'Proposal', locked: isNew },
            { value: 'map', label: 'Map', locked: isNew },
          ].map(({ value, label, locked }) => (
            <button
              key={value}
              onClick={() => !locked && setActiveTab(value)}
              disabled={locked}
              className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
                locked
                  ? 'border-transparent text-muted-foreground/40 cursor-not-allowed'
                  : activeTab === value
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 container mx-auto px-6 py-6 max-w-5xl">
        {/* Hidden Tabs wrapper — just use conditional rendering below */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="hidden" />

          {/* Tab: Setup */}
          <TabsContent value="setup" className="mt-6">
            {isNew ? (
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle>Create New Project</CardTitle>
                  <CardDescription>Fill in the complex details to get started. You can add buildings after saving.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Project Name *</Label>
                    <Input
                      placeholder="e.g. TechPark Mumbai Assessment"
                      value={createForm.name}
                      onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Complex Name</Label>
                      <Input
                        placeholder="e.g. Mindspace IT Park"
                        value={createForm.complex_name}
                        onChange={e => setCreateForm({ ...createForm, complex_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Complex Type</Label>
                      <Select value={createForm.complex_type} onValueChange={v => setCreateForm({ ...createForm, complex_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[
                            ['it_park', 'IT Park'], ['hospital', 'Hospital'], ['mall', 'Mall'],
                            ['residential', 'Residential Complex'], ['industrial', 'Industrial'],
                            ['educational', 'Educational'], ['mixed_use', 'Mixed Use'],
                          ].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>City</Label>
                      <Input
                        placeholder="Mumbai"
                        value={createForm.complex_city}
                        onChange={e => setCreateForm({ ...createForm, complex_city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Address</Label>
                      <Input
                        placeholder="Street / locality"
                        value={createForm.complex_address}
                        onChange={e => setCreateForm({ ...createForm, complex_address: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Budget Range</Label>
                      <Input
                        placeholder="e.g. 10L – 25L"
                        value={createForm.budget_range}
                        onChange={e => setCreateForm({ ...createForm, budget_range: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Timeline (months)</Label>
                      <Input
                        type="number"
                        value={createForm.timeline_months}
                        onChange={e => setCreateForm({ ...createForm, timeline_months: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="border-t pt-4 grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>Contact Name</Label>
                      <Input
                        placeholder="Facilities Manager"
                        value={createForm.contact_name}
                        onChange={e => setCreateForm({ ...createForm, contact_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Contact Email</Label>
                      <Input
                        type="email"
                        placeholder="fm@company.com"
                        value={createForm.contact_email}
                        onChange={e => setCreateForm({ ...createForm, contact_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Contact Phone</Label>
                      <Input
                        placeholder="+91 98765 43210"
                        value={createForm.contact_phone}
                        onChange={e => setCreateForm({ ...createForm, contact_phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleCreateProject} disabled={creating} className="gap-2">
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {creating ? 'Creating…' : 'Create Project'}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/vendor/projects')}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader><CardTitle>Project Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      ['Complex Name', project?.complex_name],
                      ['Type', project?.complex_type],
                      ['Address', project?.complex_address],
                      ['City', project?.complex_city],
                      ['Budget Range', project?.budget_range],
                      ['Timeline', project?.timeline_months ? `${project.timeline_months} months` : null],
                      ['Contact', project?.contact_name],
                      ['Email', project?.contact_email],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label}>
                        <Label className="text-xs text-muted-foreground">{label}</Label>
                        <p className="font-medium mt-0.5">{value}</p>
                      </div>
                    ))}
                    {!project?.complex_name && (
                      <p className="text-muted-foreground col-span-2 text-sm">No complex details added.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Buildings */}
          <TabsContent value="buildings" className="mt-6 space-y-6">
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Buildings', value: project?.building_surveys?.length || 0 },
                { label: 'Total Rooftop', value: totalRooftopSqft ? `${totalRooftopSqft.toLocaleString()} sqft` : '—' },
                { label: 'Total Balconies', value: totalBalconies || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-muted/40 rounded-lg px-4 py-3 border border-border">
                  <p className="text-lg font-bold font-mono text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold text-foreground">Buildings</h2>
              <Button onClick={() => setShowAddBuilding(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Building
              </Button>
            </div>

            {project?.building_surveys && project.building_surveys.length > 0 ? (
              <div className="space-y-4">
                {project.building_surveys.map((building) => {
                  const ta = building.terrace_analysis;
                  const hasAnalysis = !!ta;
                  const isVerified = ta?.corrected_annotations?.is_human_verified;
                  const calcs = ta?.calculations;
                  const isAnalysing = analysisState.loading && analysisState.surveyId === building.survey_id;
                  const hasCoords = !!(building.latitude && building.longitude);

                  return (
                    <Card key={building.survey_id} className={isVerified ? 'border-primary/30' : ''}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Building2 className="h-5 w-5" />
                              {building.building_name}
                              {isVerified && (
                                <ShieldCheck className="h-4 w-4 text-primary" title="Human-verified AI analysis" />
                              )}
                            </CardTitle>
                            <CardDescription className="capitalize mt-1">{building.building_type}
                              {building.latitude && (
                                <span className="text-[10px] text-muted-foreground ml-2">
                                  {parseFloat(building.latitude).toFixed(4)}, {parseFloat(building.longitude).toFixed(4)}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="capitalize">{building.status}</Badge>
                            {hasAnalysis ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs h-7"
                                onClick={() => handleViewExistingAnalysis(building)}
                                disabled={isAnalysing}
                              >
                                {isAnalysing
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Scan className="h-3 w-3" />
                                }
                                View Analysis
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant={hasCoords ? 'outline' : 'ghost'}
                                className="gap-1.5 text-xs h-7"
                                onClick={() => handleAnalyseRooftop(building)}
                                disabled={isAnalysing || !hasCoords}
                                title={!hasCoords ? 'Add lat/lng coordinates to enable AI analysis' : 'Analyse rooftop with AI'}
                              >
                                {isAnalysing
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Brain className="h-3 w-3" />
                                }
                                {isAnalysing ? 'Analysing…' : 'AI Analyse'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-muted-foreground">Rooftop Area</Label>
                            <p className="font-medium">{building.rooftop.area_sqft} sqft</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Condition</Label>
                            <p className="font-medium capitalize">{building.rooftop.condition}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Annual kWh</Label>
                            <p className="font-medium">{Number(building.utility.annual_electricity_kwh).toLocaleString()}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Rate</Label>
                            <p className="font-medium">₹{building.utility.rate_per_unit_rupees}/kWh</p>
                          </div>
                        </div>

                        {/* AI analysis summary strip */}
                        {calcs && (
                          <div className="mt-3 pt-3 border-t border-border grid grid-cols-4 gap-3">
                            <div className="bg-muted/40 rounded px-2.5 py-1.5">
                              <p className="text-[10px] text-muted-foreground">Usable Roof</p>
                              <p className="text-sm font-bold text-foreground">{calcs.usable_pct}% <span className="font-normal text-xs">({calcs.usable_sqm} sqm)</span></p>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded px-2.5 py-1.5">
                              <p className="text-[10px] text-yellow-700 dark:text-yellow-400">Solar</p>
                              <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300">{calcs.solar_kw} kW</p>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded px-2.5 py-1.5">
                              <p className="text-[10px] text-yellow-700 dark:text-yellow-400">Year 1 Savings</p>
                              <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300">₹{calcs.savings_inr_yr1?.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-950/20 rounded px-2.5 py-1.5">
                              <p className="text-[10px] text-green-700 dark:text-green-400">Plants</p>
                              <p className="text-sm font-bold text-green-800 dark:text-green-300">{calcs.plants?.toLocaleString()}</p>
                            </div>
                          </div>
                        )}

                        {!hasCoords && !hasAnalysis && (
                          <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Add lat/lng in the building form to enable AI rooftop analysis
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No buildings added yet</p>
                  <Button onClick={() => setShowAddBuilding(true)}>Add First Building</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Solar */}
          <TabsContent value="solar" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Solar Analysis</CardTitle>
                <CardDescription>Coming Soon</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Detailed solar configuration and estimates coming in next update</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Greening */}
          <TabsContent value="greening" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Greening &amp; Biodiversity</CardTitle>
                <CardDescription>Coming Soon</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Plant recommendations and greening strategy coming in next update</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Proposal */}
          <TabsContent value="proposal" className="mt-6 space-y-6">
            {project?.proposal ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Proposal Summary</CardTitle>
                        <CardDescription>Generated: {new Date(project.proposal.generated_at).toLocaleDateString()}</CardDescription>
                      </div>
                      <Badge className="capitalize">{project.proposal.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 mb-8">
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Total Solar Potential</p>
                        <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                          {project.proposal.aggregate.total_solar_kw} kW
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Annual CO2 Sequestration</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {Number(project.proposal.aggregate.total_greening_co2_kg_year).toLocaleString()} kg
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Year 1 Savings</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          ₹{Number(project.proposal.aggregate.combined_year_1_savings_rupees).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Payback Period</p>
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                          {project.proposal.aggregate.total_payback_years} years
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-8">
                      <h3 className="font-semibold mb-4">Per-Building Breakdown</h3>
                      <div className="space-y-4">
                        {project.proposal.per_building.map((bldg) => (
                          <Card key={bldg.survey_id} className="bg-muted/30">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">{bldg.building_name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Solar Capacity</Label>
                                  <p className="font-medium">{bldg.solar.rooftop_potential_kw} kW</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Annual Savings</Label>
                                  <p className="font-medium">₹{Number(bldg.solar.annual_savings_rupees).toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Payback</Label>
                                  <p className="font-medium">{bldg.solar.payback_years} years</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button className="w-full gap-2" variant="outline" disabled>
                  <Download className="h-4 w-4" />
                  Download PDF (Coming Soon)
                </Button>
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-6">No proposal generated yet</p>
                  <Button onClick={handleGenerateProposal} disabled={generatingProposal} className="gap-2">
                    {generatingProposal ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Generate Proposal
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Map */}
          <TabsContent value="map" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Location Map</CardTitle>
                <CardDescription>Coming Soon</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Interactive map with obstacle detection and shadow analysis coming in next update</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Building Dialog */}
      <Dialog open={showAddBuilding} onOpenChange={setShowAddBuilding}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Building Survey</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-semibold">Building Information</h3>
              <Input
                placeholder="Building name (e.g., Building A)"
                value={formData.building_name}
                onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
              />
              <Select value={formData.building_type} onValueChange={(v) => setFormData({ ...formData, building_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['office', 'residential', 'hospital', 'mall', 'industrial'].map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Latitude
                    <span className="text-[10px] text-muted-foreground/60">(enables AI analysis)</span>
                  </Label>
                  <Input
                    placeholder="e.g. 19.0760"
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Longitude</Label>
                  <Input
                    placeholder="e.g. 72.8777"
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold">Rooftop Survey</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Area (sqft)"
                  type="number"
                  value={formData.rooftop.area_sqft}
                  onChange={(e) => setFormData({
                    ...formData,
                    rooftop: { ...formData.rooftop, area_sqft: e.target.value }
                  })}
                />
                <Select value={formData.rooftop.condition} onValueChange={(v) => setFormData({
                  ...formData,
                  rooftop: { ...formData.rooftop, condition: v }
                })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['excellent', 'good', 'fair', 'poor'].map((c) => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Load capacity (kg/sqm)"
                  type="number"
                  value={formData.rooftop.load_capacity_kg_per_sqm}
                  onChange={(e) => setFormData({
                    ...formData,
                    rooftop: { ...formData.rooftop, load_capacity_kg_per_sqm: e.target.value }
                  })}
                />
                <Input
                  placeholder="Shading (%)"
                  type="number"
                  value={formData.rooftop.shading_percentage}
                  onChange={(e) => setFormData({
                    ...formData,
                    rooftop: { ...formData.rooftop, shading_percentage: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold">Utility Baseline</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Annual electricity (kWh)"
                  type="number"
                  value={formData.utility.annual_electricity_kwh}
                  onChange={(e) => setFormData({
                    ...formData,
                    utility: { ...formData.utility, annual_electricity_kwh: e.target.value }
                  })}
                />
                <Input
                  placeholder="Rate (₹/kWh)"
                  type="number"
                  value={formData.utility.rate_per_unit_rupees}
                  onChange={(e) => setFormData({
                    ...formData,
                    utility: { ...formData.utility, rate_per_unit_rupees: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_balconies"
                  checked={formData.balconies.has_balconies}
                  onChange={(e) => setFormData({
                    ...formData,
                    balconies: { ...formData.balconies, has_balconies: e.target.checked }
                  })}
                />
                <Label htmlFor="has_balconies">Building has balconies</Label>
              </div>
              {formData.balconies.has_balconies && (
                <Input
                  placeholder="Number of balconies"
                  type="number"
                  value={formData.balconies.count}
                  onChange={(e) => setFormData({
                    ...formData,
                    balconies: { ...formData.balconies, count: e.target.value }
                  })}
                />
              )}
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_walls"
                  checked={formData.walls.has_boundary_walls}
                  onChange={(e) => setFormData({
                    ...formData,
                    walls: { ...formData.walls, has_boundary_walls: e.target.checked }
                  })}
                />
                <Label htmlFor="has_walls">Building has boundary walls</Label>
              </div>
              {formData.walls.has_boundary_walls && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Perimeter (meters)"
                    type="number"
                    value={formData.walls.perimeter_meters}
                    onChange={(e) => setFormData({
                      ...formData,
                      walls: { ...formData.walls, perimeter_meters: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="Height (meters)"
                    type="number"
                    value={formData.walls.avg_height_meters}
                    onChange={(e) => setFormData({
                      ...formData,
                      walls: { ...formData.walls, avg_height_meters: e.target.value }
                    })}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label>Survey Notes (Optional)</Label>
              <Textarea
                placeholder="Any additional observations..."
                value={formData.survey_notes}
                onChange={(e) => setFormData({ ...formData, survey_notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBuilding(false)}>Cancel</Button>
            <Button onClick={handleAddBuilding}>Add Building</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AI Terrace Analysis dialog ──────────────────────────────────────── */}
      <Dialog
        open={analysisState.open}
        onOpenChange={(open) => { if (!open) setAnalysisState(ANALYSIS_EMPTY); }}
      >
        <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] p-0 overflow-hidden flex flex-col">
          <TerraceAnnotationCanvas
            imageB64={analysisState.imageB64}
            analysis={analysisState.analysis}
            footprintSqft={analysisState.footprintSqft || 5000}
            city={project?.complex_city || ''}
            provider={analysisState.provider || 'gemini'}
            modelName={analysisState.modelName}
            latencyMs={analysisState.latencyMs}
            costUsd={analysisState.costUsd}
            onSave={handleSaveTerraceAnalysis}
            onClose={() => setAnalysisState(ANALYSIS_EMPTY)}
            saving={analysisState.saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
