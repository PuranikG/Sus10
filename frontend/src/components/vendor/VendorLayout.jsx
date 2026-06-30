import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/badge';
import {
  LayoutDashboard, Users, FolderOpen, Package, Star, Receipt,
  ChevronRight, Verified, MapPin, LogOut
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard',         path: '/vendor/dashboard',  icon: LayoutDashboard, badgeKey: null },
  { label: 'New Leads',         path: '/vendor/leads',      icon: Users,           badgeKey: 'new_leads' },
  { label: 'Ongoing Projects',  path: '/vendor/projects',   icon: FolderOpen,      badgeKey: 'active_projects' },
  { label: 'Product Catalog',   path: '/vendor/catalog',    icon: Package,         badgeKey: null },
  { label: 'Project Showcase',  path: '/vendor/showcase',   icon: Star,            badgeKey: null },
  { label: 'Billing',           path: '/vendor/billing',    icon: Receipt,         badgeKey: null },
];

export default function VendorLayout({ children, title, stats }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const vendor = stats?.vendor;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-border bg-card">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <img src="/sus10-logo.png" alt="Sus10 AI" className="h-6 w-6 object-contain" />
            <span className="text-sm font-semibold text-foreground">Sus10</span>
            <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">Vendor</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_ITEMS.map(({ label, path, icon: Icon, badgeKey }) => {
            const isActive = location.pathname === path ||
              (path === '/vendor/projects' && location.pathname.startsWith('/vendor/projects/'));
            const badgeCount = badgeKey && stats ? stats[badgeKey] : null;

            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {badgeCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    badgeKey === 'new_leads' ? 'bg-primary text-primary-foreground' : 'bg-blue-500 text-white'
                  }`}>
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Vendor profile card */}
        <div className="border-t border-border p-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {vendor?.company_name || user?.name || 'Vendor'}
                </p>
                {vendor?.city && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {vendor.city}
                  </p>
                )}
              </div>
              {vendor?.verified && (
                <Verified className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              )}
            </div>
            {vendor?.rating && (
              <p className="text-xs text-muted-foreground">
                ★ {vendor.rating.toFixed(1)} rating
              </p>
            )}
            <button
              onClick={logout}
              className="mt-2 w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky top bar */}
        <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-border bg-card/80 backdrop-blur-sm">
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
