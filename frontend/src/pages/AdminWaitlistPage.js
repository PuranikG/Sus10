import { useEffect, useState, useMemo } from 'react';
import { Search, Loader2, Mail, RefreshCw, Download } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { apiRequest } from '../lib/utils';
import AdminShell from '../components/layout/AdminShell';

const PERSONA_LABELS = {
  citizen: 'Homeowner',
  'citizen-crisis': 'Homeowner — Crisis',
  rwa: 'RWA',
  vendor: 'Vendor',
  unspecified: 'Unspecified',
};

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState([]);
  const [byPersona, setByPersona] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [persona, setPersona] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (persona) sp.set('persona', persona);
      sp.set('limit', '1000');
      const r = await apiRequest(`/admin/beta-waitlist?${sp.toString()}`);
      setEntries(r?.entries || []);
      setByPersona(r?.by_persona || {});
      setTotal(r?.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [persona]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries;
    const q = filter.toLowerCase();
    return entries.filter(e =>
      (e.email || '').toLowerCase().includes(q)
      || (e.name || '').toLowerCase().includes(q)
      || (e.city || '').toLowerCase().includes(q)
      || (e.source || '').toLowerCase().includes(q)
    );
  }, [filter, entries]);

  const exportCsv = () => {
    const rows = [['email', 'name', 'persona', 'city', 'source', 'created_at']];
    filtered.forEach(e => rows.push([
      e.email || '', e.name || '', e.persona || '', e.city || '', e.source || '', e.created_at || '',
    ]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sus10-beta-waitlist.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <AdminShell
      title="Beta Waitlist"
      subtitle="Early signups from the persona teaser pages and Zoho surveys"
      actions={
        <>
          <Button size="sm" variant="outline" onClick={exportCsv} data-testid="waitlist-export-btn">
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={fetchData} data-testid="waitlist-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <button
          type="button"
          onClick={() => setPersona('')}
          className={`text-left rounded-xl border p-4 transition-colors ${persona === '' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
          data-testid="persona-filter-all"
        >
          <div className="text-2xl font-bold">{total.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">All signups</div>
        </button>
        {Object.entries(byPersona).map(([key, n]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPersona(key === 'unspecified' ? '' : key)}
            className={`text-left rounded-xl border p-4 transition-colors ${persona === key ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
            data-testid={`persona-filter-${key}`}
          >
            <div className="text-2xl font-bold">{n.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">{PERSONA_LABELS[key] || key}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by email / name / city / source"
                className="pl-8"
                data-testid="waitlist-filter"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filtered.length.toLocaleString()} of {total.toLocaleString()}
            </div>
          </div>
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Table data-testid="waitlist-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No signups yet — share the teasers to start collecting!</TableCell></TableRow>
                ) : filtered.map((e) => (
                  <TableRow key={e.waitlist_id || e.email} data-testid={`row-${e.email}`}>
                    <TableCell className="font-mono text-xs flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{e.email}</TableCell>
                    <TableCell>{e.name || '—'}</TableCell>
                    <TableCell>
                      {e.persona ? <Badge variant="outline" className="capitalize">{PERSONA_LABELS[e.persona] || e.persona}</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{e.city || '—'}</TableCell>
                    <TableCell className="text-xs">{e.source || '—'}</TableCell>
                    <TableCell className="text-xs">{e.created_at ? new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
