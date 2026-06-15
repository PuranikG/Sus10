import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, Check, X, ChevronRight, Filter, Search, RefreshCw, ChevronLeft, AlertTriangle,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { apiRequest, formatNumber } from '../lib/utils';
import AdminShell from '../components/layout/AdminShell';
import IntelNotesEditor from '../components/admin/IntelNotesEditor';
import { toast } from 'sonner';

const BUILDING_TYPES = [
  { value: 'it_park', label: 'IT Park' },
  { value: 'mall', label: 'Mall' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'college', label: 'College' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'government', label: 'Government' },
  { value: 'residential', label: 'Residential' },
];

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AdminBuildingsPage() {
  const [status, setStatus] = useState(() => {
    if (typeof window === 'undefined') return 'pending';
    const sp = new URLSearchParams(window.location.search);
    return sp.get('status') || 'pending';
  });
  const [city, setCity] = useState('');
  const [search, setSearch] = useState('');
  const [types, setTypes] = useState([]);
  const [sort, setSort] = useState('created_at_desc');
  const [page, setPage] = useState(1);
  const limit = 50;

  const [buildings, setBuildings] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [intelTarget, setIntelTarget] = useState(null); // {building_id, address, city, name} when editor open

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('status', status);
    sp.set('sort', sort);
    sp.set('page', String(page));
    sp.set('limit', String(limit));
    if (city) sp.set('city', city);
    if (search) sp.set('q', search);
    if (types.length) sp.set('building_type', types.join(','));
    return sp.toString();
  }, [status, sort, page, city, search, types]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiRequest(`/admin/buildings?${queryString}`);
      setBuildings(r?.buildings || []);
      setTotal(r?.total || 0);
      setCounts(r?.counts || {});
      setSelectedIds(new Set());
    } catch (err) {
      toast.error('Failed to load buildings');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleType = (t) => {
    setPage(1);
    setTypes((prev) => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === buildings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(buildings.map(b => b.building_id)));
    }
  };

  const handleApprove = async (id) => {
    try {
      await apiRequest(`/admin/buildings/${id}/approve`, { method: 'PUT' });
      toast.success('Building approved');
      fetchData();
    } catch (e) { toast.error('Approve failed'); }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejecting? (optional)') || '';
    try {
      await apiRequest(`/admin/buildings/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
      });
      toast.success('Building rejected');
      fetchData();
    } catch (e) { toast.error('Reject failed'); }
  };

  const handleBulk = async (action) => {
    if (selectedIds.size === 0) return toast.error('Select at least one building first');
    let reason;
    if (action === 'reject') {
      reason = window.prompt(`Reason for rejecting ${selectedIds.size} buildings? (optional)`) || '';
    }
    try {
      const r = await apiRequest('/admin/buildings/bulk-action', {
        method: 'POST',
        body: JSON.stringify({
          building_ids: Array.from(selectedIds),
          action,
          reason,
        }),
      });
      toast.success(`${action === 'approve' ? 'Approved' : 'Rejected'} ${r.modified} buildings`);
      fetchData();
    } catch (e) { toast.error('Bulk action failed'); }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AdminShell
      title="Buildings"
      subtitle="Triage discovered buildings, approve or reject, edit details."
      actions={
        <>
          <Link to="/admin/discover">
            <Button variant="outline" size="sm" data-testid="admin-buildings-go-discover">
              <Search className="h-4 w-4 mr-2" /> Discover
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchData} data-testid="admin-buildings-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </>
      }
    >
      {/* Status tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto" data-testid="admin-buildings-status-tabs">
        {STATUS_TABS.map((t) => {
          const n = t.value === 'all' ? counts.total : counts[t.value];
          const active = status === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => { setStatus(t.value); setPage(1); }}
              data-testid={`status-tab-${t.value}`}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'
              }`}
            >
              {t.label}{typeof n === 'number' ? ` · ${formatNumber(n)}` : ''}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <Card className="mb-4">
        <CardContent className="p-4 grid md:grid-cols-[1fr_1fr_180px_auto] gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Search address</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="e.g. Mindspace, DLF…"
                className="pl-8"
                data-testid="admin-buildings-search-input"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">City</label>
            <Input
              value={city}
              onChange={(e) => { setCity(e.target.value); setPage(1); }}
              placeholder="Mumbai, Pune…"
              data-testid="admin-buildings-city-input"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sort</label>
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
              <SelectTrigger data-testid="admin-buildings-sort"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at_desc">Newest first</SelectItem>
                <SelectItem value="created_at_asc">Oldest first</SelectItem>
                <SelectItem value="city_asc">City (A–Z)</SelectItem>
                <SelectItem value="area_desc">Largest area</SelectItem>
                <SelectItem value="area_asc">Smallest area</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {(city || search || types.length > 0) && (
              <Button
                variant="ghost" size="sm"
                onClick={() => { setCity(''); setSearch(''); setTypes([]); setPage(1); }}
                data-testid="admin-buildings-clear-filters"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Type chips */}
          <div className="md:col-span-4 flex flex-wrap gap-2 pt-1">
            <span className="text-xs text-muted-foreground inline-flex items-center mr-1">
              <Filter className="h-3 w-3 mr-1" /> Type:
            </span>
            {BUILDING_TYPES.map((t) => {
              const active = types.includes(t.value);
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggleType(t.value)}
                  data-testid={`type-chip-${t.value}`}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-20 mb-3 flex items-center justify-between rounded-lg border bg-card shadow-sm px-4 py-2.5">
          <div className="text-sm">
            <span className="font-medium" data-testid="bulk-selected-count">{selectedIds.size}</span> selected
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulk('reject')} data-testid="bulk-reject-btn">
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button size="sm" onClick={() => handleBulk('approve')} data-testid="bulk-approve-btn">
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="text-sm text-muted-foreground" data-testid="admin-buildings-count">
              {loading ? 'Loading…' :
                `Showing ${buildings.length.toLocaleString()} of ${total.toLocaleString()} buildings`}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 text-xs" data-testid="admin-buildings-pagination">
                <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>Page {page} of {totalPages}</span>
                <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Table data-testid="admin-buildings-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]">
                    <Checkbox
                      checked={buildings.length > 0 && selectedIds.size === buildings.length}
                      onCheckedChange={toggleSelectAll}
                      data-testid="select-all-checkbox"
                    />
                  </TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Type</TableHead>
                  {/* OPEN-021: add per-building inline-edit for building_type and area fields */}
                  <TableHead className="text-right">Area (sq ft)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      No buildings match these filters
                    </TableCell>
                  </TableRow>
                ) : buildings.map((b) => {
                  const rejected = b.is_rejected;
                  const approved = b.is_approved && !rejected;
                  const pending = !approved && !rejected;
                  return (
                    <TableRow key={b.building_id} data-testid={`row-${b.building_id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(b.building_id)}
                          onCheckedChange={() => toggleSelect(b.building_id)}
                          data-testid={`select-${b.building_id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-[260px] truncate" title={b.address}>{b.address}</TableCell>
                      <TableCell>{b.city}</TableCell>
                      <TableCell className="capitalize">{b.building_type?.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-right">{b.usable_terrace_area ? Math.round(b.usable_terrace_area * 10.764).toLocaleString() : '—'}</TableCell>
                      <TableCell>
                        {approved && <Badge className="bg-green-600">Approved</Badge>}
                        {rejected && <Badge variant="destructive">Rejected</Badge>}
                        {pending && <Badge variant="outline">Pending</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {!approved && (
                            <Button size="sm" variant="outline" onClick={() => handleApprove(b.building_id)} data-testid={`approve-${b.building_id}`}>
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {!rejected && (
                            <Button size="sm" variant="outline" onClick={() => handleReject(b.building_id)} data-testid={`reject-${b.building_id}`}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm" variant="outline"
                            onClick={() => setIntelTarget(b)}
                            data-testid={`intel-${b.building_id}`}
                            title={`Intel notes (${(b.intel_notes || []).length})`}
                          >
                            <AlertTriangle className="h-4 w-4" />
                            {(b.intel_notes || []).length > 0 && (
                              <span className="ml-1 text-[10px] font-semibold">{b.intel_notes.length}</span>
                            )}
                          </Button>
                          <Link to={`/buildings/${b.building_id}`}>
                            <Button size="sm" variant="ghost"><ChevronRight className="h-4 w-4" /></Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <IntelNotesEditor
        open={!!intelTarget}
        onOpenChange={(o) => { if (!o) { setIntelTarget(null); fetchData(); } }}
        building={intelTarget}
      />
    </AdminShell>
  );
}
