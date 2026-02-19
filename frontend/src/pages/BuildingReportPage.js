import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, MapPin, Leaf, Sun, Droplets, Wind,
  ArrowLeft, Download, Share2, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Minus, Info, ChevronRight,
  Calculator, FileText, Users, Clock, Mail, Copy, Check,
  MessageCircle, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend
} from 'recharts';
import { apiRequest, formatCurrency, getAQILevel, getBuildingTypeLabel } from '../lib/utils';
import { generateBuildingReportPDF } from '../lib/pdfGenerator';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { toast } from 'sonner';

export default function BuildingReportPage() {
  const { buildingId } = useParams();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await apiRequest(`/buildings/${buildingId}/report`);
        setReportData(data);
      } catch (error) {
        console.error('Failed to fetch report:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [buildingId]);

  const handleDownloadPDF = async () => {
    if (!reportData) return;
    
    setGeneratingPDF(true);
    try {
      const fileName = await generateBuildingReportPDF(
        reportData.building,
        reportData.recommendations,
        reportData.audit_logs,
        reportData.providers
      );
      toast.success(`Report downloaded: ${fileName}`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return <ReportSkeleton />;
  }

  if (!reportData || !reportData.building) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-max section-padding py-20 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-heading font-bold mb-2">Building Not Found</h1>
          <p className="text-muted-foreground mb-6">The building you're looking for doesn't exist.</p>
          <Link to="/search">
            <Button>Browse Buildings</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const { building, recommendations, audit_logs, providers } = reportData;
  const aqiInfo = building.current_aqi ? getAQILevel(building.current_aqi) : null;

  // Prepare chart data
  const impactData = recommendations.map((rec, index) => ({
    name: rec.solution_type?.name || `Solution ${index + 1}`,
    co2: rec.impact_projections?.co2_sequestration_kg_year || 0,
    suitability: rec.suitability_score || 0,
  }));

  const suitabilityData = recommendations.map((rec, index) => ({
    name: rec.solution_type?.name || `Solution ${index + 1}`,
    value: rec.suitability_score || 0,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container-max section-padding py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/search" className="hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span>Buildings</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{building.city}</span>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Building Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary">{getBuildingTypeLabel(building.building_type)}</Badge>
                    {building.data_quality_score >= 85 && (
                      <Badge className="bg-primary">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified Data
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-2">
                    {building.address}
                  </h1>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{building.city}, {building.pincode}</span>
                    {building.ward && <span>• {building.ward}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <ShareDropdown building={building} recommendations={recommendations} />
                  <Button size="sm" data-testid="download-report-btn">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  icon={Building2}
                  label="Footprint"
                  value={`${(building.building_footprint_area || 0).toLocaleString()} sqm`}
                />
                <MetricCard
                  icon={Leaf}
                  label="Usable Terrace"
                  value={`${(building.usable_terrace_area || 0).toLocaleString()} sqm`}
                />
                {aqiInfo && (
                  <MetricCard
                    icon={Wind}
                    label="Current AQI"
                    value={building.current_aqi}
                    valueColor={aqiInfo.color}
                    trend={building.aqi_trend}
                  />
                )}
                <MetricCard
                  icon={CheckCircle2}
                  label="Data Quality"
                  value={`${building.data_quality_score || 0}%`}
                />
              </div>
            </div>

            {/* Suitability Score */}
            <Card className="lg:row-span-1">
              <CardContent className="p-6 text-center">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Overall Green Potential</h3>
                <div className="relative w-40 h-40 mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="70%"
                      outerRadius="100%"
                      data={[{ value: recommendations[0]?.suitability_score || 75 }]}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar
                        dataKey="value"
                        cornerRadius={10}
                        fill="hsl(var(--primary))"
                        background={{ fill: 'hsl(var(--muted))' }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div>
                      <div className="text-4xl font-heading font-bold text-primary">
                        {recommendations[0]?.suitability_score || 75}%
                      </div>
                      <div className="text-xs text-muted-foreground">Suitability</div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Based on terrace area, AQI, and local climate data
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Report Tabs */}
      <section className="py-8">
        <div className="container-max section-padding">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="solutions" data-testid="tab-solutions">Solutions</TabsTrigger>
              <TabsTrigger value="explainability" data-testid="tab-explainability">Explainability</TabsTrigger>
              <TabsTrigger value="providers" data-testid="tab-providers">Providers</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8">
              {/* Problem Statement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-alert-orange" />
                    The Challenge
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    {building.city} faces significant air quality challenges with current AQI at{' '}
                    <span className={`font-medium ${aqiInfo?.color || ''}`}>
                      {building.current_aqi || 'N/A'}
                    </span>
                    {building.aqi_trend && (
                      <span className="text-sm">
                        {' '}({building.aqi_trend === 'rising' ? 'trending up' : 
                              building.aqi_trend === 'improving' ? 'improving' : 'stable'})
                      </span>
                    )}.
                    Urban heat island effect and limited green cover contribute to elevated temperatures
                    and poor air quality in commercial zones.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 pt-4">
                    <Card className="bg-red-500/10 border-red-500/20">
                      <CardContent className="p-4 text-center">
                        <Wind className="h-8 w-8 mx-auto text-red-500 mb-2" />
                        <div className="text-2xl font-bold text-red-500">{building.current_aqi || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">Current AQI</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-500/10 border-orange-500/20">
                      <CardContent className="p-4 text-center">
                        <Sun className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                        <div className="text-2xl font-bold text-orange-500">+3-5°C</div>
                        <div className="text-sm text-muted-foreground">Heat Island Effect</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-500/10 border-blue-500/20">
                      <CardContent className="p-4 text-center">
                        <Droplets className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                        <div className="text-2xl font-bold text-blue-500">60%</div>
                        <div className="text-sm text-muted-foreground">Water Runoff</div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Impact Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Potential Impact
                  </CardTitle>
                  <CardDescription>
                    Projected environmental benefits from implementing recommended solutions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={impactData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="co2" name="CO2 Sequestration (kg/year)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Solutions Tab */}
            <TabsContent value="solutions" className="space-y-6">
              {recommendations.length === 0 ? (
                <Card className="p-12 text-center">
                  <Leaf className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-heading font-medium mb-2">No recommendations yet</h3>
                  <p className="text-muted-foreground">
                    Analysis is in progress. Check back soon for personalized solutions.
                  </p>
                </Card>
              ) : (
                recommendations.map((rec, index) => (
                  <SolutionCard
                    key={rec.recommendation_id}
                    recommendation={rec}
                    index={index}
                    onViewDetails={() => setSelectedRecommendation(rec)}
                    auditLog={audit_logs.find(a => a.recommendation_id === rec.recommendation_id)}
                  />
                ))
              )}
            </TabsContent>

            {/* Explainability Tab */}
            <TabsContent value="explainability" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Calculation Methodology
                  </CardTitle>
                  <CardDescription>
                    Full transparency in how we calculate your building's green potential
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {audit_logs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No audit logs available for this building.
                    </p>
                  ) : (
                    audit_logs.map((audit, index) => (
                      <div key={audit.audit_id} className="space-y-4">
                        {index > 0 && <hr className="border-border" />}
                        <h4 className="font-heading font-medium">
                          {recommendations.find(r => r.recommendation_id === audit.recommendation_id)?.solution_type?.name || 'Solution'}
                        </h4>
                        <div className="space-y-3">
                          {audit.calculation_steps?.map((step, stepIndex) => (
                            <div key={stepIndex} className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                                {step.step}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{step.description}</div>
                                {step.formula && (
                                  <div className="text-sm font-mono text-muted-foreground mt-1">
                                    Formula: {step.formula}
                                  </div>
                                )}
                                {step.input && (
                                  <div className="text-sm text-muted-foreground">
                                    Input: {step.input}
                                  </div>
                                )}
                                {step.result && (
                                  <div className="text-sm font-medium text-primary mt-1">
                                    Result: {step.result}
                                  </div>
                                )}
                                {step.source && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Source: {step.source}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {audit.final_output && (
                          <div className="p-4 bg-primary/10 rounded-lg">
                            <h5 className="font-medium mb-2">Final Output</h5>
                            <div className="grid md:grid-cols-2 gap-4">
                              {Object.entries(audit.final_output).map(([key, value]) => (
                                <div key={key}>
                                  <div className="text-sm text-muted-foreground capitalize">
                                    {key.replace(/_/g, ' ')}
                                  </div>
                                  <div className="font-medium">
                                    {typeof value === 'object' 
                                      ? `${value.value?.toLocaleString()} ${value.unit || ''}`
                                      : value
                                    }
                                  </div>
                                  {typeof value === 'object' && value.confidence && (
                                    <div className="text-xs text-muted-foreground">
                                      Confidence: {(value.confidence * 100).toFixed(0)}%
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Providers Tab */}
            <TabsContent value="providers" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-heading font-semibold">Recommended Providers</h3>
                  <p className="text-muted-foreground">Verified solution providers serving {building.city}</p>
                </div>
                <Link to="/providers">
                  <Button variant="outline">View All Providers</Button>
                </Link>
              </div>

              {providers.length === 0 ? (
                <Card className="p-12 text-center">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-heading font-medium mb-2">No providers available</h3>
                  <p className="text-muted-foreground mb-4">
                    No verified providers are currently serving this area.
                  </p>
                  <Link to="/providers/signup">
                    <Button>Become a Provider</Button>
                  </Link>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {providers.map((provider) => (
                    <ProviderCard key={provider.provider_id} provider={provider} buildingId={buildingId} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Footer />

      {/* Explainability Dialog */}
      <ExplainabilityDialog
        recommendation={selectedRecommendation}
        auditLog={audit_logs.find(a => a.recommendation_id === selectedRecommendation?.recommendation_id)}
        onClose={() => setSelectedRecommendation(null)}
      />
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, valueColor, trend }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {trend && (
            <div className={trend === 'rising' ? 'text-red-500' : trend === 'improving' ? 'text-green-500' : 'text-muted-foreground'}>
              {trend === 'rising' ? <TrendingUp className="h-4 w-4" /> :
               trend === 'improving' ? <TrendingDown className="h-4 w-4" /> :
               <Minus className="h-4 w-4" />}
            </div>
          )}
        </div>
        <div className={`text-2xl font-heading font-bold mt-2 ${valueColor || ''}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function SolutionCard({ recommendation, index, onViewDetails, auditLog }) {
  const solutionType = recommendation.solution_type || {};
  const iconMap = {
    greening: Leaf,
    energy: Sun,
    water: Droplets,
    waste: Wind,
  };
  const Icon = iconMap[solutionType.category] || Leaf;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Icon & Basic Info */}
            <div className="flex gap-4 flex-1">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-heading font-semibold mb-1">{solutionType.name || 'Solution'}</h3>
                <p className="text-muted-foreground text-sm mb-4">{solutionType.description}</p>
                
                {/* Impact Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {recommendation.impact_projections && Object.entries(recommendation.impact_projections).slice(0, 3).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-lg font-bold text-primary">{typeof value === 'number' ? value.toLocaleString() : value}</div>
                      <div className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Suitability & CTA */}
            <div className="flex flex-col items-center justify-center gap-4 md:border-l md:pl-6 border-border">
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-primary">
                  {recommendation.suitability_score}%
                </div>
                <div className="text-xs text-muted-foreground">Suitability</div>
              </div>
              <Progress value={recommendation.suitability_score} className="w-24 h-2" />
              {recommendation.cost_estimate && (
                <div className="text-center">
                  <div className="text-sm font-medium">{formatCurrency(recommendation.cost_estimate)}</div>
                  <div className="text-xs text-muted-foreground">Est. Cost</div>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={onViewDetails} data-testid={`view-details-${index}`}>
                <Info className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ProviderCard({ provider, buildingId }) {
  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-heading font-semibold">{provider.company_name}</h4>
                <Badge variant="outline" className="mt-1">{provider.company_type}</Badge>
              </div>
              {provider.customer_rating && (
                <div className="text-right">
                  <div className="text-lg font-bold">{provider.customer_rating}</div>
                  <div className="text-xs text-muted-foreground">{provider.review_count} reviews</div>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{provider.description}</p>
            <div className="flex gap-2 mt-4">
              <Link to={`/providers/${provider.provider_id}`}>
                <Button variant="outline" size="sm">View Profile</Button>
              </Link>
              <Link to={`/leads/new?building=${buildingId}&provider=${provider.provider_id}`}>
                <Button size="sm">Request Quote</Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExplainabilityDialog({ recommendation, auditLog, onClose }) {
  if (!recommendation) return null;

  return (
    <Dialog open={!!recommendation} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recommendation.solution_type?.name || 'Solution'} - Calculation Details</DialogTitle>
          <DialogDescription>
            Full breakdown of how we calculated the suitability and impact projections
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Reasoning */}
          <div>
            <h4 className="font-medium mb-2">Reasoning</h4>
            <p className="text-muted-foreground">{recommendation.reasoning}</p>
          </div>

          {/* Calculation Steps */}
          {auditLog?.calculation_steps && (
            <div>
              <h4 className="font-medium mb-3">Calculation Steps</h4>
              <div className="space-y-3">
                {auditLog.calculation_steps.map((step, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                      {step.step}
                    </div>
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{step.description}</div>
                      {step.formula && (
                        <code className="text-xs text-muted-foreground block mt-1">{step.formula}</code>
                      )}
                      {step.result && (
                        <div className="text-primary font-medium mt-1">{step.result}</div>
                      )}
                      {step.source && (
                        <div className="text-xs text-muted-foreground mt-1">Source: {step.source}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impact Projections */}
          <div>
            <h4 className="font-medium mb-3">Impact Projections</h4>
            <div className="grid grid-cols-2 gap-4">
              {recommendation.impact_projections && Object.entries(recommendation.impact_projections).map(([key, value]) => (
                <Card key={key} className="p-4">
                  <div className="text-xl font-bold text-primary">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </div>
                  <div className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="border-b border-border bg-card/50">
        <div className="container-max section-padding py-8">
          <Skeleton className="h-4 w-48 mb-4" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function ShareDropdown({ building, recommendations }) {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const suitabilityScore = recommendations?.[0]?.suitability_score || 75;
  const co2Impact = recommendations?.[0]?.impact_projections?.co2_sequestration_kg_year || 0;
  
  const shareTitle = `Green Potential Report: ${building.address}`;
  const shareText = `🌿 ${building.address} has ${suitabilityScore}% green potential!\n\n` +
    `📍 Location: ${building.city}\n` +
    `🏢 Type: ${getBuildingTypeLabel(building.building_type)}\n` +
    `🌱 Terrace Area: ${building.usable_terrace_area?.toLocaleString()} sqm\n` +
    `💨 Current AQI: ${building.current_aqi || 'N/A'}\n` +
    (co2Impact > 0 ? `🌳 Potential CO2 Sequestration: ${co2Impact.toLocaleString()} kg/year\n\n` : '\n') +
    `Check out the full report on Sus10 AI:`;
  
  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
    window.open(whatsappUrl, '_blank');
  };
  
  const handleEmailShare = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(shareText + '\n\n' + shareUrl);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" data-testid="share-report-btn">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleWhatsAppShare} className="cursor-pointer" data-testid="share-whatsapp">
          <MessageCircle className="h-4 w-4 mr-3 text-green-500" />
          <div>
            <div className="font-medium">WhatsApp</div>
            <div className="text-xs text-muted-foreground">Share with contacts</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmailShare} className="cursor-pointer" data-testid="share-email">
          <Mail className="h-4 w-4 mr-3 text-blue-500" />
          <div>
            <div className="font-medium">Email</div>
            <div className="text-xs text-muted-foreground">Send via email</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer" data-testid="share-copy-link">
          {copied ? (
            <Check className="h-4 w-4 mr-3 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 mr-3" />
          )}
          <div>
            <div className="font-medium">{copied ? 'Copied!' : 'Copy Link'}</div>
            <div className="text-xs text-muted-foreground">Copy report URL</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
