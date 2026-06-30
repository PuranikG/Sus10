import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, Plus, Building2, Zap, Leaf,
  MapPin, Download, FileText, CheckCircle2
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
import Navbar from '../components/layout/Navbar';
import { toast } from 'sonner';

export default function CommercialProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('setup');
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [generatingProposal, setGeneratingProposal] = useState(false);

  const [formData, setFormData] = useState({
    building_name: '',
    building_type: 'office',
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
    if (isAuthenticated && (projectId || projectId === 'new')) {
      if (projectId === 'new') {
        setProject({ name: 'New Project', building_surveys: [], status: 'draft' });
        setLoading(false);
      } else {
        loadProject();
      }
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

  const handleAddBuilding = async () => {
    try {
      if (!formData.building_name) {
        toast.error('Building name is required');
        return;
      }

      const payload = {
        ...formData,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="text-center py-16">
            <CardContent>
              <p className="text-red-600">Project not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/vendor/projects')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            {project.complex_city && (
              <p className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {project.complex_city} • {project.complex_type}
              </p>
            )}
          </div>
          <Badge className="capitalize">{project.status}</Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="buildings">Buildings <Badge className="ml-2">{project.building_surveys?.length || 0}</Badge></TabsTrigger>
            <TabsTrigger value="solar">Solar</TabsTrigger>
            <TabsTrigger value="greening">Greening</TabsTrigger>
            <TabsTrigger value="proposal">Proposal</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
          </TabsList>

          {/* Tab: Setup */}
          <TabsContent value="setup" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {project.complex_name && (
                    <>
                      <div>
                        <Label className="text-sm">Complex Name</Label>
                        <p className="font-medium">{project.complex_name}</p>
                      </div>
                      <div>
                        <Label className="text-sm">Type</Label>
                        <p className="font-medium capitalize">{project.complex_type}</p>
                      </div>
                      <div>
                        <Label className="text-sm">Address</Label>
                        <p className="font-medium">{project.complex_address}</p>
                      </div>
                      <div>
                        <Label className="text-sm">City</Label>
                        <p className="font-medium">{project.complex_city}</p>
                      </div>
                      <div>
                        <Label className="text-sm">Budget Range</Label>
                        <p className="font-medium">{project.budget_range}</p>
                      </div>
                      <div>
                        <Label className="text-sm">Timeline</Label>
                        <p className="font-medium">{project.timeline_months} months</p>
                      </div>
                    </>
                  )}
                  {!project.complex_name && (
                    <p className="text-muted-foreground col-span-2">Setup details coming soon. Start by adding buildings.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Buildings */}
          <TabsContent value="buildings" className="mt-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Buildings in this project</h2>
                <p className="text-sm text-muted-foreground">Total: {project.building_surveys?.length || 0}</p>
              </div>
              <Button onClick={() => setShowAddBuilding(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Building
              </Button>
            </div>

            {project.building_surveys && project.building_surveys.length > 0 ? (
              <div className="space-y-4">
                {project.building_surveys.map((building) => (
                  <Card key={building.survey_id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {building.building_name}
                          </CardTitle>
                          <CardDescription className="capitalize mt-1">{building.building_type}</CardDescription>
                        </div>
                        <Badge className="capitalize">{building.status}</Badge>
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
                    </CardContent>
                  </Card>
                ))}
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
            {project.proposal ? (
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
    </div>
  );
}
