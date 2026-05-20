import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { apiRequest } from '../../lib/utils';
import { toast } from 'sonner';

const SEVERITIES = [
  { value: 'low', label: 'Low — info', cls: 'bg-slate-100 text-slate-800 border-slate-300' },
  { value: 'medium', label: 'Medium — caveat', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
  { value: 'high', label: 'High — blocker', cls: 'bg-red-100 text-red-900 border-red-300' },
];

function humanizeTag(tag) {
  return (tag || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Per-building intel notes editor (Option D).
 * Opens as a Dialog. Lists current notes with delete, allows adding new note
 * with tag (from vocabulary) + severity + free-text note.
 */
export default function IntelNotesEditor({ open, onOpenChange, building }) {
  const [tags, setTags] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tag: '', severity: 'medium', note: '' });

  const buildingId = building?.building_id;

  useEffect(() => {
    if (!open) return;
    apiRequest('/admin/intelligence/tags')
      .then((r) => setTags(r?.tags || []))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open || !buildingId) return;
    setLoading(true);
    apiRequest(`/admin/buildings/${buildingId}/intel`)
      .then((r) => setNotes(r?.intel_notes || []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [open, buildingId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.tag || !form.note.trim()) {
      toast.error('Pick a tag and write a short note.');
      return;
    }
    setSaving(true);
    try {
      const created = await apiRequest(`/admin/buildings/${buildingId}/intel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setNotes((n) => [...n, created]);
      setForm({ tag: '', severity: 'medium', note: '' });
      toast.success('Note added');
    } catch (err) {
      toast.error(err?.message || 'Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm('Delete this intel note?')) return;
    try {
      await apiRequest(`/admin/buildings/${buildingId}/intel/${noteId}`, { method: 'DELETE' });
      setNotes((n) => n.filter((x) => x.note_id !== noteId));
      toast.success('Note removed');
    } catch (err) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  if (!building) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="intel-editor-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Intelligence notes
          </DialogTitle>
          <DialogDescription className="truncate">
            {building.address || building.name} · <span className="text-muted-foreground">{building.city}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Current notes
            </div>
            {loading ? (
              <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : notes.length === 0 ? (
              <div className="text-sm text-muted-foreground italic py-3 px-3 border rounded-md">
                No intel yet. Add the first note below — it will show up as a warning badge on this building's public report.
              </div>
            ) : (
              <ul className="space-y-2">
                {notes.map((n) => {
                  const sev = SEVERITIES.find((s) => s.value === n.severity) || SEVERITIES[1];
                  return (
                    <li key={n.note_id} className="flex items-start gap-2 p-3 rounded-md border" data-testid={`intel-row-${n.note_id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline">{humanizeTag(n.tag)}</Badge>
                          <Badge className={sev.cls + ' border'}>{sev.value}</Badge>
                          {n.author && <span className="text-[10px] text-muted-foreground">by {n.author}</span>}
                        </div>
                        <p className="text-sm text-foreground/90 leading-snug">{n.note}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(n.note_id)} data-testid={`intel-delete-${n.note_id}`}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <form onSubmit={handleAdd} className="border-t pt-4 space-y-3" data-testid="intel-add-form">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add new note</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="intel-tag" className="text-xs mb-1.5 block">Tag</Label>
                <Select value={form.tag} onValueChange={(v) => setForm((f) => ({ ...f, tag: v }))}>
                  <SelectTrigger id="intel-tag" data-testid="intel-tag-select"><SelectValue placeholder="Pick a tag…" /></SelectTrigger>
                  <SelectContent>
                    {tags.map((t) => <SelectItem key={t} value={t}>{humanizeTag(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="intel-severity" className="text-xs mb-1.5 block">Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}>
                  <SelectTrigger id="intel-severity" data-testid="intel-severity-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="intel-note" className="text-xs mb-1.5 block">Note (shown on public report)</Label>
              <Textarea
                id="intel-note"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Short, factual. E.g. Heritage Grade-IIA — no structural roof changes allowed without UMC approval."
                rows={3}
                data-testid="intel-note-textarea"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving} data-testid="intel-add-submit">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Plus className="h-4 w-4 mr-2" /> Add note</>}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
