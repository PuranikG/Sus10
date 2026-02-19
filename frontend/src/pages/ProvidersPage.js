import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Star, MapPin, CheckCircle2, Building2,
  Search, Filter, Award, Briefcase, Phone, Mail, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { apiRequest } from '../lib/utils';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function ProvidersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState(searchParams.get('city') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (cityFilter) params.append('city', cityFilter);
        if (typeFilter) params.append('service_type', typeFilter);
        params.append('limit', '20');
        
        const data = await apiRequest(`/providers?${params.toString()}`);
        setProviders(data);
      } catch (error) {
        console.error('Failed to fetch providers:', error);
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [cityFilter, typeFilter]);

  const cities = ['Delhi', 'Mumbai', 'Pune', 'Gurugram', 'Noida', 'Bangalore'];
  const providerTypes = [
    { value: 'landscaper', label: 'Landscaper' },
    { value: 'fms', label: 'Facility Management' },
    { value: 'esg_consultant', label: 'ESG Consultant' },
    { value: 'solar_installer', label: 'Solar Installer' },
    { value: 'water_specialist', label: 'Water Specialist' },
  ];

  const filteredProviders = providers.filter(p => 
    !searchQuery || 
    p.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container-max section-padding py-12">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4">Provider Network</Badge>
            <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tight mb-4">
              Verified Solution Providers
            </h1>
            <p className="text-lg text-muted-foreground">
              Connect with certified landscapers, solar installers, and sustainability experts 
              ready to transform your building.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 border-b border-border bg-card/50">
        <div className="container-max section-padding">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-background"
                data-testid="provider-search-input"
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-full md:w-[180px] h-12" data-testid="city-filter">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px] h-12" data-testid="type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {providerTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Provider List */}
      <section className="py-8">
        <div className="container-max section-padding">
          {/* Results Count */}
          <div className="mb-6 flex items-center justify-between">
            {loading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <p className="text-muted-foreground">
                Found <span className="font-medium text-foreground">{filteredProviders.length}</span> providers
              </p>
            )}
            <Link to="/providers/signup">
              <Button variant="outline" data-testid="become-provider-btn">
                <Users className="h-4 w-4 mr-2" />
                Become a Provider
              </Button>
            </Link>
          </div>

          {/* Provider Cards */}
          {loading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Skeleton className="h-16 w-16 rounded-xl" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProviders.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-heading font-medium mb-2">No providers found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search in a different area.
              </p>
              <Button variant="outline" onClick={() => {
                setCityFilter('');
                setTypeFilter('');
                setSearchQuery('');
              }}>
                Clear Filters
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredProviders.map((provider, index) => (
                <ProviderCard key={provider.provider_id} provider={provider} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-card border-t border-border">
        <div className="container-max section-padding text-center">
          <h2 className="text-3xl font-heading font-bold mb-4">
            Are you a sustainability professional?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Join our network of verified providers. Get access to qualified leads from 
            building owners looking to implement green solutions.
          </p>
          <Link to="/providers/signup">
            <Button size="lg" className="rounded-full" data-testid="join-network-btn">
              Join Provider Network
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function ProviderCard({ provider, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/providers/${provider.provider_id}`} data-testid={`provider-card-${provider.provider_id}`}>
        <Card className="h-full card-hover">
          <CardContent className="p-6">
            <div className="flex gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <Avatar className="h-16 w-16 rounded-xl">
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl font-heading">
                    {provider.company_name?.[0] || 'P'}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-heading font-semibold text-lg truncate">
                      {provider.company_name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{provider.company_type}</Badge>
                      {provider.verification_status === 'approved' && (
                        <Badge className="bg-primary/10 text-primary border-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  {provider.customer_rating && (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-medium">{provider.customer_rating}</span>
                      <span className="text-xs text-muted-foreground">({provider.review_count})</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {provider.description}
                </p>

                {/* Service Areas */}
                {provider.service_areas && provider.service_areas.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{provider.service_areas.slice(0, 3).join(', ')}</span>
                    {provider.service_areas.length > 3 && (
                      <span>+{provider.service_areas.length - 3} more</span>
                    )}
                  </div>
                )}

                {/* Certifications */}
                {provider.certifications && provider.certifications.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    {provider.certifications.slice(0, 2).map((cert, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        <Award className="h-3 w-3 mr-1" />
                        {cert.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
