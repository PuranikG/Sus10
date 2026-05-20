import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Sun, Recycle, Droplets, Leaf, ArrowRight, MapPin, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import Navbar from '../components/layout/Navbar';
import { apiRequest, formatCurrency } from '../lib/utils';

function renderBold(text) {
  return (text || '').split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <span key={i} className="text-emerald-300 font-bold">{part.slice(2, -2)}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function CityInsightsPage() {
  const { city } = useParams();
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/insights/cities').then((r) => setCities(r?.cities || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    apiRequest(`/insights/city/${encodeURIComponent(city)}`)
      .then((r) => setData(r))
      .finally(() => setLoading(false));
  }, [city]);

  // Redirect to first city if none in URL
  useEffect(() => {
    if (!city && cities.length > 0) {
      navigate(`/insights/${encodeURIComponent(cities[0].city)}`, { replace: true });
    }
  }, [city, cities, navigate]);

  if (!city) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-max section-padding py-20 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-emerald-900/40 bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950">
        <div className="container-max section-padding py-12 md:py-16">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <Badge variant="outline" className="border-emerald-700/60 text-emerald-200 bg-emerald-950/50" data-testid="insights-eyebrow">
              <Sparkles className="h-3 w-3 mr-1" /> What if · City insights
            </Badge>
            {cities.length > 0 && (
              <Select value={city} onValueChange={(v) => navigate(`/insights/${encodeURIComponent(v)}`)}>
                <SelectTrigger className="w-[200px] bg-slate-900/60 border-slate-700 text-slate-100" data-testid="city-switcher">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.city} value={c.city}>{c.city} <span className="text-xs text-muted-foreground ml-1">({c.buildings_count})</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-heading font-bold tracking-tight mb-3 text-slate-50 flex items-center gap-3 flex-wrap">
            <MapPin className="h-7 w-7 text-emerald-400" />
            What if every building in <span className="text-emerald-400">{city}</span> went green?
          </h1>

          {loading ? (
            <div className="py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>
          ) : data && data.buildings_count > 0 ? (
            <>
              <p className="text-base md:text-xl text-slate-200 max-w-4xl leading-relaxed" data-testid="city-narrative">
                {renderBold(data.narrative)}
              </p>
              {data.narrative_chips?.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2" data-testid="city-narrative-chips">
                  {data.narrative_chips.map((c) => (
                    <span key={c.label} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/50 border border-emerald-700/50 px-3 py-1 text-xs text-emerald-100">
                      <span className="opacity-70">{c.label}</span>
                      <span className="font-semibold">{c.value}</span>
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-300">No curated buildings for {city} yet. Be the first — <Link to="/calculate" className="text-emerald-300 underline">add yours via the calculator</Link>.</p>
          )}
        </div>
      </section>

      {/* Pillar totals */}
      {data && data.buildings_count > 0 && (
      <section className="container-max section-padding py-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-testid="city-pillars-grid">
          <PillarCard
            icon={Sun}
            color="text-amber-400"
            label="Solar generation"
            value={`${(data.totals.solar_kwh_per_year / 1000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            unit="MWh / yr"
            sub="Total rooftop PV potential"
          />
          <PillarCard
            icon={Recycle}
            color="text-emerald-400"
            label="Biogas"
            value={data.totals.biogas_m3_per_year.toLocaleString('en-IN')}
            unit="m³ / yr"
            sub="Kitchen waste to cooking fuel"
          />
          <PillarCard
            icon={Droplets}
            color="text-sky-400"
            label="Rainwater captured"
            value={`${Math.round(data.totals.rainwater_kl_per_year).toLocaleString('en-IN')}`}
            unit="kL / yr"
            sub="Recharge + reuse from rooftops"
          />
          <PillarCard
            icon={Leaf}
            color="text-lime-400"
            label="Plants on rooftops"
            value={data.totals.plants_count.toLocaleString('en-IN')}
            unit="plants"
            sub={`${data.totals.food_yield_kg_per_year.toLocaleString('en-IN')} kg food/yr`}
          />
        </motion.div>

        {/* Totals summary card */}
        <Card className="mb-8 border-emerald-700/40 bg-slate-900/60 backdrop-blur" data-testid="city-totals">
          <CardContent className="p-5 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Buildings curated</div>
              <div className="text-2xl font-bold text-slate-50">{data.buildings_count}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Annual savings</div>
              <div className="text-2xl font-bold text-emerald-400">{formatCurrency(data.totals.annual_savings_inr)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">CO₂ avoided</div>
              <div className="text-2xl font-bold text-slate-50">{Math.round(data.totals.co2_tonnes_per_year).toLocaleString('en-IN')} <span className="text-sm text-slate-400">t/yr</span></div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total terrace</div>
              <div className="text-2xl font-bold text-slate-50">{data.totals.total_usable_terrace_sqm.toLocaleString('en-IN')} <span className="text-sm text-slate-400">sqm</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* By type */}
          {data.by_type?.length > 0 && (
            <Card data-testid="city-by-type">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-3">By building type</h3>
                <ul className="space-y-2">
                  {data.by_type.map((t) => (
                    <li key={t.building_type} className="flex items-center justify-between border-b py-2 last:border-0">
                      <span className="capitalize">{t.building_type.replace(/_/g, ' ')} <span className="text-xs text-muted-foreground">({t.count})</span></span>
                      <span className="font-semibold text-emerald-500">{formatCurrency(t.annual_savings_inr)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Top buildings */}
          {data.top_buildings?.length > 0 && (
            <Card data-testid="city-top-buildings">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-3">Top opportunity buildings</h3>
                <ul className="space-y-2">
                  {data.top_buildings.map((b) => (
                    <li key={b.building_id} className="flex items-center justify-between border-b py-2 last:border-0 gap-2">
                      <Link to={`/buildings/${b.building_id}/potential`} className="truncate hover:underline" title={b.name}>{b.name}</Link>
                      <span className="font-semibold text-emerald-500 shrink-0">{formatCurrency(b.annual_savings_inr)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Want to add your building to this picture?</p>
          <Link to="/calculate">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold" data-testid="insights-cta-calculator">
              <Sparkles className="h-4 w-4 mr-2" />
              Calculate your roof's contribution
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
      )}
    </div>
  );
}

function PillarCard({ icon: Icon, color, label, value, unit, sub }) {
  return (
    <Card>
      <CardContent className="p-5">
        <Icon className={`h-7 w-7 mb-2 ${color}`} />
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
        <div className="text-3xl font-heading font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{unit}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-2">{sub}</div>}
      </CardContent>
    </Card>
  );
}
