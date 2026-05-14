import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Building2, MapPin, Plus, Trash2, Loader2, ArrowLeft,
  Sparkles, FolderPlus, Layers, Sun, Sprout, Flame, Droplets,
  TrendingUp, Leaf, ChevronRight, Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { apiRequest, API_URL } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import { toast } from 'sonner';

const CITIES = ['Bangalore', 'Mumbai', 'Delhi', 'Gurugram', 'Noida', 'Pune', 'Hyderabad', 'Chennai'];

const GROUP_TYPES = [
  { value: 'enterprise', label: 'Enterprise / Brand Chain (e.g., Incubex, WeWork)' },
  { value: 'developer', label: 'Developer Portfolio (e.g., Embassy, Prestige)' },
  { value: 'federation', label: 'RWA / Society Federation' },
  { value: 'rwa', label: 'Single Residential Society' },
];

export default function ProjectsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/groups');
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
      return;
    }
    if (isAuthenticated) loadGroups();
  }, [isAuthenticated, authLoading, navigate, loadGroups]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Layers className="h-8 w-8 text-primary" />
              Projects & Portfolios
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 uppercase tracking-wider">
                Beta
              </span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Group buildings by developer, brand chain, or society — analyze sustainability potential at scale
            </p>
          </div>
          <Button data-testid="create-project-btn" onClick={() => setShowCreate(true)} size="lg" className="gap-2">
            <FolderPlus className="h-5 w-5" /> New Project
          </Button>
        </div>

        {groups.length === 0 ? (
          <Card className="text-center py-16 border-dashed">
            <CardContent>
              <Layers className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create a project to group buildings by a developer (Embassy, Prestige), a brand chain (Incubex, WeWork),
                or an RWA federation. Get rolled-up sustenance reports for BRSR/ESG disclosures.
              </p>
              <Button data-testid="create-first-project-btn" onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Create your first project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(g => (
              <motion.div key={g.group_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  data-testid={`project-card-${g.group_id}`}
                  className="hover:shadow-lg transition cursor-pointer h-full"
                  onClick={() => navigate(`/projects/${g.group_id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{g.name}</CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs capitalize">{g.type}</Badge>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        {(g.building_ids?.length || 0)} buildings
                      </div>
                      {g.primary_city && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" /> {g.primary_city}
                        </div>
                      )}
                      {g.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{g.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <CreateProjectDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(g) => {
          setShowCreate(false);
          navigate(`/projects/${g.group_id}`);
        }}
      />
    </div>
  );
}

function CreateProjectDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({ name: '', type: 'enterprise', primary_city: 'Bangalore', description: '' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    try {
      setCreating(true);
      const g = await apiRequest('/groups', { method: 'POST', body: JSON.stringify(form) });
      toast.success(`Created "${g.name}"`);
      onCreated(g);
    } catch (e) {
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="create-project-dialog">
        <DialogHeader>
          <DialogTitle>New Project / Portfolio</DialogTitle>
          <DialogDescription>
            Group buildings to analyze sustainability potential at scale
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Project Name</Label>
            <Input
              data-testid="project-name-input"
              placeholder="e.g., Incubex Bangalore, Embassy Group ESG"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger data-testid="project-type-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GROUP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Primary City</Label>
            <Select value={form.primary_city} onValueChange={v => setForm({ ...form, primary_city: v })}>
              <SelectTrigger data-testid="project-city-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input
              data-testid="project-desc-input"
              placeholder="What is this portfolio about?"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-testid="create-project-submit" onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
