import { useEffect, useState } from 'react';
import { Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { apiRequest } from '../lib/utils';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { toast } from 'sonner';
import AdminShell from '../components/layout/AdminShell';

export default function AdminFeatureFlagsPage() {
  const { refreshFlags } = useFeatureFlags();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/feature-flags').then((d) => { setFlags(d || []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggle = async (name, next) => {
    try {
      await apiRequest(`/admin/feature-flags/${name}`, { method: 'PUT', body: JSON.stringify({ is_enabled: next }) });
      setFlags((prev) => prev.map(f => f.name === name ? { ...f, is_enabled: next } : f));
      refreshFlags();
      toast.success(`"${name}" ${next ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update feature flag');
    }
  };

  return (
    <AdminShell title="Feature Flags" subtitle="Toggle product modules and experiments">
      <Card>
        <CardContent className="p-0 divide-y">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : flags.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No feature flags defined yet.</div>
          ) : flags.map((f) => (
            <div key={f.name} className="flex items-start justify-between gap-4 p-4" data-testid={`flag-${f.name}`}>
              <div className="min-w-0">
                <div className="font-medium flex items-center gap-2">
                  {f.is_enabled ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                  <code className="text-xs">{f.name}</code>
                </div>
                {f.description && <div className="text-sm text-muted-foreground mt-0.5">{f.description}</div>}
              </div>
              <Switch
                checked={!!f.is_enabled}
                onCheckedChange={(v) => toggle(f.name, v)}
                data-testid={`flag-switch-${f.name}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
