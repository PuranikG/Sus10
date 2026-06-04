import { useEffect, useState, useMemo } from 'react';
import { ExternalLink, MessageCircle, RefreshCw, Download, Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import AdminShell from '../components/layout/AdminShell';
import { apiRequest } from '../lib/utils';

const TIERS = ['Explorer', 'Getting Ready', 'Action Ready', 'Sustainability Champion'];
const BUILDING_TYPES = [
  'Independent House', 'Row House',
  'Mid/low-rise Apartment (1-4 floors)', 'High-rise apartment (5+ floors)',
];
const TIER_COLORS = {
  'Explorer': 'text-red-400',
  'Getting Ready': 'text-amber-400',
  'Action Ready': 'text-emerald-400',
  'Sustainability Champion': 'text-green-400',
};

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminLeadsPage() {
  const [leads, setLeads]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [today, setToday]         = useState(0);
  const [thisWeek, setThisWeek]   = useState(0);
  const [loading, setLoading]     = useState(true);

  // Filters
  const [tier, setTier]           = useState('');
  const [city, setCity]           = useState('');
  const [btype, setBtype]         = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (tier)     sp.set('tier', tier);
      if (city)     sp.set('city', city);
      if (btype)    sp.set('building_type', btype);
      if (dateFrom) sp.set('date_from', dateFrom);
      if (dateTo)   sp.set('date_to', dateTo);
      const r = await apiRequest(`/admin/leads?${sp.toString()}`);
      setLeads(r?.leads || []);
      setTotal(r?.total || 0);
      setToday(r?.today || 0);
      setThisWeek(r?.this_week || 0);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLeads(); }, [tier, btype, dateFrom, dateTo]);

  // City filter is client-side for fast feedback
  const displayed = useMemo(() => {
    if (!city.trim()) return leads;
    const q = city.trim().toLowerCase();
    return leads.filter(r => (r.city || '').toLowerCase().includes(q));
  }, [leads, city]);

  const clearFilters = () => {
    setTier(''); setCity(''); setBtype(''); setDateFrom(''); setDateTo('');
  };

  const exportCsv = () => {
    const headers = ['Date', 'First Name', 'Last Name', 'Email', 'Phone', 'City', 'State', 'Building Type', 'Terrace (sqft)', 'Score', 'Tier', 'Email Sent', 'Report URL'];
    const rows = displayed.map(r => [
      fmt(r.created_at),
      r.first_name, r.last_name, r.email, r.phone,
      r.city, r.state || '', r.building_type, r.terrace_sqft || '',
      r.overall_score ?? '', r.readiness_tier,
      r.email_sent ? 'Yes' : 'No',
      r.assessment_id ? `https://sus10.ai/report/${r.assessment_id}` : '',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sus10-leads.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = tier || city || btype || dateFrom || dateTo;

  return (
    <AdminShell
      title="Leads"
      subtitle="Calculator assessment submissions"
      actions={
        <>
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          <Button size="sm" variant="outline" onClick={fetchLeads}><RefreshCw className="h-4 w-4" /></Button>
        </>
      }
    >
      {/* Summary strip */}
      <div className="text-xs text-muted-foreground mb-3">
        <span className="font-medium text-foreground">{total.toLocaleString()}</span> total
        {' · '}
        <span className="font-medium text-foreground">{thisWeek}</span> this week
        {' · '}
        <span className="font-medium text-foreground">{today}</span> today
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        {/* Tier */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Tier</div>
          <select
            value={tier}
            onChange={e => setTier(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All tiers</option>
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* City search */}
        <div className="relative">
          <div className="text-xs text-muted-foreground mb-1">City</div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Filter city…" className="pl-8 w-36 h-8 text-sm" />
          </div>
        </div>

        {/* Building type */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Building type</div>
          <select
            value={btype}
            onChange={e => setBtype(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All types</option>
            {BUILDING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Date range */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">From</div>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm w-36" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">To</div>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm w-36" />
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline self-end pb-1">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-2 border-b text-xs text-muted-foreground">
            Showing {displayed.length.toLocaleString()} of {total.toLocaleString()}
          </div>
          {loading ? (
            <div className="py-12 flex justify-center text-sm text-muted-foreground">Loading…</div>
          ) : displayed.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No results.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Emailed</TableHead>
                    <TableHead>Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map(r => (
                    <TableRow key={r.assessment_id || r.email}>
                      <TableCell className="text-xs whitespace-nowrap">{fmt(r.created_at)}</TableCell>
                      <TableCell className="text-sm">{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{r.email || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {r.phone ? (
                          <span className="inline-flex items-center gap-1.5">
                            {r.phone}
                            {r.wa_number && (
                              <a href={`https://wa.me/${r.wa_number}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500" title="WhatsApp">
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{r.city || '—'}</TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">{r.building_type || '—'}</TableCell>
                      <TableCell className="text-sm font-medium">{r.overall_score ?? '—'}</TableCell>
                      <TableCell>
                        {r.readiness_tier
                          ? <span className={`text-xs font-medium ${TIER_COLORS[r.readiness_tier] || ''}`}>{r.readiness_tier}</span>
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {r.email_sent
                          ? <span className="text-emerald-500 text-xs font-medium">✓ Sent</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {r.assessment_id ? (
                          <a href={`/report/${r.assessment_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400">
                            Report <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
