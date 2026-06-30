import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Plus, Building2, MapPin, Calendar, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { apiRequest } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import VendorLayout from '../components/vendor/VendorLayout';
import { toast } from 'sonner';

function ProgressBar({ value, status }) {
  const pct = status === 'completed' ? 100 : status === 'active' ? 55 : 10;
  const color = pct === 100 ? 'bg-teal-500' : pct >= 60 ? 'bg-primary' : 'bg-amber-500';
  return (
    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_COLOR = {
  active:    'bg-primary/10 text-primary',
  draft:     'bg-muted text-muted-foreground',
  completed: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  'on-hold': 'bg-amber-500/10 text-amber-600',
};

export default function VendorProjectsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { navigate('/'); return; }
    loadData();
  }, [isAuthenticated, authLoading]);

  const loadData = async () => {
    try {
      const [projectsData, statsData] = await Promise.all([
        apiRequest('/vendor/projects'),
        apiRequest('/vendor/dashboard/stats'),
      ]);
      setProjects(projectsData.vendor_projects || []);
      setStats(statsData);
    } catch (e) {
      toast.error('Failed to load projects');
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

  const active = projects.filter(p => p.status === 'active' || p.status === 'draft');
  const completed = projects.filter(p => p.status === 'completed');

  return (
    <VendorLayout title="Ongoing Projects" stats={stats}>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">{projects.length} total projects</p>
          </div>
          <Button onClick={() => navigate('/vendor/projects/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Button onClick={() => navigate('/vendor/projects/new')}>Start Your First Assessment</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Active */}
            {active.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Active</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">{active.length}</span>
                </div>
                <div className="space-y-3">
                  {active.map((p, i) => (
                    <motion.div key={p.vendor_project_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => navigate(`/vendor/projects/${p.vendor_project_id}`)}
                      >
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-foreground truncate">{p.name}</p>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[p.status] || 'bg-muted text-muted-foreground'}`}>
                                  {p.status}
                                </span>
                              </div>
                              {p.complex_name && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {p.complex_name}{p.complex_city ? `, ${p.complex_city}` : ''}
                                </p>
                              )}
                              <ProgressBar status={p.status} />
                            </div>
                            <div className="flex-shrink-0 text-right text-xs text-muted-foreground space-y-1">
                              <p className="flex items-center gap-1 justify-end">
                                <Building2 className="h-3 w-3" />
                                {p.building_surveys?.length || 0} buildings
                              </p>
                              <p className="flex items-center gap-1 justify-end">
                                <Calendar className="h-3 w-3" />
                                {fmtDate(p.created_at)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-teal-500">Completed</span>
                  <span className="text-xs bg-teal-500/10 text-teal-500 px-2 py-0.5 rounded-full font-mono">{completed.length}</span>
                </div>
                <div className="space-y-3">
                  {completed.map((p, i) => (
                    <Card
                      key={p.vendor_project_id}
                      className="cursor-pointer hover:border-teal-500/30 transition-colors opacity-80"
                      onClick={() => navigate(`/vendor/projects/${p.vendor_project_id}`)}
                    >
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-foreground truncate">{p.name}</p>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                completed
                              </span>
                            </div>
                            {p.complex_city && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{p.complex_city}
                              </p>
                            )}
                            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                              <div className="bg-teal-500 h-1.5 rounded-full w-full" />
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right text-xs text-muted-foreground">
                            <p className="flex items-center gap-1 justify-end">
                              <Building2 className="h-3 w-3" />
                              {p.building_surveys?.length || 0} buildings
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </VendorLayout>
  );
}
