import { useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import {
  Search, Filter, ExternalLink, Banknote, Building2, Sun, Sprout, Droplets,
  Receipt, ScrollText, Loader2, MapPin, X,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import Navbar from '../components/layout/Navbar';
import { apiRequest, formatCurrency } from '../lib/utils';

const CATEGORY_META = {
  solar: { label: 'Solar', icon: Sun, color: '#f59e0b' },
  biogas: { label: 'Biogas', icon: Sprout, color: '#16a34a' },
  rainwater: { label: 'Rainwater', icon: Droplets, color: '#0ea5e9' },
  greening: { label: 'Greening', icon: Sprout, color: '#14b8a6' },
};

const TYPE_META = {
  cfa: { label: 'CFA', icon: Banknote, color: '#16a34a' },
  subsidy: { label: 'Subsidy', icon: Banknote, color: '#16a34a' },
  loan: { label: 'Loan', icon: Banknote, color: '#1e3a8a' },
  tax_credit: { label: 'Tax credit', icon: Receipt, color: '#a16207' },
  net_metering: { label: 'Net-metering', icon: ScrollText, color: '#0ea5e9' },
};

const STATES = ['All', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat', 'Telangana', 'Uttar Pradesh', 'West Bengal'];

function SubsidyCard({ item, onOpen }) {
  const cat = item.category?.[0];
  const meta = CATEGORY_META[cat] || CATEGORY_META.solar;
  const typeMeta = TYPE_META[item.type] || TYPE_META.subsidy;
  const Icon = meta.icon;
  const TypeIcon = typeMeta.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card
        className="h-full hover:shadow-md transition-all cursor-pointer border-border/60 overflow-hidden"
        onClick={() => onOpen(item)}
        data-testid={`subsidy-card-${item.subsidy_id}`}
      >
        <div className="h-1 w-full" style={{ backgroundColor: meta.color }} />
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <Icon className="h-3 w-3" />{meta.label}
            </Badge>
            <Badge style={{ backgroundColor: typeMeta.color, color: '#fff' }}>
              <TypeIcon className="h-3 w-3 mr-1" />{typeMeta.label}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {item.geo_scope === 'central' ? '🇮🇳 Central' : `📍 ${item.state || item.city || 'State'}`}
            </Badge>
          </div>
          <h3 className="font-semibold leading-tight mb-1">{item.name}</h3>
          <div className="text-xs text-muted-foreground mb-3">{item.authority}</div>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{item.benefit_summary}</p>
          {item.rate_or_percent && (
            <div className="text-xs font-medium" style={{ color: meta.color }}>{item.rate_or_percent}</div>
          )}
          {item.max_amount_inr ? (
            <div className="text-xs text-muted-foreground mt-1">Up to {formatCurrency(item.max_amount_inr)}</div>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SubsidyDialog({ open, item, onClose }) {
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="subsidy-dialog">
        <DialogHeader>
          <DialogTitle className="text-2xl">{item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{item.authority}</Badge>
            {item.scheme_code && <Badge variant="secondary">{item.scheme_code}</Badge>}
            {(item.category || []).map((c) => <Badge key={c} variant="outline">{CATEGORY_META[c]?.label || c}</Badge>)}
            {item.geo_scope === 'central' && <Badge>Central</Badge>}
            {item.state && <Badge>{item.state}</Badge>}
            {item.city && <Badge>{item.city}</Badge>}
          </div>

          {item.rate_or_percent && (
            <div className="rounded-lg bg-muted p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Rate / Percent</div>
              <div className="text-lg font-semibold">{item.rate_or_percent}</div>
            </div>
          )}

          {item.max_amount_inr ? (
            <div className="rounded-lg bg-primary/5 p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Max amount</div>
              <div className="text-lg font-semibold">{formatCurrency(item.max_amount_inr)}</div>
            </div>
          ) : null}

          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.benefit_details_markdown || ''}</ReactMarkdown>
          </div>

          {item.documents_required?.length > 0 && (
            <div>
              <div className="font-semibold mb-2">Documents required</div>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {item.documents_required.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
          )}

          {item.application_url && (
            <Button asChild data-testid="subsidy-apply-btn">
              <a href={item.application_url} target="_blank" rel="noopener noreferrer">
                Apply on official portal <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SubsidiesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [state, setState] = useState('All');
  const [type, setType] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (category !== 'all') sp.set('category', category);
    if (state !== 'All') sp.set('state', state);
    if (type !== 'all') sp.set('type', type);
    apiRequest(`/subsidies?${sp.toString()}`)
      .then(r => setItems(r?.subsidies || []))
      .finally(() => setLoading(false));
  }, [category, state, type]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(s =>
      (s.name || '').toLowerCase().includes(q)
      || (s.benefit_summary || '').toLowerCase().includes(q)
      || (s.authority || '').toLowerCase().includes(q)
      || (s.scheme_code || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="border-b border-emerald-900/40 bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950">
        <div className="container-max section-padding py-14">
          <Badge variant="outline" className="mb-3 border-emerald-700/60 text-emerald-200 bg-emerald-950/50">Subsidies & financing navigator</Badge>
          <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-2 text-slate-50">
            Money you might be leaving on the table.
          </h1>
          <p className="text-slate-300 max-w-2xl">
            A curated catalogue of central + state subsidies, CFAs, loans, tax credits and net-metering
            schemes for rooftop solar, rainwater harvesting, biogas and green-building investments in India.
          </p>
        </div>
      </section>

      <section className="container-max section-padding py-8">
        <Card className="mb-6">
          <CardContent className="p-4 grid md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-end" data-testid="subsidies-filters">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Solar, RWH, GRIHA, SBI…" className="pl-8" data-testid="subsidies-search" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="subsidies-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="solar">Solar</SelectItem>
                  <SelectItem value="biogas">Biogas</SelectItem>
                  <SelectItem value="rainwater">Rainwater</SelectItem>
                  <SelectItem value="greening">Greening</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger data-testid="subsidies-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="cfa">CFA</SelectItem>
                  <SelectItem value="subsidy">Subsidy</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="tax_credit">Tax credit</SelectItem>
                  <SelectItem value="net_metering">Net-metering</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">State</label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger data-testid="subsidies-state"><SelectValue /></SelectTrigger>
                <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(search || category !== 'all' || type !== 'all' || state !== 'All') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategory('all'); setType('all'); setState('All'); }} data-testid="subsidies-clear">
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground mb-4" data-testid="subsidies-count">
          {loading ? 'Loading…' : `${filtered.length.toLocaleString()} subsidies & financing options`}
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            No matches. Try clearing some filters.
          </CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="subsidies-grid">
            {filtered.map((s) => <SubsidyCard key={s.subsidy_id} item={s} onOpen={setSelected} />)}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-10 max-w-2xl mx-auto">
          <MapPin className="h-3 w-3 inline mr-1" />
          Estimates only — schemes & rates change. Always verify on the official portal before applying.
          Suggestions or errors? Email <a href="mailto:hello@sus10.ai" className="underline">hello@sus10.ai</a>.
        </p>
      </section>

      <SubsidyDialog open={!!selected} item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
