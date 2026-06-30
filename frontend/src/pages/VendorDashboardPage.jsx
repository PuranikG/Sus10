import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2, TrendingUp, Users, Zap, Plus,
  ArrowRight, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { apiRequest } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import { toast } from 'sonner';

export default function VendorDashboardPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
      return;
    }

    if (isAuthenticated && user?.user_type === 'provider') {
      loadStats();
    }
  }, [isAuthenticated, authLoading, user, navigate]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/vendor/dashboard/stats');
      setStats(data);
    } catch (e) {
      toast.error('Failed to load dashboard stats');
      console.error(e);
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="text-center py-16">
            <CardContent>
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">Unable to load dashboard. Please refresh.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Vendor Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Manage your projects and leads.</p>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">New Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{stats.new_leads || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Waiting for action</p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{stats.active_projects || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">In progress</p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-950 p-3 rounded-lg">
                    <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{stats.completed_projects || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">All time</p>
                  </div>
                  <div className="bg-emerald-100 dark:bg-emerald-950 p-3 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">₹{(stats.revenue_this_month || 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      {stats.revenue_trend_pct > 0 ? '↑' : '↓'} {Math.abs(stats.revenue_trend_pct || 0)}%
                    </p>
                  </div>
                  <div className="bg-amber-100 dark:bg-amber-950 p-3 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => navigate('/vendor/projects/new')}
              className="h-24 justify-start flex-col items-start p-4 hover:bg-primary hover:text-primary-foreground"
              variant="outline"
            >
              <Plus className="h-5 w-5 mb-2" />
              <span>New Project</span>
              <span className="text-xs text-muted-foreground mt-1">Commercial assessment</span>
            </Button>

            <Button
              onClick={() => navigate('/vendor/projects')}
              className="h-24 justify-start flex-col items-start p-4 hover:bg-primary hover:text-primary-foreground"
              variant="outline"
            >
              <Zap className="h-5 w-5 mb-2" />
              <span>My Projects</span>
              <span className="text-xs text-muted-foreground mt-1">{stats.active_projects} active</span>
            </Button>

            <Button
              onClick={() => navigate('/vendor/leads')}
              className="h-24 justify-start flex-col items-start p-4 hover:bg-primary hover:text-primary-foreground"
              variant="outline"
            >
              <Users className="h-5 w-5 mb-2" />
              <span>Assigned Leads</span>
              <span className="text-xs text-muted-foreground mt-1">{stats.new_leads} new</span>
            </Button>
          </div>
        </motion.div>

        {/* Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Coming Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Recent activity feed will appear here</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
