import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calculator, Home, Zap, Flame, Users, Building2, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import Navbar from '../components/layout/Navbar';
import { apiRequest } from '../lib/utils';
import { toast } from 'sonner';

const CITY_STATE = {
  Mumbai: 'Maharashtra', Pune: 'Maharashtra', 'Navi Mumbai': 'Maharashtra', Thane: 'Maharashtra', Nagpur: 'Maharashtra', Amravati: 'Maharashtra',
  Delhi: 'Delhi', Gurugram: 'Haryana', Faridabad: 'Haryana',
  Noida: 'Uttar Pradesh', Ghaziabad: 'Uttar Pradesh', Lucknow: 'Uttar Pradesh', Kanpur: 'Uttar Pradesh',
  Bengaluru: 'Karnataka', Mysuru: 'Karnataka', Mangaluru: 'Karnataka',
  Hyderabad: 'Telangana', Chennai: 'Tamil Nadu', Coimbatore: 'Tamil Nadu',
  Kolkata: 'West Bengal', Ahmedabad: 'Gujarat', Surat: 'Gujarat', Vadodara: 'Gujarat',
  Jaipur: 'Rajasthan', Indore: 'Madhya Pradesh', Bhopal: 'Madhya Pradesh',
  Kochi: 'Kerala', Thiruvananthapuram: 'Kerala', Chandigarh: 'Punjab', Patna: 'Bihar',
  Visakhapatnam: 'Andhra Pradesh', Dehradun: 'Uttarakhand', Goa: 'Goa',
};

const CITIES = Object.keys(CITY_STATE).sort();

const BUILDING_TYPES = [
  { value: 'residential', label: 'Independent home / Villa' },
  { value: 'apartment', label: 'Apartment / Flat (in society)' },
  { value: 'housing_society', label: 'Housing Society / RWA (whole building)' },
  { value: 'commercial', label: 'Commercial / Shop / Office' },
];

