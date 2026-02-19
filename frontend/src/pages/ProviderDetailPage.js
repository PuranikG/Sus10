import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Star, MapPin, CheckCircle2, Building2,
  ArrowLeft, Award, Briefcase, Phone, Mail, Globe,
  Calendar, ChevronRight, Leaf, ImageIcon
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { apiRequest, formatCurrency } from '../lib/utils';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function ProviderDetailPage() {
  const { providerId } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const data = await apiRequest(`/providers/${providerId}`);
        setProvider(data);
      } catch (error) {
        console.error('Failed to fetch provider:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [providerId]);

  if (loading) {
    return <ProviderSkeleton />;
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-max section-padding py-20 text-center">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-heading font-bold mb-2">Provider Not Found</h1>
          <p className="text-muted-foreground mb-6">The provider you're looking for doesn't exist.</p>
          <Link to="/providers">
            <Button>Browse Providers</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container-max section-padding py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/providers" className="hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span>Providers</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{provider.company_name}</span>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 rounded-2xl">
              <AvatarFallback className="rounded-2xl bg-primary/10 text-primary text-3xl font-heading">
                {provider.company_name?.[0] || 'P'}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-heading font-bold">{provider.company_name}</h1>
                    {provider.verification_status === 'approved' && (
                      <Badge className="bg-primary">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="mb-3">{provider.company_type}</Badge>
                  <p className="text-muted-foreground max-w-2xl">{provider.description}</p>
                </div>
                
                {provider.customer_rating && (
                  <Card className="p-4 text-center">
                    <div className="flex items-center gap-1 justify-center text-yellow-500 mb-1">
                      <Star className="h-5 w-5 fill-current" />
                      <span className="text-2xl font-bold">{provider.customer_rating}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{provider.review_count} reviews</div>
                  </Card>
                )}
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-6 mt-6">
                {provider.service_areas && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{provider.service_areas.join(', ')}</span>
                  </div>
                )}
                {provider.pricing_model && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{provider.pricing_model.replace(/_/g, ' ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8">
        <div className="container-max section-padding">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="portfolio" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="portfolio" data-testid="tab-portfolio">Portfolio</TabsTrigger>
                  <TabsTrigger value="certifications" data-testid="tab-certifications">Certifications</TabsTrigger>
                  <TabsTrigger value="team" data-testid="tab-team">Team</TabsTrigger>
                </TabsList>

                <TabsContent value="portfolio" className="space-y-6">
                  {provider.portfolio_projects && provider.portfolio_projects.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      {provider.portfolio_projects.map((project, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="overflow-hidden card-hover">
                            <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                              <ImageIcon className="h-12 w-12 text-primary/40" />
                            </div>
                            <CardContent className="p-4">
                              <h4 className="font-heading font-semibold mb-1">{project.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <MapPin className="h-3 w-3" />
                                <span>{project.location}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span>{project.area?.toLocaleString()} sqm</span>
                                {project.impact && (
                                  <Badge variant="secondary">
                                    <Leaf className="h-3 w-3 mr-1" />
                                    {project.impact}
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-12 text-center">
                      <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="font-medium mb-2">No projects yet</h3>
                      <p className="text-muted-foreground">
                        This provider hasn't added portfolio projects.
                      </p>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="certifications" className="space-y-4">
                  {provider.certifications && provider.certifications.length > 0 ? (
                    provider.certifications.map((cert, index) => (
                      <Card key={index}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Award className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{cert.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Issued by {cert.issued_by}
                            </p>
                          </div>
                          {cert.valid_until && (
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Valid until</div>
                              <div className="text-sm font-medium">{cert.valid_until}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="p-12 text-center">
                      <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="font-medium mb-2">No certifications listed</h3>
                      <p className="text-muted-foreground">
                        This provider hasn't added certifications yet.
                      </p>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="team">
                  {provider.team_composition ? (
                    <div className="grid md:grid-cols-3 gap-4">
                      {Object.entries(provider.team_composition).map(([role, count]) => (
                        <Card key={role}>
                          <CardContent className="p-4 text-center">
                            <div className="text-3xl font-heading font-bold text-primary mb-1">
                              {count}
                            </div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {role.replace(/_/g, ' ')}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-12 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="font-medium mb-2">Team info not available</h3>
                      <p className="text-muted-foreground">
                        Team composition details will be added soon.
                      </p>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Get in Touch</CardTitle>
                  <CardDescription>
                    Request a quote or consultation for your project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link to={`/leads/new?provider=${providerId}`}>
                    <Button className="w-full" size="lg" data-testid="request-quote-btn">
                      Request Quote
                    </Button>
                  </Link>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>Contact via platform</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Usually responds within 24h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Provider Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Projects Completed</span>
                    <span className="font-medium">{provider.portfolio_projects?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Certifications</span>
                    <span className="font-medium">{provider.certifications?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Service Areas</span>
                    <span className="font-medium">{provider.service_areas?.length || 0}</span>
                  </div>
                  {provider.approval_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Member Since</span>
                      <span className="font-medium">
                        {new Date(provider.approval_date).toLocaleDateString('en-IN', { 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function ProviderSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="border-b border-border bg-card/50">
        <div className="container-max section-padding py-8">
          <Skeleton className="h-4 w-48 mb-4" />
          <div className="flex gap-6">
            <Skeleton className="h-24 w-24 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full max-w-xl" />
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
