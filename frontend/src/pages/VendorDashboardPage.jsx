import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2, TrendingUp, TrendingDown, Users, Zap, AlertCircle,
  Plus, ArrowRight, Receipt, Star, Package, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { apiRequest } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import VendorLayout from '../components/vendor/VendorLayout';
import { toast } from 'sonner';

function fmtINR(n) {
  if (!n) return '₹0';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${new Intl.NumberFormat('en-IN').format(n)}`;
}

export default function VendorDashboardPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { navigate('/'); return; }
    if (user?.user_type === 'provider') {
      loadStats();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, user]);

  const loadStats = async () => {
    try {
      const data = await apiRequest('/vendor/dashboard/stats');
      setStats(data);
    } catch (e) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-muted-foreground">
            {user?.user_type !== 'provider'
              ? 'This portal is for vendor accounts only.'
              : 'Failed to load dashboard. Please refresh.'}
          </p>
        </div>
      </div>
    );
  }

  const vendor = stats.vendor || {};
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const STAT_CARDS = [
    {
      label: 'Revenue This Month',
      value: fmtINR(stats.revenue_this_month),
      sub: stats.revenue_trend_pct !== 0
        ? `${stats.revenue_trend_pct > 0 ? '↑' : '↓'} ${Math.abs(stats.revenue_trend_pct)}% vs last month`
        : 'No data yet',
      icon: TrendingUp,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Active Projects',
      value: stats.active_projects ?? 0,
      sub: 'In progress',
      icon: Zap,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'New Leads',
      value: stats.new_leads ?? 0,
      sub: 'Waiting for action',
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Pending Payout',
      value: fmtINR(stats.pending_payout ?? 0),
      sub: stats.pending_payout > 0 ? 'Review in Billing' : 'All settled',
      icon: Receipt,
      color: stats.pending_payout > 0 ? 'text-red-500' : 'text-emerald-500',
      bg: stats.pending_payout > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
    },
  ];

  const QUICK_ACTIONS = [
    { label: 'View Leads',    sub: `${stats.new_leads} new`,    icon: Users,   path: '/vendor/leads' },
    { label: 'My Projects',   sub: `${stats.active_projects} active`, icon: Zap, path: '/vendor/projects' },
    { label: 'New Project',   sub: 'Commercial assessment',     icon: Plus,    path: '/vendor/projects/new' },
    { label: 'Add Product',   sub: 'To your catalog',           icon: Package, path: '/vendor/catalog' },
  ];

  return (
    <VendorLayout title="Dashboard" stats={stats}>
      <div className="p-6 max-w-5xl">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-1">
            {greeting}, {vendor.company_name || user?.name?.split(' ')[0] || 'there'}
          </h2>
          <p className="text-muted-foreground text-sm">Here's what's happening with your projects today.</p>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map(({ label, value, sub, icon: Icon, color, bg }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="h-full">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${bg} p-2 rounded-lg`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground font-mono mb-0.5">{value}</p>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className={`text-xs ${color}`}>{sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(({ label, sub, icon: Icon, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="group flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Activity</h3>
          <Card>
            <CardContent className="py-10 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Activity feed coming soon</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </VendorLayout>
  );
}
