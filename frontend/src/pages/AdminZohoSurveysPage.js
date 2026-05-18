import { useEffect, useState } from 'react';
import { Loader2, Inbox, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { apiRequest } from '../lib/utils';
import AdminShell from '../components/layout/AdminShell';

export default function AdminZohoSurveysPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await apiRequest('/admin/zoho-survey-responses?limit=200');
      setItems(r?.responses || []);
      setTotal(r?.total || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <AdminShell
      title="Zoho Survey Responses"
      subtitle="Webhook payloads from your Zoho surveys (most recent first)"
      actions={
        <Button size="sm" variant="outline" onClick={fetchData} data-testid="surveys-refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      }
    >
      <Card className="mb-5">
        <CardContent className="p-5 text-sm space-y-2">
          <div className="font-medium">Configure Zoho Survey webhook</div>
          <p className="text-muted-foreground">
            In each Zoho Survey → <strong>Hub</strong> → <strong>Integrations</strong> → <strong>Webhook</strong>, set the POST URL to:
          </p>
          <code className="block bg-muted p-2 rounded font-mono text-xs">
            {(process.env.REACT_APP_BACKEND_URL || '') + '/api/webhooks/zoho-survey'}
          </code>
          <p className="text-xs text-muted-foreground">
            Responses land here automatically. Any email field in the payload is auto-added to the beta waitlist.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="text-sm text-muted-foreground mb-4">
            <Inbox className="h-4 w-4 inline mr-1" />
            {loading ? 'Loading…' : `${items.length.toLocaleString()} of ${total.toLocaleString()} responses`}
          </div>
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No survey responses yet. Configure the webhook URL above in Zoho.
            </div>
          ) : (
            <div className="space-y-3" data-testid="surveys-list">
              {items.map((s) => (
                <details key={s.response_id} className="border rounded-lg p-3 bg-card">
                  <summary className="cursor-pointer text-sm font-medium flex justify-between gap-3">
                    <span className="truncate">{s.response_id}</span>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {s.received_at ? new Date(s.received_at).toLocaleString('en-IN') : ''}
                    </span>
                  </summary>
                  <pre className="mt-3 text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(s.payload || {}, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
