import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { apiRequest } from '../lib/utils';
import AdminShell from '../components/layout/AdminShell';

const ACTION_BADGE = {
  'building.approve': 'bg-green-600',
  'building.bulk_approve': 'bg-green-600',
  'building.reject': 'bg-red-500',
  'building.bulk_reject': 'bg-red-500',
  'intel.add': 'bg-blue-500',
};

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('limit', String(limit));
      if (q) sp.set('q', q);
      const r = await apiRequest(`/admin/audit?${sp.toString()}`);
      setEntries(r?.entries || []);
      setTotal(r?.total || 0);
    } finally { setLoading(false); }
  };
  useEffect(() => { fetch(); /* eslint-disable-next-line */ }, [page, q]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AdminShell
      title="Audit Log"
      subtitle="Every admin mutation — approvals, rejections, intel notes — tracked here."
      actions={
        <Button size="sm" variant="outline" onClick={fetch} data-testid="audit-refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      }
    >
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Filter by user / action / resource id"
                className="pl-8"
                data-testid="audit-filter-input"
              />
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground" data-testid="audit-count">
                {loading ? 'Loading…' : `${entries.length.toLocaleString()} of ${total.toLocaleString()} events`}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <span>Page {page} of {totalPages}</span>
                  <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          </div>
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              No audit events yet. They'll appear here as admins approve, reject, or annotate buildings.
            </div>
          ) : (
            <Table data-testid="audit-table">
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.audit_id} data-testid={`audit-row-${e.audit_id}`}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {e.created_at ? new Date(e.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{e.user_email || e.user_id || '—'}</TableCell>
                    <TableCell>
                      <Badge className={ACTION_BADGE[e.action] || 'bg-muted text-foreground'}>{e.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {e.resource_type}
                      {e.resource_id ? ` · ${e.resource_id.slice(0, 14)}…` : ''}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate" title={JSON.stringify(e.metadata)}>
                      {e.metadata && Object.keys(e.metadata).length > 0 ? JSON.stringify(e.metadata) : '—'}
                    </TableCell>
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