export default function SustenanceCalculatorPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    address: '',
    city: 'Mumbai',
    building_type: 'residential',
    roof_area_sqm: '',
    floors: 1,
    family_size: 4,
    families: '',
    monthly_electricity_bill_inr: '',
    monthly_gas_bill_inr: '',
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.address || !form.city || !form.roof_area_sqm) {
      toast.error('Please fill address, city and roof area.');
      return;
    }
    setSubmitting(true);
    try {
      const isSociety = form.building_type === 'housing_society';
      const body = {
        name: form.name || undefined,
        email: form.email || undefined,
        address: form.address,
        city: form.city,
        state: CITY_STATE[form.city] || undefined,
        building_type: form.building_type,
        roof_area_sqm: Number(form.roof_area_sqm),
        floors: Number(form.floors) || 1,
        family_size: Number(form.family_size) || undefined,
        families: isSociety && form.families ? Number(form.families) : undefined,
        monthly_electricity_bill_inr: form.monthly_electricity_bill_inr ? Number(form.monthly_electricity_bill_inr) : undefined,
        monthly_gas_bill_inr: form.monthly_gas_bill_inr ? Number(form.monthly_gas_bill_inr) : undefined,
      };
      const res = await apiRequest('/calculate/quick-potential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res?.redirect_to) {
        navigate(res.redirect_to);
      } else if (res?.building_id) {
        navigate(`/buildings/${res.building_id}/potential`);
      } else {
        toast.error('Could not generate potential. Try again.');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to calculate. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isSociety = form.building_type === 'housing_society';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-emerald-900/40 bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950">
        <div className="container-max section-padding py-12 md:py-16">
          <Badge variant="outline" className="mb-3 border-emerald-700/60 text-emerald-200 bg-emerald-950/50" data-testid="calc-eyebrow">
            <Sparkles className="h-3 w-3 mr-1" /> Sustenance calculator · 60 seconds
          </Badge>
          <h1 className="text-3xl md:text-5xl font-heading font-bold tracking-tight mb-3 text-slate-50">
            Your rooftop is an <span className="text-emerald-400">energy resource</span>.
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl">
            Tell us a few things about your home. We'll show you what your roof can do for you —
            power, water, food, biogas, savings, and CO₂ avoided — in one integrated picture.
          </p>
        </div>
      </section>

      {/* Calculator */}
      <section className="container-max section-padding py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="max-w-3xl mx-auto">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6" data-testid="quick-calc-form">
                {/* Address */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="calc-address" className="mb-1.5 flex items-center gap-1.5"><Home className="h-3.5 w-3.5" /> Address (city + locality is enough)</Label>
                    <Input
                      id="calc-address" required
                      value={form.address}
                      onChange={(e) => update('address', e.target.value)}
                      placeholder="e.g. 3rd Cross, HSR Layout"
                      data-testid="calc-address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="calc-city" className="mb-1.5">City</Label>
                    <Select value={form.city} onValueChange={(v) => update('city', v)}>
                      <SelectTrigger id="calc-city" data-testid="calc-city"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-detects: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{CITY_STATE[form.city]}</span>
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="calc-btype" className="mb-1.5">Building type</Label>
                    <Select value={form.building_type} onValueChange={(v) => update('building_type', v)}>
                      <SelectTrigger id="calc-btype" data-testid="calc-building-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BUILDING_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Roof + floors */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="calc-roof" className="mb-1.5 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Roof area (sqm)</Label>
                    <Input
                      id="calc-roof" required type="number" min="10" step="any"
                      value={form.roof_area_sqm}
                      onChange={(e) => update('roof_area_sqm', e.target.value)}
                      placeholder="e.g. 80"
                      data-testid="calc-roof-area"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Approx. is fine. 1 sqm ≈ 10.7 sqft.</p>
                  </div>
                  <div>
                    <Label htmlFor="calc-floors" className="mb-1.5">Floors</Label>
                    <Input
                      id="calc-floors" type="number" min="1" max="60"
                      value={form.floors}
                      onChange={(e) => update('floors', e.target.value)}
                      data-testid="calc-floors"
                    />
                  </div>
                  <div>
                    <Label htmlFor="calc-family" className="mb-1.5 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Family size</Label>
                    <Input
                      id="calc-family" type="number" min="1" max="50"
                      value={form.family_size}
                      onChange={(e) => update('family_size', e.target.value)}
                      data-testid="calc-family-size"
                    />
                  </div>
                </div>

                {isSociety && (
                  <div>
                    <Label htmlFor="calc-families" className="mb-1.5">Number of families / apartments in the society</Label>
                    <Input
                      id="calc-families" type="number" min="1" max="2000"
                      value={form.families}
                      onChange={(e) => update('families', e.target.value)}
                      placeholder="e.g. 48"
                      data-testid="calc-families"
                    />
                  </div>
                )}

                {/* Bills */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="calc-ebill" className="mb-1.5 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> Monthly electricity bill (₹) <span className="text-muted-foreground text-xs">optional</span></Label>
                    <Input
                      id="calc-ebill" type="number" min="0"
                      value={form.monthly_electricity_bill_inr}
                      onChange={(e) => update('monthly_electricity_bill_inr', e.target.value)}
                      placeholder="e.g. 3500"
                      data-testid="calc-ebill"
                    />
                  </div>
                  <div>
                    <Label htmlFor="calc-gbill" className="mb-1.5 flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-orange-500" /> Monthly gas/LPG bill (₹) <span className="text-muted-foreground text-xs">optional</span></Label>
                    <Input
                      id="calc-gbill" type="number" min="0"
                      value={form.monthly_gas_bill_inr}
                      onChange={(e) => update('monthly_gas_bill_inr', e.target.value)}
                      placeholder="e.g. 1100"
                      data-testid="calc-gbill"
                    />
                  </div>
                </div>

                {/* Optional contact */}
                <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <Label htmlFor="calc-name" className="mb-1.5">Your name <span className="text-muted-foreground text-xs">optional</span></Label>
                    <Input
                      id="calc-name"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="So we know who to address the report to"
                      data-testid="calc-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="calc-email" className="mb-1.5">Email <span className="text-muted-foreground text-xs">optional, for the report</span></Label>
                    <Input
                      id="calc-email" type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="you@example.com"
                      data-testid="calc-email"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Estimates use MNRE / CPCB / IS standards. No data is shared with third parties.
                  </p>
                  <Button type="submit" size="lg" disabled={submitting} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold" data-testid="calc-submit-btn">
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Calculating…</>
                    ) : (
                      <><Calculator className="h-4 w-4 mr-2" /> Show my integrated potential <ArrowRight className="h-4 w-4 ml-2" /></>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reassurance row */}
        <div className="max-w-3xl mx-auto mt-6 grid sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border bg-card p-3">
            <div className="font-semibold mb-1">Integrated, not just solar</div>
            <span className="text-muted-foreground">Solar PV + biogas + rainwater + greening — one roof, four wins.</span>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="font-semibold mb-1">Real Indian standards</div>
            <span className="text-muted-foreground">MNRE GHI, CPCB norms, IMD rainfall, CEA grid factors — no guesswork.</span>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="font-semibold mb-1">Vendor consult on the side</div>
            <span className="text-muted-foreground">Decide if you want help. We connect you to verified installers.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
