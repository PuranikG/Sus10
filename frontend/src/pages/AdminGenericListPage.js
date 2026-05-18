import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Inbox, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { apiRequest } from '../lib/utils';
import AdminShell from '../components/layout/AdminShell';

/**
 * Generic admin list page used by Projects/Initiatives/Leads/Providers.
 * Tries the standard admin endpoint first, falls back to the public one.
 */
export default function AdminGenericListPage({
  title, subtitle, endpoint, fallbackEndpoint, columns, getId, linkTo,
  emptyHint,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const tryFetch = async () => {
      setLoading(true);
      try {
        let data;
        try {
          data = await apiRequest(endpoint);
        } catch {
          if (fallbackEndpoint) data = await apiRequest(fallbackEndpoint);
          else throw new Error('Failed to load');
        }
        const list = Array.isArray(data) ? data : (data?.items || data?.entries || data?.projects || data?.initiatives || data?.leads || data?.groups || []);
        if (alive) setItems(list);
      } catch (e) {
        if (alive) setError(e.message || 'Could not load');
      } finally {
        if (alive) setLoading(false);
      }
    };
    tryFetch();
    return () => { alive = false; };
  }, [endpoint, fallbackEndpoint]);

  return (
    <AdminShell title={title} subtitle={subtitle}>
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b text-sm text-muted-foreground" data-testid="generic-list-count">
            {loading ? 'Loading…' : `${items.length.toLocaleString()} items`}
          </div>
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : error ? (
            <div className="py-12 text-center text-muted-foreground text-sm" data-testid="generic-list-error">
              <Inbox className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Inbox className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              {emptyHint || 'Nothing here yet.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => {
                  const id = getId ? getId(row) : (row.id || row._id || row.project_id || row.initiative_id);
                  return (
                    <TableRow key={id || JSON.stringify(row).slice(0, 50)} data-testid={`generic-row-${id || ''}`}>
                      {columns.map((c) => (
                        <TableCell key={c.key}>
                          {c.render ? c.render(row) : (row[c.key] ?? '—')}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        {linkTo ? (
                          <Link to={linkTo(row)}>
                            <Badge variant="outline" className="gap-1"><ChevronRight className="h-3 w-3" /></Badge>
                          </Link>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
