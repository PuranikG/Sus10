import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Building2, MapPin, Filter, Check,
  Loader2, ArrowLeft, X, ChevronsUpDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { apiRequest } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import AdminShell from '../components/layout/AdminShell';
import { toast } from 'sonner';

const CITIES = [
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Bengaluru', label: 'Bengaluru' },
  { value: 'Hyderabad', label: 'Hyderabad' },
  { value: 'Chennai', label: 'Chennai' },
  { value: 'Kolkata', label: 'Kolkata' },
  { value: 'Ahmedabad', label: 'Ahmedabad' },
  { value: 'Gurugram', label: 'Gurugram' },
  { value: 'Noida', label: 'Noida' },
  { value: 'Faridabad', label: 'Faridabad' },
  { value: 'Ghaziabad', label: 'Ghaziabad' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Navi Mumbai', label: 'Navi Mumbai' },
  { value: 'Thane', label: 'Thane' },
  { value: 'Amravati', label: 'Amravati' },
  { value: 'Nagpur', label: 'Nagpur' },
  { value: 'Surat', label: 'Surat' },
  { value: 'Jaipur', label: 'Jaipur' },
  { value: 'Lucknow', label: 'Lucknow' },
  { value: 'Kanpur', label: 'Kanpur' },
  { value: 'Indore', label: 'Indore' },
  { value: 'Bhopal', label: 'Bhopal' },
  { value: 'Patna', label: 'Patna' },
  { value: 'Vadodara', label: 'Vadodara' },
  { value: 'Coimbatore', label: 'Coimbatore' },
  { value: 'Visakhapatnam', label: 'Visakhapatnam' },
  { value: 'Kochi', label: 'Kochi' },
  { value: 'Thiruvananthapuram', label: 'Thiruvananthapuram' },
  { value: 'Mysuru', label: 'Mysuru' },
  { value: 'Mangaluru', label: 'Mangaluru' },
  { value: 'Chandigarh', label: 'Chandigarh' },
  { value: 'Dehradun', label: 'Dehradun' },
  { value: 'Goa', label: 'Goa' },
];

const BUILDING_TYPES = [
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
  const [cityOpen, setCityOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([]); // multi-select
  const [strictType, setStrictType] = useState(true);     // B1.3 default ON
  const [minArea, setMinArea] = useState(1000);
  const [discoveredBuildings, setDiscoveredBuildings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBuildings, setSelectedBuildings] = useState(new Set());
  const [importing, setImporting] = useState(false);

  const cityLabel = useMemo(
    () => CITIES.find((c) => c.value === selectedCity)?.label || '',
    [selectedCity],
  );

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
      // For multi-select: run the discovery for each type sequentially. The
      // backend supports a single building_type per request, so loop.
      const typesToRun = selectedTypes.length > 0 ? selectedTypes : [undefined];
      const collected = [];
      let totalImported = 0, totalDiscovered = 0, totalSkipped = 0, totalMismatch = 0;

      for (const t of typesToRun) {
        const result = await apiRequest('/admin/buildings/discover', {
          method: 'POST',
          body: JSON.stringify({
            city: selectedCity,
            building_type: t,
            min_area: minArea,
            limit: 30,
            strict_type: strictType,
          }),
        });
        totalDiscovered += result?.discovered || 0;
        totalSkipped += result?.skipped || 0;
        totalImported += result?.imported || 0;
        totalMismatch += result?.skipped_type_mismatch || 0;
        (result?.buildings || []).forEach((b) => collected.push(b));
      }

      if (!collected.length) {
        toast.info(
          `No new buildings. Discovered ${totalDiscovered}, duplicates ${totalSkipped}` +
            (totalMismatch ? `, type-mismatch ${totalMismatch}` : '')
        );
        setLoading(false);
        return;
      }

      const buildings = collected.map((building) => ({
        temp_id: building.building_id,
        building_id: building.building_id,
        name: building.name,
        city: building.city,
        building_type: building.type,
        estimated_footprint: building.footprint,
        estimated_terrace: building.terrace,
        already_imported: true,
      }));

      setDiscoveredBuildings(buildings);
      toast.success(
        `Imported ${totalImported} buildings` +
          (totalMismatch ? ` · skipped ${totalMismatch} type mismatches` : '')
      );
    } catch (error) {
      console.error('Discovery error:', error);
      toast.error(error.message || 'Failed to discover buildings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedCity, selectedTypes, strictType, minArea]);

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
      <AdminShell title="Discover Buildings"><div /></AdminShell>
    );
  }

  return (
    <AdminShell
      title="Discover Buildings"
      subtitle="Pull buildings from OpenStreetMap + Google Places, then approve them."
    >

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
              {/* City — searchable combobox (E1.3) */}
              <div className="space-y-2">
                <Label>City *</Label>
                <Popover open={cityOpen} onOpenChange={setCityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={cityOpen}
                      className="w-full justify-between font-normal"
                      data-testid="city-combobox-trigger"
                    >
                      {cityLabel || <span className="text-muted-foreground">Type to search 30+ cities…</span>}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                    <Command>
                      <CommandInput placeholder="Search city…" data-testid="city-combobox-input" />
                      <CommandList>
                        <CommandEmpty>No city found.</CommandEmpty>
                        <CommandGroup>
                          {CITIES.map((c) => (
                            <CommandItem
                              key={c.value}
                              value={c.label}
                              onSelect={() => {
                                setSelectedCity(c.value);
                                setCityOpen(false);
                              }}
                              data-testid={`city-option-${c.value}`}
                            >
                              <Check className={`mr-2 h-4 w-4 ${selectedCity === c.value ? 'opacity-100' : 'opacity-0'}`} />
                              {c.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Building Type — multi-select chips (B1.4) */}
              <div className="space-y-2">
                <Label>Building Types <span className="text-muted-foreground text-xs font-normal">(optional · pick any)</span></Label>
                <div className="flex flex-wrap gap-2" data-testid="type-chip-row">
                  {BUILDING_TYPES.map((t) => {
                    const active = selectedTypes.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setSelectedTypes((prev) => active ? prev.filter(x => x !== t.value) : [...prev, t.value])}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'
                        }`}
                        data-testid={`type-chip-${t.value}`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                {selectedTypes.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    We'll run discovery once per type and combine results.
                  </p>
                )}
              </div>

              {/* Strict type filter — B1.3 */}
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <Switch
                  checked={strictType}
                  onCheckedChange={setStrictType}
                  id="strict-type-toggle"
                  data-testid="strict-type-toggle"
                />
                <div className="flex-1">
                  <Label htmlFor="strict-type-toggle" className="text-sm font-medium cursor-pointer">
                    Strict type match
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Skip buildings that Google re-classifies into a different category after enrichment.
                  </p>
                </div>
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
                                <div className="flex gap-6 mt-3 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Footprint:</span>
                                    <span className="ml-2 font-semibold text-green-600">{building.estimated_footprint?.toLocaleString()} sqm</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Terrace:</span>
                                    <span className="ml-2 font-semibold text-blue-600">{building.estimated_terrace?.toLocaleString()} sqm</span>
                                  </div>
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
    </AdminShell>
  );
}
