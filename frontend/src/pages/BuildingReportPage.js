import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, MapPin, Leaf, Sun, Droplets, Wind,
  ArrowLeft, Download, Share2, AlertTriangle, CheckCircle2, Sparkles, Banknote,
  TrendingUp, TrendingDown, Minus, Info, ChevronRight,
  Calculator, FileText, Users, Clock, Mail, Copy, Check,
  MessageCircle, Loader2, TreePine, Flower2, Sprout, Map, Save
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import { Slider } from '../components/ui/slider';
import { Label } from '../components/ui/label';
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
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { apiRequest, formatCurrency, getAQILevel, getBuildingTypeLabel } from '../lib/utils';
import { generateBuildingReportPDF } from '../lib/pdfGenerator';
import ReportDownloadDialog from '../components/report/ReportDownloadDialog';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { toast } from 'sonner';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { useAuth } from '../context/AuthContext';

// Terrace-suitable plant database (max height 6-8 feet) with city-wise native species
const TERRACE_PLANT_DATABASE = {
  // Small trees/large shrubs suitable for terraces (max 6-8 feet in containers)
  smallTrees: {
    // Plants that grow well in specific cities
    'Gurugram': [
      { name: 'Dwarf Pomegranate', botanical: 'Punica granatum nana', co2: 8, height: '4-6 ft', spacing: 4, waterNeed: 'Low', benefits: ['Fruit bearing', 'Ornamental flowers', 'Heat tolerant'], native: true },
      { name: 'Curry Leaf', botanical: 'Murraya koenigii', co2: 6, height: '4-6 ft', spacing: 3, waterNeed: 'Moderate', benefits: ['Culinary use', 'Medicinal', 'Aromatic'], native: true },
      { name: 'Lemon', botanical: 'Citrus limon', co2: 7, height: '5-7 ft', spacing: 4, waterNeed: 'Moderate', benefits: ['Fruit bearing', 'Fragrant flowers', 'Vitamin C'], native: false },
    ],
    'Delhi': [
      { name: 'Dwarf Pomegranate', botanical: 'Punica granatum nana', co2: 8, height: '4-6 ft', spacing: 4, waterNeed: 'Low', benefits: ['Fruit bearing', 'Ornamental flowers', 'Heat tolerant'], native: true },
      { name: 'Jamun (Dwarf)', botanical: 'Syzygium cumini', co2: 9, height: '6-8 ft', spacing: 5, waterNeed: 'Moderate', benefits: ['Fruit bearing', 'Medicinal', 'Shade'], native: true },
      { name: 'Indian Jasmine Tree', botanical: 'Millingtonia hortensis', co2: 7, height: '6-8 ft', spacing: 4, waterNeed: 'Low', benefits: ['Fragrant flowers', 'Air purification'], native: true },
    ],
    'Mumbai': [
      { name: 'Dwarf Coconut', botanical: 'Cocos nucifera (dwarf)', co2: 10, height: '6-8 ft', spacing: 6, waterNeed: 'Moderate', benefits: ['Coconut production', 'Coastal tolerant'], native: true },
      { name: 'Curry Leaf', botanical: 'Murraya koenigii', co2: 6, height: '4-6 ft', spacing: 3, waterNeed: 'Moderate', benefits: ['Culinary use', 'Medicinal'], native: true },
      { name: 'Paan/Betel Leaf', botanical: 'Piper betle', co2: 4, height: '4-5 ft', spacing: 2, waterNeed: 'High', benefits: ['Traditional use', 'Medicinal'], native: true },
    ],
    'Pune': [
      { name: 'Dwarf Mango', botanical: 'Mangifera indica (dwarf)', co2: 9, height: '6-8 ft', spacing: 5, waterNeed: 'Moderate', benefits: ['Fruit bearing', 'Alphonso variety available'], native: true },
      { name: 'Lemon', botanical: 'Citrus limon', co2: 7, height: '5-7 ft', spacing: 4, waterNeed: 'Moderate', benefits: ['Fruit bearing', 'Year-round fruiting'], native: false },
      { name: 'Curry Leaf', botanical: 'Murraya koenigii', co2: 6, height: '4-6 ft', spacing: 3, waterNeed: 'Moderate', benefits: ['Culinary use', 'Aromatic'], native: true },
    ],
    'default': [
      { name: 'Dwarf Pomegranate', botanical: 'Punica granatum nana', co2: 8, height: '4-6 ft', spacing: 4, waterNeed: 'Low', benefits: ['Fruit bearing', 'Heat tolerant'], native: true },
      { name: 'Curry Leaf', botanical: 'Murraya koenigii', co2: 6, height: '4-6 ft', spacing: 3, waterNeed: 'Moderate', benefits: ['Culinary use', 'Medicinal'], native: true },
      { name: 'Lemon', botanical: 'Citrus limon', co2: 7, height: '5-7 ft', spacing: 4, waterNeed: 'Moderate', benefits: ['Fruit bearing'], native: false },
    ],
  },
  
  shrubs: {
    'Gurugram': [
      { name: 'Bougainvillea', botanical: 'Bougainvillea spectabilis', co2: 3, height: '3-5 ft', spacing: 2, waterNeed: 'Very Low', benefits: ['Colorful bracts', 'Drought resistant', 'Year-round color'], native: false },
      { name: 'Desert Rose', botanical: 'Adenium obesum', co2: 2, height: '2-4 ft', spacing: 1.5, waterNeed: 'Very Low', benefits: ['Stunning flowers', 'Succulent', 'Heat tolerant'], native: false },
      { name: 'Lantana', botanical: 'Lantana camara', co2: 2, height: '2-4 ft', spacing: 1.5, waterNeed: 'Low', benefits: ['Butterfly attractor', 'Hardy', 'Colorful'], native: true },
    ],
    'Mumbai': [
      { name: 'Hibiscus', botanical: 'Hibiscus rosa-sinensis', co2: 3, height: '4-6 ft', spacing: 2, waterNeed: 'Moderate', benefits: ['Large flowers', 'Medicinal', 'Year-round blooms'], native: true },
      { name: 'Ixora', botanical: 'Ixora coccinea', co2: 2, height: '3-5 ft', spacing: 1.5, waterNeed: 'Moderate', benefits: ['Cluster flowers', 'Low maintenance'], native: true },
      { name: 'Croton', botanical: 'Codiaeum variegatum', co2: 2, height: '3-5 ft', spacing: 1.5, waterNeed: 'Moderate', benefits: ['Colorful foliage', 'Humidity tolerant'], native: false },
    ],
    'default': [
      { name: 'Hibiscus', botanical: 'Hibiscus rosa-sinensis', co2: 3, height: '4-6 ft', spacing: 2, waterNeed: 'Moderate', benefits: ['Large flowers', 'Medicinal'], native: true },
      { name: 'Bougainvillea', botanical: 'Bougainvillea spectabilis', co2: 3, height: '3-5 ft', spacing: 2, waterNeed: 'Very Low', benefits: ['Colorful', 'Drought resistant'], native: false },
      { name: 'Ixora', botanical: 'Ixora coccinea', co2: 2, height: '3-5 ft', spacing: 1.5, waterNeed: 'Moderate', benefits: ['Flowering'], native: true },
      { name: 'Croton', botanical: 'Codiaeum variegatum', co2: 2, height: '3-5 ft', spacing: 1.5, waterNeed: 'Moderate', benefits: ['Colorful foliage'], native: false },
    ],
  },
  
  groundcover: {
    'all': [
      { name: 'Portulaca', botanical: 'Portulaca grandiflora', co2: 0.5, height: '6 inches', spacing: 0.3, waterNeed: 'Very Low', benefits: ['Succulent', 'Colorful', 'Heat tolerant'], native: false },
      { name: 'Ajwain', botanical: 'Trachyspermum ammi', co2: 0.5, height: '1-2 ft', spacing: 0.3, waterNeed: 'Low', benefits: ['Culinary herb', 'Medicinal', 'Aromatic'], native: true },
      { name: 'Tulsi (Holy Basil)', botanical: 'Ocimum tenuiflorum', co2: 1, height: '1-2 ft', spacing: 0.4, waterNeed: 'Moderate', benefits: ['Sacred plant', 'Medicinal', 'Mosquito repellent'], native: true },
      { name: 'Aloe Vera', botanical: 'Aloe barbadensis', co2: 0.8, height: '1-2 ft', spacing: 0.5, waterNeed: 'Very Low', benefits: ['Medicinal', 'Skin care', 'Air purifier'], native: false },
    ],
  },
  
  vegetables: {
    'summer': [
      { name: 'Tomato', spacing: 0.5, harvestDays: 60, yield: '4-5 kg/plant', waterNeed: 'Moderate', season: 'Summer' },
      { name: 'Chili', spacing: 0.4, harvestDays: 75, yield: '1-2 kg/plant', waterNeed: 'Moderate', season: 'Year-round' },
      { name: 'Brinjal (Eggplant)', spacing: 0.6, harvestDays: 70, yield: '3-4 kg/plant', waterNeed: 'Moderate', season: 'Summer' },
      { name: 'Okra (Bhindi)', spacing: 0.4, harvestDays: 50, yield: '2-3 kg/plant', waterNeed: 'Moderate', season: 'Summer' },
    ],
    'winter': [
      { name: 'Spinach (Palak)', spacing: 0.2, harvestDays: 40, yield: '0.5 kg/sqm', waterNeed: 'Moderate', season: 'Winter' },
      { name: 'Methi (Fenugreek)', spacing: 0.15, harvestDays: 30, yield: '0.3 kg/sqm', waterNeed: 'Moderate', season: 'Winter' },
      { name: 'Coriander', spacing: 0.15, harvestDays: 35, yield: '0.3 kg/sqm', waterNeed: 'Moderate', season: 'Winter' },
      { name: 'Radish', spacing: 0.2, harvestDays: 30, yield: '1 kg/sqm', waterNeed: 'Moderate', season: 'Winter' },
    ],
    'yearRound': [
      { name: 'Mint', spacing: 0.3, harvestDays: 30, yield: 'Continuous', waterNeed: 'High', season: 'Year-round' },
      { name: 'Curry Leaves', spacing: 0.5, harvestDays: 60, yield: 'Continuous', waterNeed: 'Moderate', season: 'Year-round' },
    ],
  },
};

