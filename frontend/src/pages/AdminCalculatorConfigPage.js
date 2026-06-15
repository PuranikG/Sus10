import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, Check, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { apiRequest } from '../lib/utils';
import AdminShell from '../components/layout/AdminShell';

export default function AdminCalculatorConfigPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openPages, setOpenPages] = useState({ 0: true });

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/admin/calculator-config');
      setConfig(data);
    } catch (e) {
      setError(e.message || 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  if (loading) {
    return (
      <AdminShell title="Calculator Config" subtitle="Edit questions, labels and options for the homeowner assessment">
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AdminShell>
    );
  }
  if (error) {
    return (
      <AdminShell title="Calculator Config" subtitle="Edit questions, labels and options for the homeowner assessment">
        <div className="text-center py-20">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={loadConfig}>Retry</Button>
        </div>
      </AdminShell>
    );
  }

  const pages = config?.pages || [];

  return (
    <AdminShell
      title="Calculator Config"
      subtitle="Edit labels, options, and help text for the homeowner assessment. Scores are read-only."
    >
      <div className="space-y-4">
        {pages.map((page, pi) => (
          <Card key={pi}>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setOpenPages(prev => ({ ...prev, [pi]: !prev[pi] }))}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {openPages[pi] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Page {pi + 1}: {page.title}
                  <Badge variant="outline" className="text-xs">{(page.questions || []).length} questions</Badge>
                </CardTitle>
              </div>
            </CardHeader>
            {openPages[pi] && (
              <CardContent className="space-y-4 pt-0">
                {(page.questions || []).map((q) => (
                  <QuestionEditor key={q.id} question={q} />
                ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}

function QuestionEditor({ question: initialQ }) {
  const [q, setQ] = useState(initialQ);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const isDirty = JSON.stringify(q) !== JSON.stringify(initialQ);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const payload = { label: q.label };
      if (q.helper_text !== undefined) payload.helper_text = q.helper_text;
      if (q.options) payload.options = q.options;
      await apiRequest(`/admin/calculator-config/question/${q.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateOptionLabel = (idx, newLabel) => {
    setQ(prev => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i !== idx ? opt : (typeof opt === 'string' ? newLabel : { ...opt, label: newLabel })
      ),
    }));
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          {/* ID + type badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{q.id}</code>
            <Badge variant="secondary" className="text-xs capitalize">{q.type}</Badge>
            {q.scored && <Badge className="text-xs bg-emerald-600 text-white">Scored</Badge>}
            {q.show_when && (
              <Badge variant="outline" className="text-xs">show_when: {q.show_when.join(', ')}</Badge>
            )}
          </div>

          {/* Label */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1">Question label</Label>
            <Input
              value={q.label || ''}
              onChange={e => setQ(prev => ({ ...prev, label: e.target.value }))}
              placeholder="Question label"
            />
          </div>

          {/* Helper text */}
          {('helper_text' in q) && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Helper text</Label>
              <Input
                value={q.helper_text || ''}
                onChange={e => setQ(prev => ({ ...prev, helper_text: e.target.value }))}
                placeholder="Optional helper text shown below label"
              />
            </div>
          )}

          {/* Options — editable labels, read-only scores */}
          {q.options && q.options.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Options</Label>
              <div className="space-y-1.5">
                {q.options.map((opt, idx) => {
                  const label = typeof opt === 'string' ? opt : opt.label;
                  const score = typeof opt === 'object' ? opt.score : undefined;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        className="flex-1 h-8 text-sm"
                        value={label}
                        onChange={e => updateOptionLabel(idx, e.target.value)}
                      />
                      {score !== undefined && (
                        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap min-w-[60px] text-right">
                          score: {score}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
          {saved && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Saved ✓
            </span>
          )}
          {saveError && (
            <span className="text-xs text-destructive">{saveError}</span>
          )}
        </div>
      </div>
    </div>
  );
}
