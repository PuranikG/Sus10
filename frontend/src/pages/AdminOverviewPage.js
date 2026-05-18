import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, Inbox, Layers, Megaphone, Telescope, Users, FileText } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { apiRequest } from '../lib/utils';
import AdminShell from '../components/layout/AdminShell';

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

  useEffect(() => {
    apiRequest('/admin/buildings?limit=1').then(r => setCounts(r?.counts || {})).catch(() => {});
    apiRequest('/admin/beta-waitlist?limit=1').then(r => setWaitlist(r || { total: 0, by_persona: {} })).catch(() => {});
    apiRequest('/admin/zoho-survey-responses?limit=1').then(r => setSurveysTotal(r?.total || 0)).catch(() => {});
  }, []);

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
