import { useEffect, useState } from 'react';
import { ExternalLink, MessageCircle, RefreshCw, Download, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
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
  'Explorer':                 'text-red-400',
  'Getting Ready':            'text-amber-400',
  'Action Ready':             'text-emerald-400',
  'Sustainability Champion':  'text-green-400',
};
const COMB_DIMS = [
  { key: 'scores_capacity',   label: 'Capacity',   dot: 'bg-blue-400' },
  { key: 'scores_motivation', label: 'Motivation', dot: 'bg-purple-400' },
  { key: 'scores_interest',   label: 'Interest',   dot: 'bg-teal-400' },
  { key: 'scores_barriers',   label: 'Barriers',   dot: 'bg-orange-400' },
];
const PER_PAGE = 50;

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ScorePill({ label, value, dot }) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 bg-muted text-xs">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value ?? '—'}</span>
    </span>
  );
}

export default function AdminLeadsPage() {
  const [leads, setLeads]               = useState([]);
  const [total, setTotal]               = useState(0);
  const [today, setToday]               = useState(0);
  const [thisWeek, setThisWeek]         = useState(0);
  const [explorerCount, setExplorerCount]         = useState(0);
  const [actionReadyCount, setActionReadyCount]   = useState(0);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);
  const [expanded, setExpanded]         = useState(new Set());

  // Filters
  const [tier, setTier]         = useState('');
  const [city, setCity]         = useState('');
  const [btype, setBtype]       = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const totalPages = Math.ceil(total / PER_PAGE);

  const fetchLeads = async (p = 1) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({ page: p, limit: PER_PAGE });
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
      setExplorerCount(r?.explorer_count || 0);
      setActionReadyCount(r?.action_ready_count || 0);
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 and refetch when filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); fetchLeads(1); }, [tier, city, btype, dateFrom, dateTo]);

  const clearFilters = () => {
    setTier(''); setCity(''); setBtype(''); setDateFrom(''); setDateTo('');
  };

  const goToPage = (p) => {
    setPage(p);
    fetchLeads(p);
  };

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportCsv = async () => {
    // Fetch all records (up to 5000) for export
    const sp = new URLSearchParams({ page: 1, limit: 5000 });
    if (tier)     sp.set('tier', tier);
    if (city)     sp.set('city', city);
    if (btype)    sp.set('building_type', btype);
    if (dateFrom) sp.set('date_from', dateFrom);
    if (dateTo)   sp.set('date_to', dateTo);
    const r = await apiRequest(`/admin/leads?${sp.toString()}`);
    const allLeads = r?.leads || [];

    const headers = ['Date', 'First Name', 'Last Name', 'Email', 'Phone', 'City', 'State',
                     'Building Type', 'Terrace (sqft)', 'Score', 'Tier', 'Email Sent', 'Report URL'];
    const rows = allLeads.map(row => [
      fmt(row.created_at),
      row.first_name, row.last_name, row.email, row.phone,
      row.city, row.state || '', row.building_type, row.terrace_sqft || '',
      row.overall_score ?? '', row.readiness_tier,
      row.email_sent ? 'Yes' : 'No',
      row.assessment_id ? `https://sus10.ai/report/${row.assessment_id}` : '',
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
          <Button size="sm" variant="outline" onClick={() => fetchLeads(page)}><RefreshCw className="h-4 w-4" /></Button>
        </>
      }
    >
      {/* Summary strip */}
      <div className="text-xs text-muted-foreground mb-3 flex flex-wrap gap-x-3 gap-y-1">
        <span><span className="font-medium text-foreground">{total.toLocaleString()}</span> total</span>
        <span>·</span>
        <span><span className="font-medium text-foreground">{thisWeek}</span> this week</span>
        <span>·</span>
        <span><span className="font-medium text-foreground">{today}</span> today</span>
        <span>·</span>
        <span><span className="font-medium text-red-400">{explorerCount}</span> Explorer</span>
        <span>·</span>
        <span><span className="font-medium text-emerald-400">{actionReadyCount}</span> Action&nbsp;Ready+</span>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 mb-4 items-end">
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

        <div className="relative">
          <div className="text-xs text-muted-foreground mb-1">City</div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Filter city…" className="pl-8 w-36 h-8 text-sm" />
          </div>
        </div>

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
            Showing {leads.length} of {total.toLocaleString()}
            {totalPages > 1 && <span className="ml-1">(page {page} of {totalPages})</span>}
          </div>
          {loading ? (
            <div className="py-12 flex justify-center text-sm text-muted-foreground">Loading…</div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No results.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
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
                  {leads.map(r => {
                    const isExpanded = expanded.has(r.assessment_id);
                    return (
                      <>
                        <TableRow
                          key={r.assessment_id || r.email}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpand(r.assessment_id)}
                        >
                          <TableCell className="w-8 px-2">
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{fmt(r.created_at)}</TableCell>
                          <TableCell className="text-sm">{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{r.email || '—'}</TableCell>
                          <TableCell className="text-xs">
                            {r.phone ? (
                              <span className="inline-flex items-center gap-1.5">
                                {r.phone}
                                {r.wa_number && (
                                  <a
                                    href={`https://wa.me/${r.wa_number}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-emerald-500"
                                    title="WhatsApp"
                                    onClick={e => e.stopPropagation()}
                                  >
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
                          <TableCell onClick={e => e.stopPropagation()}>
                            {r.assessment_id ? (
                              <a
                                href={`/report/${r.assessment_id}`}
                                target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400"
                              >
                                Report <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : '—'}
                          </TableCell>
                        </TableRow>

                        {/* Expandable detail row */}
                        {isExpanded && (
                          <TableRow key={`${r.assessment_id}-detail`} className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={11} className="p-4">
                              {/* COM-B scores */}
                              <div className="mb-3">
                                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">COM-B Scores</div>
                                <div className="flex flex-wrap gap-2">
                                  {COMB_DIMS.map(({ key, label, dot }) => (
                                    <ScorePill key={key} label={label} value={r[key]} dot={dot} />
                                  ))}
                                </div>
                              </div>

                              {/* Full answers */}
                              {r.answers_raw && Object.keys(r.answers_raw).length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Answers &amp; Inputs</div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1">
                                    {Object.entries(r.answers_raw)
                                      .filter(([, v]) => v !== null && v !== undefined && v !== '')
                                      .map(([k, v]) => (
                                        <div key={k} className="text-xs leading-relaxed">
                                          <span className="text-muted-foreground">{k}:</span>{' '}
                                          <span className="font-medium text-foreground">
                                            {Array.isArray(v) ? v.join(', ') : String(v)}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <div className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total.toLocaleString()} total
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => goToPage(1)}>«</Button>
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}>‹ Prev</Button>
            {/* Page number buttons — show a window around current page */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              return start + i;
            }).map(p => (
              <Button
                key={p}
                size="sm"
                variant={p === page ? 'default' : 'outline'}
                onClick={() => goToPage(p)}
                className="w-8"
              >
                {p}
              </Button>
            ))}
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Next ›</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => goToPage(totalPages)}>»</Button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
