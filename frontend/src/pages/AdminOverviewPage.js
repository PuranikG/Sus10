import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, Inbox, Megaphone, Telescope, FileText, Sparkles, Loader2, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { apiRequest } from '../lib/utils';
import AdminShell from '../components/layout/AdminShell';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';

function StatCard({ label, value, icon: Icon, to, testid }) {
  return (
    <Link to={to} className="block" data-testid={testid}>
      <Card className="h-full hover:shadow-md transition-shadow border-border/70">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold leading-tight">{value ?? '—'}</div>
            <div className="text-xs text-muted-foreground truncate">{label}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AdminOverviewPage() {
  const [counts, setCounts] = useState({});
  const [waitlist, setWaitlist] = useState({ total: 0, by_persona: {} });
  const [surveysTotal, setSurveysTotal] = useState(0);
  const [seedingPersonas, setSeedingPersonas] = useState(false);
  const [seedingSubsidies, setSeedingSubsidies] = useState(false);
  const [pdfStats, setPdfStats] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);

  useEffect(() => {
    apiRequest('/admin/buildings?limit=1').then(r => setCounts(r?.counts || {})).catch(() => {});
    apiRequest('/admin/beta-waitlist?limit=1').then(r => setWaitlist(r || { total: 0, by_persona: {} })).catch(() => {});
    apiRequest('/admin/zoho-survey-responses?limit=1').then(r => setSurveysTotal(r?.total || 0)).catch(() => {});
    apiRequest('/admin/pdf-funnel-stats?days=30').then(r => setPdfStats(r)).catch(() => {});
    apiRequest('/admin/session-stats?days=7').then(r => setSessionStats(r)).catch(() => {});
  }, []);

  const handleSeedPersonas = async () => {
    setSeedingPersonas(true);
    try {
      const res = await apiRequest('/admin/cms/seed-persona-teasers', { method: 'POST' });
      toast.success(`Seeded ${res?.pages?.length || 4} persona teaser pages`);
    } catch (e) {
      toast.error(e?.message || 'Failed to seed persona teasers');
    } finally {
      setSeedingPersonas(false);
    }
  };

  const handleSeedSubsidies = async () => {
    setSeedingSubsidies(true);
    try {
      const res = await apiRequest('/admin/subsidies/seed', { method: 'POST' });
      toast.success(`Seeded subsidies — ${res?.active_subsidies || 0} active`);
    } catch (e) {
      toast.error(e?.message || 'Failed to seed subsidies');
    } finally {
      setSeedingSubsidies(false);
    }
  };

  return (
    <AdminShell
      title="Internal Console"
      subtitle="Operate Sus10 AI — review buildings, manage content, watch demand"
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending approval" value={counts.pending} icon={Building2} to="/admin/buildings?status=pending" testid="stat-pending" />
        <StatCard label="Approved buildings" value={counts.approved} icon={Building2} to="/admin/buildings?status=approved" testid="stat-approved" />
        <StatCard label="Beta waitlist signups" value={waitlist.total} icon={Mail} to="/admin/waitlist" testid="stat-waitlist" />
        <StatCard label="Zoho survey responses" value={surveysTotal} icon={Inbox} to="/admin/zoho-surveys" testid="stat-surveys" />
      </div>

      {/* Persona breakdown of waitlist */}
      {Object.keys(waitlist.by_persona || {}).length > 0 && (
        <Card className="mb-8">
          <CardContent className="p-5">
            <div className="text-sm font-medium mb-3">Waitlist signups by persona</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(waitlist.by_persona).map(([persona, n]) => (
                <div key={persona} className="rounded-lg border p-3 bg-muted/30">
                  <div className="text-lg font-semibold">{n}</div>
                  <div className="text-xs text-muted-foreground capitalize">{persona.replace(/-/g, ' ')}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF report funnel — last 30 days (Option C) */}
      {pdfStats && (
        <Card className="mb-8" data-testid="pdf-funnel-card">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  PDF report funnel · last {pdfStats.window_days} days
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Warm-lead funnel — every email-requested PDF auto-joins the beta waitlist.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-right">
                <div>
                  <div className="text-2xl font-bold" data-testid="pdf-window-total">{pdfStats.window_total}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Requests · {pdfStats.window_days}d</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{pdfStats.total_requests}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">All-time requests</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-500">{pdfStats.total_unique_emails}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Unique emails</div>
                </div>
              </div>
            </div>

            {pdfStats.timeseries?.length > 0 && (
              <div className="h-44 w-full" data-testid="pdf-funnel-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pdfStats.timeseries} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pdfGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis
                      dataKey="date"
                      fontSize={10}
                      tickFormatter={(d) => (d || '').slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis allowDecimals={false} fontSize={10} />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(v) => [v, 'Requests']}
                    />
                    <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#pdfGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Top personas</div>
                {pdfStats.by_persona?.length > 0 ? (
                  <ul className="space-y-1 text-sm" data-testid="pdf-funnel-personas">
                    {pdfStats.by_persona.slice(0, 5).map((p) => (
                      <li key={p.persona} className="flex justify-between items-center border-b py-1">
                        <span className="capitalize">{(p.persona || 'unknown').replace(/_/g, ' ')}</span>
                        <span className="font-medium">{p.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-muted-foreground italic">No persona data yet.</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Top buildings</div>
                {pdfStats.top_buildings?.length > 0 ? (
                  <ul className="space-y-1 text-sm" data-testid="pdf-funnel-buildings">
                    {pdfStats.top_buildings.map((b) => (
                      <li key={b.building_id} className="flex justify-between items-center border-b py-1 gap-2">
                        <Link to={`/buildings/${b.building_id}`} className="truncate hover:underline" title={b.name}>{b.name}</Link>
                        <span className="font-medium">{b.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-muted-foreground italic">No buildings yet.</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculator funnel sessions — last 7 days */}
      {sessionStats !== null && (
        <Card className="mb-8">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-primary" />
              <div className="text-sm font-medium">Calculator sessions · last {sessionStats.days} days</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="text-2xl font-bold">{sessionStats.starts}</div>
                <div className="text-xs text-muted-foreground">Sessions started</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="text-2xl font-bold text-emerald-500">{sessionStats.completes}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="text-2xl font-bold text-emerald-400">{sessionStats.completion_rate}%</div>
                <div className="text-xs text-muted-foreground">Completion rate</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="text-2xl font-bold text-amber-400">{sessionStats.abandon_rate}%</div>
                <div className="text-xs text-muted-foreground">Abandon rate</div>
              </div>
            </div>
            {sessionStats.abandon_by_page?.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Drop-off by page</div>
                <div className="flex flex-wrap gap-2">
                  {sessionStats.abandon_by_page.map(({ page, count }) => (
                    <span key={page} className="text-xs rounded bg-muted px-2 py-1">
                      Page {page ?? '?'}: <span className="font-semibold">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Production seed — one-shot idempotent buttons */}
      <Card className="mb-8 border-emerald-700/40 bg-emerald-950/20" data-testid="seed-card">
        <CardContent className="p-5">
          <div className="flex items-start gap-3 flex-wrap">
            <Sparkles className="h-5 w-5 text-emerald-400 mt-0.5" />
            <div className="flex-1 min-w-[260px]">
              <div className="font-medium text-emerald-50">Seed pre-launch content</div>
              <p className="text-xs text-muted-foreground mt-1">
                Idempotent — re-running is safe. Use this on a fresh production database to populate
                the 4 persona landing pages and the curated subsidies catalogue.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleSeedPersonas} disabled={seedingPersonas} data-testid="seed-personas-btn">
                {seedingPersonas ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                Seed persona teasers
              </Button>
              <Button size="sm" variant="outline" onClick={handleSeedSubsidies} disabled={seedingSubsidies} data-testid="seed-subsidies-btn">
                {seedingSubsidies ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                Seed subsidies
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <Telescope className="h-5 w-5 text-primary mb-2" />
            <div className="font-medium mb-1">Discover new buildings</div>
            <p className="text-xs text-muted-foreground mb-3">
              Pull buildings from OpenStreetMap + Google Places by city & type.
            </p>
            <Link to="/admin/discover"><Button size="sm" variant="outline">Open Discover</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <FileText className="h-5 w-5 text-primary mb-2" />
            <div className="font-medium mb-1">Edit teaser pages</div>
            <p className="text-xs text-muted-foreground mb-3">
              Update the 4 persona landing pages and resources/blog content.
            </p>
            <Link to="/admin/cms"><Button size="sm" variant="outline">Open CMS</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Megaphone className="h-5 w-5 text-primary mb-2" />
            <div className="font-medium mb-1">Initiatives & projects</div>
            <p className="text-xs text-muted-foreground mb-3">
              Coordinate multi-building portfolios and community initiatives.
            </p>
            <div className="flex gap-2">
              <Link to="/admin/projects"><Button size="sm" variant="outline">Projects</Button></Link>
              <Link to="/admin/initiatives"><Button size="sm" variant="outline">Initiatives</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
