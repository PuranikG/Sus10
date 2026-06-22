import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePreviewRole, ROLE_LABELS } from '../../context/PreviewRoleContext';
import Navbar from './Navbar';
import {
  LayoutDashboard, Telescope, Building2, ClipboardList,
  Layers, Megaphone, Inbox, Users, FileText, BookOpen,
  ListChecks, Mail, Flag, Shield, ChevronRight, ShieldCheck, Banknote, Eye, SlidersHorizontal, Leaf,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, testid: 'admin-nav-overview', exact: true },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/admin/discover', label: 'Discover Buildings', icon: Telescope, testid: 'admin-nav-discover' },
      { to: '/admin/buildings', label: 'Buildings', icon: Building2, testid: 'admin-nav-buildings' },
      { to: '/admin/intelligence', label: 'Intelligence Notes', icon: ClipboardList, testid: 'admin-nav-intelligence', soon: true },
      { to: '/admin/subsidies', label: 'Subsidies & Financing', icon: Banknote, testid: 'admin-nav-subsidies' },
      { to: '/admin/plants', label: 'Plant Database', icon: Leaf, testid: 'admin-nav-plants' },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { to: '/admin/projects', label: 'Projects', icon: Layers, testid: 'admin-nav-projects' },
      { to: '/admin/initiatives', label: 'Initiatives', icon: Megaphone, testid: 'admin-nav-initiatives' },
      { to: '/admin/leads', label: 'Leads', icon: Inbox, testid: 'admin-nav-leads' },
      { to: '/admin/providers', label: 'Providers', icon: Users, testid: 'admin-nav-providers' },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/cms', label: 'CMS Pages', icon: FileText, testid: 'admin-nav-cms' },
      { to: '/admin/cms?type=blog', label: 'Blog & Resources', icon: BookOpen, testid: 'admin-nav-blog' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { to: '/admin/waitlist', label: 'Beta Waitlist', icon: Mail, testid: 'admin-nav-waitlist' },
      { to: '/admin/zoho-surveys', label: 'Zoho Survey Responses', icon: ListChecks, testid: 'admin-nav-surveys' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/admin/audit', label: 'Audit Log', icon: ShieldCheck, testid: 'admin-nav-audit' },
      { to: '/admin/feature-flags', label: 'Feature Flags', icon: Flag, testid: 'admin-nav-flags' },
      { to: '/admin/calculator-config', label: 'Calculator Config', icon: SlidersHorizontal, testid: 'admin-nav-calc-config' },
    ],
  },
];

function NavItem({ item, active }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      data-testid={item.testid}
      className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <span className="inline-flex items-center gap-3">
        <Icon className={`h-4 w-4 ${active ? 'text-primary' : ''}`} />
        {item.label}
      </span>
      {item.soon ? (
        <Badge variant="outline" className="text-[10px] py-0 px-1.5">soon</Badge>
      ) : active ? (
        <ChevronRight className="h-3.5 w-3.5" />
      ) : null}
    </Link>
  );
}

export default function AdminShell({ title, subtitle, actions, children }) {
  const { user } = useAuth();
  const { previewRole, setPreviewRole } = usePreviewRole();
  const { pathname, search } = useLocation();
  const fullPath = pathname + search;

  if (user && user.user_type !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-max section-padding py-20 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-heading font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You need admin privileges to access this page.
          </p>
          <Link to="/dashboard" className="text-primary underline">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Preview mode banner */}
      {previewRole && (
        <div
          className="w-full bg-amber-400 text-amber-950 text-sm font-medium text-center py-2 px-4 cursor-pointer hover:bg-amber-300 transition-colors flex items-center justify-center gap-2"
          onClick={() => setPreviewRole(null)}
          data-testid="preview-banner"
        >
          <Eye className="h-4 w-4 shrink-0" />
          Previewing as {ROLE_LABELS[previewRole]} — Click to exit preview
        </div>
      )}

      <div className="container-max section-padding py-6">
        <div className="grid lg:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block sticky top-6 self-start" data-testid="admin-sidebar">
            <div className="rounded-xl border bg-card p-4 space-y-5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Internal Console</span>
                <Badge className="ml-auto bg-primary text-xs">Admin</Badge>
              </div>

              {/* Preview as switcher */}
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                  Preview as
                </div>
                <Select
                  value={previewRole || 'admin'}
                  onValueChange={(val) => setPreviewRole(val === 'admin' ? null : val)}
                >
                  <SelectTrigger className="h-8 text-xs" data-testid="preview-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="homeowner">Homeowner</SelectItem>
                    <SelectItem value="rwa">RWA</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {SECTIONS.map((section) => (
                <div key={section.label}>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 px-2">
                    {section.label}
                  </div>
                  <nav className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = item.exact
                        ? pathname === item.to
                        : (fullPath === item.to || pathname === item.to.split('?')[0]);
                      return <NavItem key={item.to} item={item} active={active} />;
                    })}
                  </nav>
                </div>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight" data-testid="admin-page-title">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