export default function BuildingReportPage() {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const { isEnabled } = useFeatureFlags();
  const { user } = useAuth();
  // P1 (May 19, 2026) — Map UI is hidden from public users for now.
  // We retain ALL map-related backend logic, AQI, polygon edit, Esri overlays
  // for admin data-curation workflows + future ward-level rollups.
  // Flip the `show_user_map` flag from /admin/feature-flags to unhide.
  const showMap = isEnabled('show_user_map') || user?.user_type === 'admin';
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  
  // Live AQI state
  const [liveAQI, setLiveAQI] = useState(null);
  const [aqiLoading, setAqiLoading] = useState(false);

  // Matched subsidies for this building (Option A — quick win strip)
  const [matchedSubsidies, setMatchedSubsidies] = useState([]);

  // Intel notes (Option B — warning badges on public report)
  const [intelNotes, setIntelNotes] = useState([]);
  
  // Plantable area controls
  const [plantablePercent, setPlantablePercent] = useState(70);
  const [gardenType, setGardenType] = useState('mixed'); // mixed, ornamental, vegetable
  const [customTerraceArea, setCustomTerraceArea] = useState(null); // User-adjusted area from polygon
  const [customPolygon, setCustomPolygon] = useState(null); // Store polygon coordinates
  const [isSavingTerrace, setIsSavingTerrace] = useState(false);
  const [terraceUnsaved, setTerraceUnsaved] = useState(false);
  const [mapLayer, setMapLayer] = useState('hybrid'); // 'roadmap' | 'satellite' | 'hybrid' | 'esri'
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonRef = useRef(null);
  const esriOverlayRef = useRef(null);

  // Save custom terrace area to backend
  const saveCustomTerrace = async () => {
    if (!customTerraceArea || !buildingId) return;
    
    setIsSavingTerrace(true);
    try {
      // Get polygon coordinates if available
      let polygonCoords = null;
      if (polygonRef.current) {
        const path = polygonRef.current.getPath();
        polygonCoords = [];
        for (let i = 0; i < path.getLength(); i++) {
          const point = path.getAt(i);
          polygonCoords.push([point.lat(), point.lng()]);
        }
      }
      
      await apiRequest(`/buildings/${buildingId}/terrace`, {
        method: 'PATCH',
        body: JSON.stringify({
          custom_terrace_area: customTerraceArea,
          terrace_polygon: polygonCoords
        })
      });
      
      toast.success('Terrace area saved successfully!');
      setTerraceUnsaved(false);
    } catch (error) {
      console.error('Failed to save terrace:', error);
      toast.error('Failed to save terrace area');
    } finally {
      setIsSavingTerrace(false);
    }
  };

  // Fetch live AQI data
  useEffect(() => {
    const fetchLiveAQI = async () => {
      if (!buildingId) return;
      setAqiLoading(true);
      try {
        const data = await apiRequest(`/air-quality/building/${buildingId}`);
        setLiveAQI(data);
      } catch (error) {
        console.error('Failed to fetch live AQI:', error);
      } finally {
        setAqiLoading(false);
      }
    };
    
    fetchLiveAQI();
    // Refresh AQI every 10 minutes
    const interval = setInterval(fetchLiveAQI, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [buildingId]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await apiRequest(`/buildings/${buildingId}/report`);
        setReportData(data);
        // If user previously saved a custom polygon area, restore it
        const savedCustomArea = data?.building?.custom_terrace_area;
        if (savedCustomArea) {
          setCustomTerraceArea(Math.round(savedCustomArea));
        }
      } catch (error) {
        console.error('Failed to fetch report:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [buildingId]);

  // Fetch matched subsidies (best-effort — never block the page)
  useEffect(() => {
    if (!buildingId) return;
    apiRequest(`/subsidies/match/${buildingId}`)
      .then((r) => setMatchedSubsidies((r?.subsidies || []).slice(0, 4)))
      .catch(() => {});
  }, [buildingId]);

  // Fetch intel notes (Option B — warning badges)
  useEffect(() => {
    if (!buildingId) return;
    apiRequest(`/buildings/${buildingId}/intel`)
      .then((r) => setIntelNotes(r?.intel_notes || []))
      .catch(() => {});
  }, [buildingId]);

  // Initialize map when building data is loaded
  useEffect(() => {
    if (!showMap) return; // P1: map UI hidden from public users (admin/flag only)
    if (!reportData?.building?.latitude || !mapRef.current) return;
    
    const initMap = async () => {
      if (!window.google) return;
      
      try {
        const { Map } = await window.google.maps.importLibrary('maps');
        const { AdvancedMarkerElement } = await window.google.maps.importLibrary('marker');
        
        const position = {
          lat: reportData.building.latitude,
          lng: reportData.building.longitude
        };
        
        mapInstanceRef.current = new Map(mapRef.current, {
          center: position,
          zoom: 19,
          mapId: 'building_map',
          mapTypeId: mapLayer === 'esri' ? 'roadmap' : mapLayer,
          tilt: 0,
          maxZoom: 22,
        });
        
        // Check if we have a Google polygon or need to create approximate one
        let polygonCoords;
        const googlePolygon = reportData.building.footprint_polygon;
        const customPolygonData = reportData.building.custom_terrace_polygon;
        
        if (customPolygonData && Array.isArray(customPolygonData) && customPolygonData.length >= 3) {
          // Use saved custom polygon (user-edited)
          polygonCoords = customPolygonData.map(coord => ({ lat: coord[0], lng: coord[1] }));
        } else if (googlePolygon && googlePolygon.type === 'Polygon' && googlePolygon.coordinates) {
          // Use Google Geocoding API polygon (GeoJSON format: [lng, lat])
          polygonCoords = googlePolygon.coordinates[0].map(coord => ({ 
            lat: coord[1], 
            lng: coord[0] 
          }));
        } else {
          // Fallback: Create approximate rectangle based on footprint area
          const footprintArea = reportData.building.building_footprint_area || 5000;
          const sideLength = Math.sqrt(footprintArea); // Approximate side in meters
          const latOffset = sideLength / 111000; // ~111km per degree latitude
          const lngOffset = sideLength / (111000 * Math.cos(position.lat * Math.PI / 180));
          
          polygonCoords = [
            { lat: position.lat - latOffset/2, lng: position.lng - lngOffset/2 },
            { lat: position.lat - latOffset/2, lng: position.lng + lngOffset/2 },
            { lat: position.lat + latOffset/2, lng: position.lng + lngOffset/2 },
            { lat: position.lat + latOffset/2, lng: position.lng - lngOffset/2 },
          ];
        }
        
        // Draw the building footprint
        const buildingPolygon = new window.google.maps.Polygon({
          paths: polygonCoords,
          strokeColor: '#22c55e',
          strokeOpacity: 0.9,
          strokeWeight: 3,
          fillColor: '#22c55e',
          fillOpacity: 0.25,
          editable: true, // Allow user to adjust
          draggable: false,
        });
        
        buildingPolygon.setMap(mapInstanceRef.current);
        polygonRef.current = buildingPolygon; // Store reference
        
        // Listen for polygon changes
        window.google.maps.event.addListener(buildingPolygon.getPath(), 'set_at', () => {
          const newArea = window.google.maps.geometry.spherical.computeArea(buildingPolygon.getPath());
          setCustomTerraceArea(Math.round(newArea));
          setTerraceUnsaved(true);
        });
        
        window.google.maps.event.addListener(buildingPolygon.getPath(), 'insert_at', () => {
          const newArea = window.google.maps.geometry.spherical.computeArea(buildingPolygon.getPath());
          setCustomTerraceArea(Math.round(newArea));
          setTerraceUnsaved(true);
        });
        
        // Add info window
        const footprintArea = reportData.building.building_footprint_area || 5000;
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="padding: 8px; font-family: system-ui;">
            <strong>${reportData.building.name || reportData.building.address}</strong><br/>
            <span style="color: #666;">Footprint: ${footprintArea.toLocaleString()} sqm</span><br/>
            <span style="color: #22c55e; font-size: 12px;">Drag corners to adjust terrace area</span>
          </div>`,
          position: position,
        });
        
        infoWindow.open(mapInstanceRef.current);
        
      } catch (error) {
        console.error('Map init error:', error);
      }
    };
    
    initMap();
  }, [reportData]);

  // Handle map layer toggle (Map / Satellite / Hybrid / High-Res Aerial)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    // Clear any prior Esri overlay
    if (esriOverlayRef.current) {
      const idx = map.overlayMapTypes.getArray().indexOf(esriOverlayRef.current);
      if (idx >= 0) map.overlayMapTypes.removeAt(idx);
      esriOverlayRef.current = null;
    }

    if (mapLayer === 'esri') {
      // High-resolution aerial via Esri World Imagery (free public tile service)
      // Often 0.3-0.6 m/pixel in major Indian cities — sharper than Google satellite
      map.setMapTypeId('roadmap');
      const esri = new window.google.maps.ImageMapType({
        getTileUrl: (coord, zoom) =>
          `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${coord.y}/${coord.x}`,
        tileSize: new window.google.maps.Size(256, 256),
        name: 'Esri World Imagery',
        maxZoom: 22,
        opacity: 1.0,
      });
      esriOverlayRef.current = esri;
      map.overlayMapTypes.insertAt(0, esri);
    } else {
      map.setMapTypeId(mapLayer);
    }
  }, [mapLayer]);

  // Calculate temperature reduction based on green cover
  const calculateTemperatureReduction = (terraceArea, footprintArea, plantablePercent, gardenType) => {
    const plantedArea = (terraceArea * plantablePercent) / 100;
    const greenCoverRatio = plantedArea / footprintArea;
    
    /*
     * Scientific basis for temperature reduction calculation:
     * 
     * 1. Evapotranspiration Effect:
     *    - Plants release water vapor through transpiration
     *    - Latent heat of vaporization: 2.45 MJ/kg
     *    - Average transpiration: 3-5 L/m²/day for mixed gardens
     *    - Cooling effect: ~0.5-1°C per 10% green cover
     *
     * 2. Shading Effect:
     *    - Reduces direct solar radiation on building surface
     *    - Conventional roof surface: 60-80°C in summer
     *    - Green roof surface: 25-35°C (30-40°C reduction)
     *    - Ambient temperature effect: 0.3-0.5°C per 10% shading
     *
     * 3. Albedo Change:
     *    - Conventional roof albedo: 0.1-0.2 (dark surfaces)
     *    - Green roof albedo: 0.7-0.85 (vegetation)
     *    - Higher albedo = more solar reflection = less heat absorption
     *
     * Research references:
     * - EPA Urban Heat Island Mitigation (2008)
     * - Santamouris et al. (2014) - "On the impact of urban heat island"
     * - Alexandri & Jones (2008) - "Temperature decreases from urban greening"
     */
    
    // Base calculations
    const evapotranspirationCooling = greenCoverRatio * 2.5; // Max ~2.5°C at 100% cover
    const shadingCooling = greenCoverRatio * 1.5; // Max ~1.5°C from shading
    const albedoCooling = greenCoverRatio * 0.8; // Max ~0.8°C from albedo change
    
    // Garden type multipliers (trees/shrubs provide more cooling than ground cover)
    const typeMultiplier = {
      'mixed': 1.0,
      'ornamental': 0.9,
      'vegetable': 0.7, // Less canopy cover
    }[gardenType] || 1.0;
    
    // Total ambient air temperature reduction (realistic range: 0.5-4°C)
    const totalReduction = (evapotranspirationCooling + shadingCooling + albedoCooling) * typeMultiplier;
    
    // Surface temperature reduction is much higher (20-40°C for green vs conventional roof)
    const surfaceReduction = Math.min(greenCoverRatio * 35, 40);
    
    return {
      ambientReduction: Math.round(totalReduction * 10) / 10, // Round to 1 decimal
      surfaceReduction: Math.round(surfaceReduction),
      greenCoverPercent: Math.round(greenCoverRatio * 100),
      breakdown: {
        evapotranspiration: Math.round(evapotranspirationCooling * 10) / 10,
        shading: Math.round(shadingCooling * 10) / 10,
        albedo: Math.round(albedoCooling * 10) / 10,
      },
      methodology: `Based on ${Math.round(greenCoverRatio * 100)}% green cover ratio (${plantedArea.toLocaleString()} sqm planted / ${footprintArea.toLocaleString()} sqm footprint)`,
    };
  };

  // Calculate plant recommendations based on plantable area and city
  const calculatePlantRecommendations = (terraceArea, plantablePercent, gardenType, city = 'default') => {
    const plantableArea = (terraceArea * plantablePercent) / 100;
    
    // Reserve areas for different purposes
    const walkwayArea = plantableArea * 0.15; // 15% for walkways
    const actualPlantableArea = plantableArea - walkwayArea;
    
    // Get city-specific plants or default
    const cityKey = Object.keys(TERRACE_PLANT_DATABASE.smallTrees).includes(city) ? city : 'default';
    const smallTrees = TERRACE_PLANT_DATABASE.smallTrees[cityKey] || TERRACE_PLANT_DATABASE.smallTrees.default;
    const shrubs = TERRACE_PLANT_DATABASE.shrubs[cityKey] || TERRACE_PLANT_DATABASE.shrubs.default;
    const groundcover = TERRACE_PLANT_DATABASE.groundcover.all;
    
    let recommendations = [];
    let totalCO2 = 0;
    
    if (gardenType === 'mixed' || gardenType === 'ornamental') {
      // Small trees (15% of area for large planters)
      const treeArea = actualPlantableArea * 0.15;
      const avgSpacing = smallTrees.reduce((sum, t) => sum + t.spacing, 0) / smallTrees.length;
      const treesCount = Math.floor(treeArea / (avgSpacing * avgSpacing));
      
      if (treesCount > 0) {
        const treeRecs = smallTrees.map(tree => ({
          ...tree,
          count: Math.max(1, Math.floor(treesCount / smallTrees.length)),
        }));
        const treeCO2 = treeRecs.reduce((sum, t) => sum + (t.count * t.co2), 0);
        
        recommendations.push({
          category: 'Dwarf Trees & Large Plants (Terrace-suitable)',
          icon: TreePine,
          plants: treeRecs,
          area: treeArea,
          co2: treeCO2,
          note: 'All plants max height 6-8 feet, suitable for container growing',
        });
        totalCO2 += treeCO2;
      }
      
      // Shrubs (30% of area)
      const shrubArea = actualPlantableArea * 0.30;
      const shrubsPerPlant = shrubs.reduce((sum, s) => sum + s.spacing, 0) / shrubs.length;
      const shrubsCount = Math.floor(shrubArea / (shrubsPerPlant * shrubsPerPlant));
      
      if (shrubsCount > 0) {
        const shrubRecs = shrubs.map(shrub => ({
          ...shrub,
          count: Math.max(1, Math.floor(shrubsCount / shrubs.length)),
        }));
        const shrubCO2 = shrubRecs.reduce((sum, s) => sum + (s.count * s.co2), 0);
        
        recommendations.push({
          category: 'Flowering Shrubs & Ornamentals',
          icon: Flower2,
          plants: shrubRecs,
          area: shrubArea,
          co2: shrubCO2,
        });
        totalCO2 += shrubCO2;
      }
      
      // Ground cover & herbs (25% of area)
      const groundArea = actualPlantableArea * 0.25;
      const groundRecs = groundcover.map(g => ({
        ...g,
        count: Math.max(1, Math.floor((groundArea / groundcover.length) / (g.spacing * g.spacing))),
      }));
      const groundCO2 = groundArea * 1.5;
      
      recommendations.push({
        category: 'Herbs & Ground Cover',
        icon: Sprout,
        plants: groundRecs,
        area: groundArea,
        co2: groundCO2,
        note: 'Includes medicinal herbs and aromatic plants',
      });
      totalCO2 += groundCO2;
    }
    
    if (gardenType === 'mixed' || gardenType === 'vegetable') {
      // Vegetables (20-70% depending on garden type)
      const vegPercent = gardenType === 'vegetable' ? 0.70 : 0.20;
      const vegArea = actualPlantableArea * vegPercent;
      
      const summerVegs = TERRACE_PLANT_DATABASE.vegetables.summer.map(v => ({
        ...v,
        count: Math.floor((vegArea / 4 / TERRACE_PLANT_DATABASE.vegetables.summer.length) / (v.spacing * v.spacing)),
      }));
      
      const winterVegs = TERRACE_PLANT_DATABASE.vegetables.winter.map(v => ({
        ...v,
        count: Math.floor((vegArea / 4 / TERRACE_PLANT_DATABASE.vegetables.winter.length) / (v.spacing * v.spacing)),
      }));
      
      const yearRoundVegs = TERRACE_PLANT_DATABASE.vegetables.yearRound.map(v => ({
        ...v,
        count: Math.floor((vegArea / 4 / TERRACE_PLANT_DATABASE.vegetables.yearRound.length) / (v.spacing * v.spacing)),
      }));
      
      recommendations.push({
        category: 'Kitchen Garden - Seasonal Vegetables',
        icon: Leaf,
        plants: [...summerVegs, ...winterVegs, ...yearRoundVegs],
        area: vegArea,
        co2: vegArea * 1.5,
        monthlyYield: Math.floor(vegArea * 0.8), // ~0.8 kg per sqm per month
        note: 'Rotate crops by season for best results',
      });
      totalCO2 += vegArea * 1.5;
    }
    
    return {
      plantableArea,
      actualPlantableArea,
      walkwayArea,
      recommendations,
      totalCO2,
      waterRequirement: Math.floor(actualPlantableArea * 3), // 3 liters per sqm per day
      estimatedCost: Math.floor(actualPlantableArea * 150), // ₹150 per sqm
    };
  };

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
            <button
              type="button"
              data-testid="report-back-btn"
              onClick={() => {
                // Use browser history when available (came from in-app navigation),
                // otherwise fall back to /search.
                if (window.history.state && window.history.state.idx > 0) {
                  navigate(-1);
                } else {
                  navigate('/search');
                }
              }}
              className="hover:text-foreground transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
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
                  <Link to={`/subsidies?building_id=${building.building_id}`}>
                    <Button size="sm" variant="outline" data-testid="view-subsidies-btn">
                      <Banknote className="h-4 w-4 mr-2" />
                      Subsidies
                    </Button>
                  </Link>
                  <Link to={`/buildings/${building.building_id}/potential`}>
                    <Button size="sm" variant="outline" data-testid="view-potential-btn">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Potential at a glance
                    </Button>
                  </Link>
                  <ShareDropdown building={building} recommendations={recommendations} />
                  <Button 
                    size="sm" 
                    data-testid="download-report-btn"
                    onClick={() => setReportDialogOpen(true)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download report
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
                  value={`${(customTerraceArea || building.usable_terrace_area || 0).toLocaleString()} sqm`}
                />
                <LiveAQICard 
                  liveAQI={liveAQI} 
                  aqiLoading={aqiLoading} 
                  fallbackAQI={building.current_aqi}
                />
                <MetricCard
                  icon={CheckCircle2}
                  label="Data Quality"
                  value={`${building.data_quality_score || 0}%`}
                />
              </div>

              {/* Intel notes — warning badges (Option B). Surfaces curated caveats
                  (heritage protected, weak slab, high wind exposure…) upfront so
                  users + vendors don't waste time scoping unviable buildings. */}
              {intelNotes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-6"
                  data-testid="intel-notes-strip"
                >
                  <Card className="border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/30">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                        <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">Things to know about this building</span>
                        <Badge variant="outline" className="border-amber-500/60 text-amber-800 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-900/30 text-[10px]">
                          {intelNotes.length} note{intelNotes.length === 1 ? '' : 's'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {intelNotes.map((n) => {
                          const sev = n.severity || 'medium';
                          const sevCls =
                            sev === 'high' ? 'bg-red-100 border-red-300 text-red-800 dark:bg-red-950/60 dark:border-red-700/50 dark:text-red-200'
                            : sev === 'low' ? 'bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-200'
                            : 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700/50 dark:text-amber-100';
                          const label = (n.tag || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                          return (
                            <div
                              key={n.note_id || n.tag}
                              className={`inline-flex flex-col items-start rounded-lg border px-3 py-2 max-w-md ${sevCls}`}
                              title={n.note}
                              data-testid={`intel-badge-${n.note_id || n.tag}`}
                            >
                              <span className="text-xs font-semibold leading-tight">{label}</span>
                              {n.note && <span className="text-[11px] opacity-80 mt-0.5 leading-snug line-clamp-2">{n.note}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Matched subsidies strip (Option A — surfaces financial value upfront) */}
              {matchedSubsidies.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6"
                  data-testid="matched-subsidies-strip"
                >
                  <Card className="border-emerald-700/40 bg-emerald-950/30">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Banknote className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-semibold text-emerald-100">Money on the table for this building</span>
                        <Badge variant="outline" className="border-emerald-700/60 text-emerald-200 bg-emerald-900/30 text-[10px]">
                          {matchedSubsidies.length} matched
                        </Badge>
                        <Link to={`/subsidies?state=${encodeURIComponent(building.state || '')}`} className="ml-auto text-xs text-emerald-300 hover:text-emerald-200 underline-offset-2 hover:underline" data-testid="view-all-subsidies-link">
                          View all subsidies →
                        </Link>
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {matchedSubsidies.map((s) => (
                          <Link
                            key={s.subsidy_id}
                            to={`/subsidies?focus=${s.subsidy_id}`}
                            className="group rounded-lg border border-emerald-900/40 bg-slate-900/50 p-3 hover:border-emerald-500/60 transition-colors"
                            data-testid={`matched-subsidy-${s.subsidy_id}`}
                          >
                            <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">
                              {(s.type || 'subsidy').toUpperCase().replace('_', ' ')}
                              {s.geo_scope === 'central' ? ' · Central' : s.state ? ` · ${s.state}` : ''}
                            </div>
                            <div className="text-sm font-medium text-slate-100 line-clamp-2 leading-snug mb-1">{s.name}</div>
                            <div className="text-xs text-emerald-300 font-semibold">
                              {s.max_amount_inr ? `Up to ${formatCurrency(s.max_amount_inr)}` : (s.rate_or_percent || 'See details')}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Suitability Score */}
            <Card>
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

          {/* Building Map — hidden from public users (P1 May 19, 2026).
              Backend curation, OSM/Google discovery, polygon edit logic + Esri imagery
              all preserved. Flip `show_user_map` flag or sign in as admin to show. */}
          {showMap && (
          <div className="mt-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    Building Location
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Map Layer Toggle */}
                    <div className="inline-flex rounded-md border bg-muted/30 p-0.5" data-testid="map-layer-toggle">
                      {[
                        { v: 'roadmap', label: 'Map' },
                        { v: 'satellite', label: 'Satellite' },
                        { v: 'hybrid', label: 'Hybrid' },
                        { v: 'esri', label: 'High-Res Aerial' },
                      ].map(opt => (
                        <button
                          key={opt.v}
                          type="button"
                          data-testid={`map-layer-${opt.v}`}
                          onClick={() => setMapLayer(opt.v)}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition ${
                            mapLayer === opt.v
                              ? 'bg-background shadow-sm text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {terraceUnsaved && (
                      <Button 
                        size="sm" 
                        onClick={saveCustomTerrace}
                        disabled={isSavingTerrace}
                        data-testid="save-terrace-btn"
                        className="bg-primary hover:bg-primary/90"
                      >
                        {isSavingTerrace ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardTitle>
                {customTerraceArea && (
                  <CardDescription className="flex items-center gap-2">
                    Custom terrace area: <span className="font-medium text-primary">{customTerraceArea.toLocaleString()} sqm</span>
                    {terraceUnsaved && <Badge variant="outline" className="text-amber-600 border-amber-500">Unsaved</Badge>}
                  </CardDescription>
                )}
                {mapLayer === 'esri' && (
                  <CardDescription className="text-xs text-muted-foreground">
                    Imagery: Esri World Imagery (often higher resolution in Indian cities). Switch back to Hybrid for Google labels.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div 
                  ref={mapRef} 
                  className="w-full h-72 rounded-lg bg-muted"
                  data-testid="building-map"
                />
              </CardContent>
            </Card>
          </div>
          )}
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
                    <span className={`font-medium ${liveAQI?.aqi_color ? '' : (aqiInfo?.color || '')}`} style={liveAQI?.aqi_color ? {color: liveAQI.aqi_color} : {}}>
                      {liveAQI?.aqi_value || building.current_aqi || 'N/A'}
                    </span>
                    {liveAQI?.aqi_level && (
                      <span className="text-sm">
                        {' '}({liveAQI.aqi_level})
                      </span>
                    )}.
                    Urban heat island effect and limited green cover contribute to elevated temperatures
                    and poor air quality in commercial zones.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 pt-4">
                    <Card className={`${liveAQI?.aqi_color === '#00e400' ? 'bg-green-500/10 border-green-500/20' : 
                                       liveAQI?.aqi_color === '#ffff00' ? 'bg-yellow-500/10 border-yellow-500/20' : 
                                       liveAQI?.aqi_color === '#ff7e00' ? 'bg-orange-500/10 border-orange-500/20' : 
                                       'bg-red-500/10 border-red-500/20'}`}>
                      <CardContent className="p-4 text-center">
                        <Wind className="h-8 w-8 mx-auto mb-2" style={{color: liveAQI?.aqi_color || '#ef4444'}} />
                        <div className="text-2xl font-bold" style={{color: liveAQI?.aqi_color || '#ef4444'}}>
                          {liveAQI?.aqi_value || building.current_aqi || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {liveAQI?.data_source === 'Open-Meteo' ? 'Live AQI' : 'Current AQI'}
                        </div>
                        {liveAQI?.pm25_value && (
                          <div className="text-xs text-muted-foreground mt-1">
                            PM2.5: {liveAQI.pm25_value} µg/m³
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Temperature Reduction - Calculated with Explainability */}
                    {(() => {
                      const tempReduction = calculateTemperatureReduction(
                        customTerraceArea || building.usable_terrace_area || 0,
                        building.building_footprint_area || 5000,
                        plantablePercent,
                        gardenType
                      );
                      
                      return (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Card className="bg-green-500/10 border-green-500/20 cursor-pointer hover:bg-green-500/20 transition-colors">
                              <CardContent className="p-4 text-center">
                                <Sun className="h-8 w-8 mx-auto text-green-500 mb-2" />
                                <div className="text-2xl font-bold text-green-500">
                                  -{tempReduction.ambientReduction}°C
                                </div>
                                <div className="text-sm text-muted-foreground">Est. Cooling Effect</div>
                                <div className="text-xs text-primary mt-1 flex items-center justify-center gap-1">
                                  <Info className="h-3 w-3" />
                                  How is this calculated?
                                </div>
                              </CardContent>
                            </Card>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Sun className="h-5 w-5 text-green-500" />
                                Temperature Reduction Methodology
                              </DialogTitle>
                              <DialogDescription>
                                Scientific basis for our cooling effect estimates
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="p-4 bg-muted rounded-lg">
                                <div className="text-sm text-muted-foreground mb-2">{tempReduction.methodology}</div>
                                <div className="text-3xl font-bold text-green-500">-{tempReduction.ambientReduction}°C</div>
                                <div className="text-sm">Estimated ambient air temperature reduction</div>
                              </div>
                              
                              <div className="space-y-3">
                                <h4 className="font-medium">Calculation Breakdown:</h4>
                                
                                <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg">
                                  <div>
                                    <div className="font-medium">Evapotranspiration</div>
                                    <div className="text-xs text-muted-foreground">Plant water vapor release</div>
                                  </div>
                                  <div className="text-lg font-semibold text-blue-500">-{tempReduction.breakdown.evapotranspiration}°C</div>
                                </div>
                                
                                <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
                                  <div>
                                    <div className="font-medium">Shading Effect</div>
                                    <div className="text-xs text-muted-foreground">Reduced solar radiation</div>
                                  </div>
                                  <div className="text-lg font-semibold text-green-500">-{tempReduction.breakdown.shading}°C</div>
                                </div>
                                
                                <div className="flex justify-between items-center p-3 bg-amber-500/10 rounded-lg">
                                  <div>
                                    <div className="font-medium">Albedo Change</div>
                                    <div className="text-xs text-muted-foreground">Increased solar reflection</div>
                                  </div>
                                  <div className="text-lg font-semibold text-amber-500">-{tempReduction.breakdown.albedo}°C</div>
                                </div>
                              </div>
                              
                              <div className="p-3 bg-muted/50 rounded-lg">
                                <div className="text-sm">
                                  <strong>Surface Temperature:</strong> Green roofs can reduce roof surface temperature by up to <strong>{tempReduction.surfaceReduction}°C</strong> compared to conventional roofs (60-80°C → 25-35°C).
                                </div>
                              </div>
                              
                              <div className="text-xs text-muted-foreground border-t pt-3">
                                <strong>Research References:</strong>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                  <li>EPA Urban Heat Island Mitigation (2008)</li>
                                  <li>Santamouris et al. (2014) - Impact of urban heat island</li>
                                  <li>Alexandri & Jones (2008) - Temperature decreases from urban greening</li>
                                </ul>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      );
                    })()}
                    
                    <Card className="bg-blue-500/10 border-blue-500/20">
                      <CardContent className="p-4 text-center">
                        <Droplets className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                        <div className="text-2xl font-bold text-blue-500">
                          -{Math.round(plantablePercent * 0.7)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Water Runoff Reduction</div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* CO2 Sequestration Potential - Speedometer */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-primary" />
                    CO₂ Sequestration Potential
                  </CardTitle>
                  <CardDescription>
                    Estimated annual carbon capture from your terrace garden
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const terraceArea = customTerraceArea || building.usable_terrace_area || 0;
                    const plantPlan = calculatePlantRecommendations(terraceArea, plantablePercent, gardenType, building.city);
                    const maxCO2 = 5000; // Max scale for gauge
                    const co2Percent = Math.min((plantPlan.totalCO2 / maxCO2) * 100, 100);
                    
                    return (
                      <div className="flex flex-col lg:flex-row items-center gap-8">
                        {/* Speedometer Gauge */}
                        <div className="relative w-64 h-40">
                          <svg viewBox="0 0 200 120" className="w-full h-full">
                            {/* Background arc */}
                            <path
                              d="M 20 100 A 80 80 0 0 1 180 100"
                              fill="none"
                              stroke="hsl(var(--muted))"
                              strokeWidth="16"
                              strokeLinecap="round"
                            />
                            {/* Colored gradient arc */}
                            <defs>
                              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="25%" stopColor="#f59e0b" />
                                <stop offset="50%" stopColor="#eab308" />
                                <stop offset="75%" stopColor="#22c55e" />
                                <stop offset="100%" stopColor="#10b981" />
                              </linearGradient>
                            </defs>
                            <path
                              d="M 20 100 A 80 80 0 0 1 180 100"
                              fill="none"
                              stroke="url(#gaugeGradient)"
                              strokeWidth="16"
                              strokeLinecap="round"
                              strokeDasharray={`${co2Percent * 2.51} 251`}
                            />
                            {/* Needle */}
                            <line
                              x1="100"
                              y1="100"
                              x2={100 + 60 * Math.cos((180 - co2Percent * 1.8) * Math.PI / 180)}
                              y2={100 - 60 * Math.sin((180 - co2Percent * 1.8) * Math.PI / 180)}
                              stroke="hsl(var(--foreground))"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            <circle cx="100" cy="100" r="8" fill="hsl(var(--foreground))" />
                            {/* Value text */}
                            <text x="100" y="85" textAnchor="middle" className="fill-current text-3xl font-bold">
                              {Math.floor(plantPlan.totalCO2).toLocaleString()}
                            </text>
                            <text x="100" y="102" textAnchor="middle" className="fill-muted-foreground text-xs">
                              kg CO₂/year
                            </text>
                          </svg>
                          {/* Scale labels */}
                          <div className="absolute bottom-0 left-0 text-xs text-muted-foreground">0</div>
                          <div className="absolute bottom-0 right-0 text-xs text-muted-foreground">5,000</div>
                        </div>
                        
                        {/* Impact breakdown */}
                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-green-500/10 rounded-lg text-center">
                              <div className="text-3xl font-bold text-green-500">
                                {Math.floor(plantPlan.totalCO2 / 12)}
                              </div>
                              <div className="text-sm text-muted-foreground">Trees equivalent</div>
                            </div>
                            <div className="p-4 bg-blue-500/10 rounded-lg text-center">
                              <div className="text-3xl font-bold text-blue-500">
                                {Math.floor(plantPlan.totalCO2 * 2.5)}
                              </div>
                              <div className="text-sm text-muted-foreground">km car offset</div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            With <strong>{plantPlan.actualPlantableArea.toLocaleString()} sqm</strong> of planted area,
                            your terrace garden will absorb approximately <strong>{Math.floor(plantPlan.totalCO2).toLocaleString()} kg</strong> of 
                            CO₂ annually - equivalent to planting <strong>{Math.floor(plantPlan.totalCO2 / 12)} mature trees</strong>.
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Solutions Tab - Terrace Garden Planner */}
            <TabsContent value="solutions" className="space-y-6">
              {/* Custom Area Notice */}
              {customTerraceArea && (
                <Card className="border-blue-500/30 bg-blue-500/5">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Info className="h-5 w-5 text-blue-500" />
                    <span className="text-sm">
                      Using custom area from map: <strong>{customTerraceArea.toLocaleString()} sqm</strong>
                      <button 
                        onClick={() => setCustomTerraceArea(null)} 
                        className="ml-2 text-blue-500 underline"
                      >
                        Reset to default
                      </button>
                    </span>
                  </CardContent>
                </Card>
              )}

              {/* Plantable Area Configurator */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-primary" />
                    Terrace Garden Planner
                  </CardTitle>
                  <CardDescription>
                    Customize your terrace garden layout and get personalized plant recommendations for {building.city}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Terrace Area Slider */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Plantable Area</Label>
                      <span className="text-2xl font-bold text-primary">
                        {Math.floor((customTerraceArea || building.usable_terrace_area || 0) * plantablePercent / 100).toLocaleString()} sqm
                      </span>
                    </div>
                    <Slider
                      value={[plantablePercent]}
                      onValueChange={([val]) => setPlantablePercent(val)}
                      min={30}
                      max={90}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>30% (Minimal)</span>
                      <span className="font-medium">{plantablePercent}% of {(customTerraceArea || building.usable_terrace_area || 0).toLocaleString()} sqm terrace</span>
                      <span>90% (Maximum)</span>
                    </div>
                  </div>

                  {/* Garden Type Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Garden Type</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'mixed', label: 'Mixed Garden', desc: 'Trees, shrubs & vegetables', icon: Leaf },
                        { value: 'ornamental', label: 'Ornamental', desc: 'Decorative plants & flowers', icon: Flower2 },
                        { value: 'vegetable', label: 'Kitchen Garden', desc: 'Vegetables & herbs', icon: Sprout },
                      ].map(type => (
                        <button
                          key={type.value}
                          onClick={() => setGardenType(type.value)}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            gardenType === type.value 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <type.icon className={`h-6 w-6 mb-2 ${gardenType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Plant Recommendations */}
              {(() => {
                const plantPlan = calculatePlantRecommendations(
                  customTerraceArea || building.usable_terrace_area || 0,
                  plantablePercent,
                  gardenType,
                  building.city
                );
                
                return (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="bg-green-500/10 border-green-500/20">
                        <CardContent className="p-4 text-center">
                          <TreePine className="h-8 w-8 mx-auto text-green-500 mb-2" />
                          <div className="text-2xl font-bold text-green-500">
                            {plantPlan.actualPlantableArea.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">sqm Plantable</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-emerald-500/10 border-emerald-500/20">
                        <CardContent className="p-4 text-center">
                          <Leaf className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                          <div className="text-2xl font-bold text-emerald-500">
                            {Math.floor(plantPlan.totalCO2).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">kg CO₂/year</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-500/10 border-blue-500/20">
                        <CardContent className="p-4 text-center">
                          <Droplets className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                          <div className="text-2xl font-bold text-blue-500">
                            {plantPlan.waterRequirement.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">L/day water</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-amber-500/10 border-amber-500/20">
                        <CardContent className="p-4 text-center">
                          <Users className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                          <div className="text-lg font-bold text-amber-500">
                            Get Quote
                          </div>
                          <div className="text-sm text-muted-foreground">From providers</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Plant Recommendations */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-heading font-semibold">Recommended Plants</h3>
                      
                      {plantPlan.recommendations.map((rec, idx) => (
                        <Card key={idx}>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <rec.icon className="h-5 w-5 text-primary" />
                              {rec.category}
                              <Badge variant="secondary" className="ml-auto">
                                {rec.area.toFixed(0)} sqm
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {rec.plants.filter(p => p.count > 0).map((plant, pIdx) => (
                                <div key={pIdx} className="p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium">{plant.name}</span>
                                    <Badge variant="outline">{plant.count} plants</Badge>
                                  </div>
                                  {plant.botanical && (
                                    <div className="text-xs text-muted-foreground italic mb-1">{plant.botanical}</div>
                                  )}
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {plant.benefits?.slice(0, 2).map((b, bIdx) => (
                                      <span key={bIdx} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                        {b}
                                      </span>
                                    ))}
                                    {plant.yield && (
                                      <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full">
                                        Yield: {plant.yield}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-2">
                                    Water: {plant.waterNeed}
                                    {plant.co2 && ` • CO₂: ${plant.co2}kg/year`}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {rec.monthlyYield && (
                              <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Sprout className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-600">
                                    Estimated Monthly Yield: {rec.monthlyYield} kg vegetables
                                  </span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Area Distribution Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Area Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  ...plantPlan.recommendations.map(r => ({ name: r.category, value: r.area })),
                                  { name: 'Walkways', value: plantPlan.walkwayArea },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, value }) => `${name}: ${value.toFixed(0)} sqm`}
                              >
                                {plantPlan.recommendations.map((_, idx) => (
                                  <Cell key={idx} fill={['#22c55e', '#10b981', '#14b8a6', '#06b6d4'][idx % 4]} />
                                ))}
                                <Cell fill="#94a3b8" />
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
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

      {/* Report download dialog (server-side, persona-tuned) */}
      <ReportDownloadDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        buildingId={building.building_id}
        mode="download"
      />
    </div>
  );
}

function LiveAQICard({ liveAQI, aqiLoading, fallbackAQI }) {
  const displayAQI = liveAQI?.aqi_value || fallbackAQI;
  const aqiLevel = liveAQI?.aqi_level || (displayAQI ? getAQILevel(displayAQI).level : 'Unknown');
  const aqiColor = liveAQI?.aqi_color || (displayAQI ? getAQILevel(displayAQI).color : 'text-muted-foreground');
  const isLive = liveAQI?.data_source === 'Open-Meteo';
  
  // Convert hex color to tailwind class
  const getColorClass = (color) => {
    if (color?.startsWith('#')) {
      // Map hex colors to closest tailwind
      if (color === '#00e400') return 'text-green-500';
      if (color === '#ffff00') return 'text-yellow-500';
      if (color === '#ff7e00') return 'text-orange-500';
      if (color === '#ff0000') return 'text-red-500';
      if (color === '#8f3f97') return 'text-purple-500';
      if (color === '#7e0023') return 'text-red-900';
    }
    return color || 'text-muted-foreground';
  };
  
  const getBgClass = (color) => {
    if (color === '#00e400') return 'bg-green-500/10 border-green-500/30';
    if (color === '#ffff00') return 'bg-yellow-500/10 border-yellow-500/30';
    if (color === '#ff7e00') return 'bg-orange-500/10 border-orange-500/30';
    if (color === '#ff0000') return 'bg-red-500/10 border-red-500/30';
    if (color === '#8f3f97') return 'bg-purple-500/10 border-purple-500/30';
    if (color === '#7e0023') return 'bg-red-900/10 border-red-900/30';
    return 'bg-muted/30 border-muted';
  };

  return (
    <Card className={`border ${getBgClass(liveAQI?.aqi_color)}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <Wind className="h-5 w-5 text-muted-foreground" />
          {isLive && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-green-500/10 text-green-600 border-green-500/30">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              LIVE
            </Badge>
          )}
          {aqiLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        
        <div className={`text-2xl font-heading font-bold mt-2 ${getColorClass(liveAQI?.aqi_color)}`}>
          {displayAQI || 'N/A'}
        </div>
        <div className="text-xs text-muted-foreground">Current AQI</div>
        
        {aqiLevel && (
          <div className={`text-xs font-medium mt-1 ${getColorClass(liveAQI?.aqi_color)}`}>
            {aqiLevel}
          </div>
        )}
        
        {liveAQI?.pm25_value && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">PM2.5</span>
              <span className="font-medium">{liveAQI.pm25_value} µg/m³</span>
            </div>
            {liveAQI?.pm10_value && (
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-foreground">PM10</span>
                <span className="font-medium">{liveAQI.pm10_value} µg/m³</span>
              </div>
            )}
          </div>
        )}
        
        {liveAQI?.health_implications && (
          <div className="mt-2 text-[10px] text-muted-foreground leading-tight">
            {liveAQI.health_implications}
          </div>
        )}
      </CardContent>
    </Card>
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
              {/* Cost estimate hidden - to be provided by service providers */}
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
                {auditLog.calculation_steps.map((step) => (
                  <div key={step.step} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
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
