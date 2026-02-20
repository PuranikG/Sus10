import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Building2, MapPin, Filter, Download, Check, X,
  Loader2, RefreshCw, ChevronDown, Plus, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { apiRequest } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import { toast } from 'sonner';

const CITIES = [
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Gurugram', label: 'Gurugram' },
  { value: 'Noida', label: 'Noida' },
  { value: 'Faridabad', label: 'Faridabad' },
  { value: 'Ghaziabad', label: 'Ghaziabad' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Navi Mumbai', label: 'Navi Mumbai' },
  { value: 'Amravati', label: 'Amravati' },
];

const BUILDING_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'it_park', label: 'IT Park / Tech Park' },
  { value: 'commercial', label: 'Commercial Complex' },
  { value: 'mall', label: 'Shopping Mall' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'college', label: 'College / University' },
  { value: 'government', label: 'Government Building' },
  { value: 'industrial', label: 'Industrial / Factory' },
  { value: 'hotel', label: 'Hotel / Resort' },
  { value: 'residential', label: 'Residential Complex' },
];

export default function AdminBuildingDiscoveryPage() {
  const { user } = useAuth();
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [minArea, setMinArea] = useState(1000);
  const [discoveredBuildings, setDiscoveredBuildings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Discover buildings using backend API (OSM + Google Places enrichment)
  const discoverBuildings = useCallback(async () => {
    if (!selectedCity) {
      toast.error('Please select a city');
      return;
    }

    setLoading(true);
    setDiscoveredBuildings([]);
    setSelectedBuildings(new Set());

    try {
      // Call backend discovery API
      const result = await apiRequest('/admin/buildings/discover', {
        method: 'POST',
        body: JSON.stringify({
          city: selectedCity,
          building_type: selectedType || undefined,
          min_area: minArea,
          limit: 30,
        })
      });
      
      if (!result.buildings || result.buildings.length === 0) {
        toast.info(`No new buildings found. Discovered: ${result.discovered}, Skipped (duplicates): ${result.skipped}`);
        setLoading(false);
        return;
      }

      // Transform to display format
      const buildings = result.buildings.map((building, index) => ({
        temp_id: building.building_id,
        building_id: building.building_id,
        name: building.name,
        city: building.city,
        building_type: building.type,
        estimated_footprint: building.footprint,
        estimated_terrace: building.terrace,
        already_imported: true, // These are already in DB
      }));
      
      setDiscoveredBuildings(buildings);
      toast.success(`Imported ${result.imported} buildings! (${result.discovered} discovered, ${result.skipped} duplicates skipped)`);
    } catch (error) {
      console.error('Discovery error:', error);
      toast.error('Failed to discover buildings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedCity, selectedType, minArea]);

  // Toggle building selection
  const toggleBuildingSelection = (tempId) => {
    setSelectedBuildings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tempId)) {
        newSet.delete(tempId);
      } else {
        newSet.add(tempId);
      }
      return newSet;
    });
  };

  // Select all buildings
  const selectAll = () => {
    setSelectedBuildings(new Set(discoveredBuildings.map(b => b.temp_id)));
  };

  // Deselect all buildings
  const deselectAll = () => {
    setSelectedBuildings(new Set());
  };

  // Import selected buildings to database
  const importBuildings = async () => {
    if (selectedBuildings.size === 0) {
      toast.error('Please select at least one building to import');
      return;
    }

    setImporting(true);
    const buildingsToImport = discoveredBuildings.filter(b => selectedBuildings.has(b.temp_id));
    
    let successCount = 0;
    let failCount = 0;

    for (const building of buildingsToImport) {
      try {
        await apiRequest('/admin/buildings', {
          method: 'POST',
          body: JSON.stringify({
            address: building.name,
            city: building.city,
            pincode: building.pincode || '000000',
            building_type: building.building_type,
            total_footprint_area: building.estimated_footprint,
            usable_terrace_area: building.estimated_terrace,
            lat: building.lat,
            lng: building.lng,
            google_place_id: building.place_id,
            data_quality_score: 70, // Default for discovered buildings
            current_aqi: Math.floor(Math.random() * 150) + 50, // Placeholder AQI
          })
        });
        successCount++;
      } catch (error) {
        console.error('Import error:', error);
        failCount++;
      }
    }

    setImporting(false);
    
    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} buildings`);
      // Remove imported buildings from the list
      setDiscoveredBuildings(prev => prev.filter(b => !selectedBuildings.has(b.temp_id)));
      setSelectedBuildings(new Set());
    }
    
    if (failCount > 0) {
      toast.error(`Failed to import ${failCount} buildings`);
    }
  };

  // Update building estimate
  const updateBuildingEstimate = (tempId, field, value) => {
    setDiscoveredBuildings(prev => 
      prev.map(b => b.temp_id === tempId ? { ...b, [field]: value } : b)
    );
  };

  if (user?.user_type !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-max section-padding py-20 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-heading font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need admin privileges to access this page.</p>
          <Link to="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container-max section-padding py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight mb-1">
              Building Discovery
            </h1>
            <p className="text-muted-foreground">
              Discover buildings from OpenStreetMap, auto-enriched with Google Places
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Filters Panel */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Discovery Filters
              </CardTitle>
              <CardDescription>
                Set filters to find buildings in your target areas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* City Selection */}
              <div className="space-y-2">
                <Label>City *</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger data-testid="city-select">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map(city => (
                      <SelectItem key={city.value} value={city.value}>
                        {city.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Building Type */}
              <div className="space-y-2">
                <Label>Building Type (Optional)</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger data-testid="type-select">
                    <SelectValue placeholder="All building types" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUILDING_TYPES.map(type => (
                      <SelectItem key={type.value || 'all'} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Minimum Area Filter */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Minimum Footprint</Label>
                  <span className="text-sm font-medium">{minArea.toLocaleString()} sqm</span>
                </div>
                <Slider
                  value={[minArea]}
                  onValueChange={([val]) => setMinArea(val)}
                  min={500}
                  max={20000}
                  step={500}
                  data-testid="area-slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>500 sqm</span>
                  <span>20,000 sqm</span>
                </div>
              </div>

              {/* Discover Button */}
              <Button
                className="w-full"
                onClick={discoverBuildings}
                disabled={loading || !selectedCity}
                data-testid="discover-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Discovering & Importing...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Discover & Import Buildings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Imported Buildings</CardTitle>
                <CardDescription>
                  {discoveredBuildings.length > 0 
                    ? `${discoveredBuildings.length} buildings imported (pending approval)`
                    : 'Select a city and click "Discover & Import" to fetch buildings'
                  }
                </CardDescription>
              </div>
              {discoveredBuildings.length > 0 && (
                <Link to="/admin">
                  <Button size="sm" variant="outline">
                    Go to Admin → Approve Buildings
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Fetching from OpenStreetMap & enriching with Google Places...</p>
                  <p className="text-xs text-muted-foreground mt-2">This may take 30-60 seconds</p>
                </div>
              ) : discoveredBuildings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Buildings Yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    Select a city and click "Discover & Import Buildings" to fetch buildings from OpenStreetMap and auto-enrich with Google Places data.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  <AnimatePresence>
                    {discoveredBuildings.map((building, index) => (
                      <motion.div
                        key={building.temp_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="bg-green-500/5 border-green-500/20">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <Check className="h-5 w-5 text-green-500 mt-1" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h4 className="font-medium truncate">{building.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      <MapPin className="h-3 w-3 inline mr-1" />
                                      {building.city}
                                    </p>
                                  </div>
                                  <Badge variant="secondary" className="shrink-0">
                                    {BUILDING_TYPES.find(t => t.value === building.building_type)?.label || building.building_type}
                                  </Badge>
                                </div>
                                <div className="flex gap-4 mt-3 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Footprint:</span>
                                    <Input
                                      type="number"
                                      value={building.estimated_footprint}
                                      onChange={(e) => updateBuildingEstimate(building.temp_id, 'estimated_footprint', parseInt(e.target.value) || 0)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-24 h-7 mt-1 text-sm"
                                    />
                                    <span className="text-xs text-muted-foreground ml-1">sqm</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Terrace:</span>
                                    <Input
                                      type="number"
                                      value={building.estimated_terrace}
                                      onChange={(e) => updateBuildingEstimate(building.temp_id, 'estimated_terrace', parseInt(e.target.value) || 0)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-24 h-7 mt-1 text-sm"
                                    />
                                    <span className="text-xs text-muted-foreground ml-1">sqm</span>
                                  </div>
                                  {building.pincode && (
                                    <div>
                                      <span className="text-muted-foreground">Pincode:</span>
                                      <span className="ml-2 font-medium">{building.pincode}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper: Get Google Place type from our building type
function getGooglePlaceType(buildingType) {
  const typeMap = {
    'it_park': 'office',
    'commercial': 'establishment',
    'mall': 'shopping_mall',
    'hospital': 'hospital',
    'college': 'university',
    'government': 'local_government_office',
    'industrial': 'establishment',
    'hotel': 'lodging',
    'residential': 'apartment_complex',
  };
  return typeMap[buildingType] || 'establishment';
}

// Helper: Get city center coordinates
function getCityCenter(city) {
  const centers = {
    'Mumbai': { lat: 19.0760, lng: 72.8777 },
    'Delhi': { lat: 28.6139, lng: 77.2090 },
    'Gurugram': { lat: 28.4595, lng: 77.0266 },
    'Noida': { lat: 28.5355, lng: 77.3910 },
    'Faridabad': { lat: 28.4089, lng: 77.3178 },
    'Ghaziabad': { lat: 28.6692, lng: 77.4538 },
    'Pune': { lat: 18.5204, lng: 73.8567 },
    'Navi Mumbai': { lat: 19.0330, lng: 73.0297 },
    'Amravati': { lat: 20.9374, lng: 77.7796 },
  };
  return centers[city] || { lat: 20.5937, lng: 78.9629 }; // Default to India center
}

// Helper: Extract pincode from address
function extractPincode(address) {
  if (!address) return '';
  const match = address.match(/\b\d{6}\b/);
  return match ? match[0] : '';
}
