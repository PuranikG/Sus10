import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { apiRequest } from '../lib/utils';
import { toast } from 'sonner';
import AdminShell from '../components/layout/AdminShell';

const TYPES = ['cfa', 'subsidy', 'loan', 'tax_credit', 'net_metering'];
const CATEGORIES = ['solar', 'biogas', 'rainwater', 'greening'];
const SCOPES = ['central', 'state', 'city'];

const blank = () => ({
  name: '', scheme_code: '', authority: '', type: 'subsidy',
  category: ['solar'], geo_scope: 'central', state: '', city: '',
  eligible_building_types: [],
  benefit_summary: '', benefit_details_markdown: '',
  max_amount_inr: '', rate_or_percent: '',
  application_url: '', documents_required: [],
  is_active: true, notes_for_admin: '',
});

export default function AdminSubsidiesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await apiRequest('/admin/subsidies?limit=500');
      setItems(r?.subsidies || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const startNew = () => { setEditing(blank()); setOpen(true); };
  const startEdit = (s) => { setEditing({ ...s }); setOpen(true); };

  const save = async () => {
    const payload = {
      ...editing,
      max_amount_inr: editing.max_amount_inr === '' ? null : Number(editing.max_amount_inr),
    };
    try {
      if (editing.subsidy_id) {
        await apiRequest(`/admin/subsidies/${editing.subsidy_id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Subsidy updated');
      } else {
        await apiRequest('/admin/subsidies', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Subsidy created');
      }
      setOpen(false);
      fetch();
    } catch (e) {
      toast.error(e.message || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this subsidy?')) return;
    try {
      await apiRequest(`/admin/subsidies/${id}`, { method: 'DELETE' });
      toast.success('Subsidy deleted');
      fetch();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const toggleCategory = (cat) => {
    const has = editing.category.includes(cat);
    setEditing({ ...editing, category: has ? editing.category.filter(c => c !== cat) : [...editing.category, cat] });
  };

  return (
    <AdminShell
      title="Subsidies & Financing"
      subtitle="Curated catalogue powering the public /subsidies page."
      actions={
        <>
          <Button size="sm" variant="outline" onClick={fetch} data-testid="subsidies-admin-refresh"><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={startNew} data-testid="subsidies-admin-new"><Plus className="h-4 w-4 mr-1" /> New</Button>
        </>
      }
    >
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b text-sm text-muted-foreground" data-testid="subsidies-admin-count">
            {loading ? 'Loading…' : `${items.length.toLocaleString()} entries`}
          </div>
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Authority</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(s => (
                  <TableRow key={s.subsidy_id} data-testid={`subsidy-row-${s.subsidy_id}`}>
                    <TableCell className="font-medium max-w-[320px]">
                      <div className="truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.scheme_code}</div>
                    </TableCell>
                    <TableCell className="text-xs">{s.authority}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{s.type}</Badge></TableCell>
                    <TableCell className="text-xs capitalize">
                      {s.geo_scope}{s.state ? ` · ${s.state}` : s.city ? ` · ${s.city}` : ''}
                    </TableCell>
                    <TableCell>{s.is_active ? <Badge className="bg-green-600">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        {s.application_url && (
                          <a href={s.application_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
                          </a>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => startEdit(s)} data-testid={`edit-${s.subsidy_id}`}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(s.subsidy_id)} data-testid={`delete-${s.subsidy_id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="subsidy-editor">
            <DialogHeader>
              <DialogTitle>{editing.subsidy_id ? 'Edit subsidy' : 'New subsidy'}</DialogTitle>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Name *</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Scheme code</Label>
                <Input value={editing.scheme_code || ''} onChange={(e) => setEditing({ ...editing, scheme_code: e.target.value })} placeholder="PMSGMBY, MNRE_CFA..." />
              </div>
              <div>
                <Label>Authority *</Label>
                <Input value={editing.authority} onChange={(e) => setEditing({ ...editing, authority: e.target.value })} placeholder="MNRE / SBI / BBMP..." />
              </div>
              <div>
                <Label>Type *</Label>
                <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scope</Label>
                <Select value={editing.geo_scope} onValueChange={(v) => setEditing({ ...editing, geo_scope: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCOPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>State</Label>
                <Input value={editing.state || ''} onChange={(e) => setEditing({ ...editing, state: e.target.value })} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={editing.city || ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Categories</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCategory(c)}
                      className={`text-xs px-2.5 py-1 rounded-full border capitalize transition-colors ${
                        editing.category.includes(c) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'
                      }`}
                    >{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Max amount (INR)</Label>
                <Input type="number" value={editing.max_amount_inr || ''} onChange={(e) => setEditing({ ...editing, max_amount_inr: e.target.value })} />
              </div>
              <div>
                <Label>Rate / Percent</Label>
                <Input value={editing.rate_or_percent || ''} onChange={(e) => setEditing({ ...editing, rate_or_percent: e.target.value })} placeholder="30% CFA, 9.65% p.a..." />
              </div>
              <div className="md:col-span-2">
                <Label>One-line benefit summary *</Label>
                <Input value={editing.benefit_summary} onChange={(e) => setEditing({ ...editing, benefit_summary: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Full details (markdown supported)</Label>
                <Textarea rows={6} value={editing.benefit_details_markdown} onChange={(e) => setEditing({ ...editing, benefit_details_markdown: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Application URL</Label>
                <Input value={editing.application_url || ''} onChange={(e) => setEditing({ ...editing, application_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <Label>Documents required (one per line)</Label>
                <Textarea
                  rows={3}
                  value={(editing.documents_required || []).join('\n')}
                  onChange={(e) => setEditing({ ...editing, documents_required: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Published</Label>
              </div>
              <div className="md:col-span-2">
                <Label>Notes for admin (private)</Label>
                <Textarea rows={2} value={editing.notes_for_admin || ''} onChange={(e) => setEditing({ ...editing, notes_for_admin: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} data-testid="subsidy-save-btn">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminShell>
  );
}
