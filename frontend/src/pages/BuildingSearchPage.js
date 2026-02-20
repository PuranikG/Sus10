import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { 
  Search, MapPin, Building2, Filter, ChevronRight, 
  Leaf, Sun, Droplets, Wind, AlertTriangle, CheckCircle2,
  ArrowUpRight, Grid3X3, List, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { apiRequest, getAQILevel, getBuildingTypeLabel } from '../lib/utils';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function BuildingSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [cityFilter, setCityFilter] = useState(searchParams.get('city') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [viewMode, setViewMode] = useState('grid');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);

  // Google Places Autocomplete hook
  const {
    ready: placesReady,
    value: placesValue,
    suggestions: { status, data: suggestions },
    setValue: setPlacesValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'in' }, // Restrict to India
      types: ['address', 'establishment'],
    },
    debounce: 300,
    cache: 24 * 60 * 60, // Cache for 24 hours
  });

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchBuildings = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('address', searchQuery);
        if (cityFilter) params.append('city', cityFilter);
        if (typeFilter) params.append('building_type', typeFilter);
        params.append('limit', '50');
        
        const data = await apiRequest(`/buildings/search?${params.toString()}`);
        setBuildings(data);
      } catch (error) {
        console.error('Failed to fetch buildings:', error);
        setBuildings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBuildings();
  }, [searchQuery, cityFilter, typeFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (cityFilter) params.set('city', cityFilter);
    if (typeFilter) params.set('type', typeFilter);
    setSearchParams(params);
  };

  const cities = ['Delhi', 'Mumbai', 'Pune', 'Gurugram', 'Noida'];
  const buildingTypes = [
    { value: 'it_park', label: 'IT Park' },
    { value: 'hospital', label: 'Hospital' },
    { value: 'college', label: 'College' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'residential', label: 'Residential' },
    { value: 'industrial', label: 'Industrial' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="border-b border-border bg-card/50">
        <div className="container-max section-padding py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-2">
                Explore Buildings
              </h1>
              <p className="text-muted-foreground">
                Discover green potential in commercial buildings across India
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                data-testid="view-grid"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                data-testid="view-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by address or building name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-background"
                data-testid="search-input"
              />
            </div>
            <Select value={cityFilter || "all"} onValueChange={(val) => setCityFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-full md:w-[180px] h-12" data-testid="city-filter">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter || "all"} onValueChange={(val) => setTypeFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-full md:w-[180px] h-12" data-testid="type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {buildingTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" className="h-12 px-8" data-testid="search-btn">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Results */}
      <section className="py-8">
        <div className="container-max section-padding">
          {/* Results Count */}
          <div className="mb-6">
            {loading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <p className="text-muted-foreground">
                Found <span className="font-medium text-foreground">{buildings.length}</span> buildings
              </p>
            )}
          </div>

          {/* Building Cards */}
          {loading ? (
            <div className={viewMode === 'grid' 
              ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "flex flex-col gap-4"
            }>
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : buildings.length === 0 ? (
            <Card className="p-12 text-center">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-heading font-medium mb-2">No buildings found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search filters or explore a different area.
              </p>
              <Button variant="outline" onClick={() => {
                setSearchQuery('');
                setCityFilter('');
                setTypeFilter('');
              }}>
                Clear Filters
              </Button>
            </Card>
          ) : (
            <div className={viewMode === 'grid'
              ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "flex flex-col gap-4"
            }>
              {buildings.map((building, index) => (
                <BuildingCard 
                  key={building.building_id} 
                  building={building} 
                  viewMode={viewMode}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function BuildingCard({ building, viewMode, index }) {
  const aqiInfo = building.current_aqi ? getAQILevel(building.current_aqi) : null;
  
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Link to={`/buildings/${building.building_id}`} data-testid={`building-card-${building.building_id}`}>
          <Card className="card-hover">
            <CardContent className="p-4 flex items-center gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-medium truncate">{building.address}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{building.city}</span>
                  <span>•</span>
                  <span>{getBuildingTypeLabel(building.building_type)}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {aqiInfo && (
                  <div className="text-center">
                    <div className={`text-lg font-bold ${aqiInfo.color}`}>{building.current_aqi}</div>
                    <div className="text-xs text-muted-foreground">AQI</div>
                  </div>
                )}
                {building.usable_terrace_area && (
                  <div className="text-center">
                    <div className="text-lg font-bold">{building.usable_terrace_area.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">sqm</div>
                  </div>
                )}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/buildings/${building.building_id}`} data-testid={`building-card-${building.building_id}`}>
        <Card className="h-full card-hover overflow-hidden group">
          {/* Image Placeholder */}
          <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
            <div className="absolute inset-0 grid-pattern opacity-30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="h-16 w-16 text-primary/40" />
            </div>
            {/* Badges */}
            <div className="absolute top-4 left-4 right-4 flex justify-between">
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                {getBuildingTypeLabel(building.building_type)}
              </Badge>
              {building.data_quality_score >= 85 && (
                <Badge className="bg-primary/80 backdrop-blur-sm">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            {/* AQI Badge */}
            {aqiInfo && (
              <div className="absolute bottom-4 right-4">
                <Badge variant="outline" className={`${aqiInfo.bg} border-0 text-white`}>
                  AQI: {building.current_aqi}
                </Badge>
              </div>
            )}
          </div>
          
          <CardContent className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
              {building.address}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <MapPin className="h-4 w-4" />
              <span>{building.city}, {building.pincode}</span>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              {building.usable_terrace_area && (
                <div>
                  <div className="text-xl font-heading font-bold text-primary">
                    {building.usable_terrace_area.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">sqm Terrace</div>
                </div>
              )}
              {building.data_quality_score && (
                <div>
                  <div className="text-xl font-heading font-bold">
                    {building.data_quality_score}%
                  </div>
                  <div className="text-xs text-muted-foreground">Data Quality</div>
                </div>
              )}
            </div>
            
            {/* Solutions Preview */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
              <div className="flex -space-x-1">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Leaf className="h-3 w-3 text-green-500" />
                </div>
                <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Sun className="h-3 w-3 text-yellow-500" />
                </div>
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Droplets className="h-3 w-3 text-blue-500" />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">3 solutions available</span>
              <ArrowUpRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
