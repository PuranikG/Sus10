import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, ExternalLink, Edit3, Trash2, Eye, FileText, Layout, BookOpen } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { apiRequest } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import { toast } from 'sonner';

const TYPE_META = {
  landing: { label: 'Landing', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', icon: Layout },
  blog: { label: 'Blog', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', icon: BookOpen },
  resource: { label: 'Resource', color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300', icon: FileText },
};

export default function CmsAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/admin/cms/pages');
      setPages(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error('Failed to load CMS pages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'admin') { navigate('/'); return; }
    load();
  }, [authLoading, user, navigate, load]);

  const handleDelete = async (pageId, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await apiRequest(`/admin/cms/pages/${pageId}`, { method: 'DELETE' });
      toast.success('Page deleted');
      load();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const handleSeedGreenRoof = async () => {
    try {
      const res = await apiRequest('/admin/cms/seed-green-roof', { method: 'POST' });
      if (res.already_exists) {
        toast.info('Green Roof page already exists in CMS');
      } else {
        toast.success('Green Roof migrated to CMS');
      }
      load();
    } catch (e) {
      toast.error('Migration failed: ' + e.message);
    }
  };

  const filtered = filter === 'all' ? pages : pages.filter(p => p.type === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const counts = {
    all: pages.length,
    landing: pages.filter(p => p.type === 'landing').length,
    blog: pages.filter(p => p.type === 'blog').length,
    resource: pages.filter(p => p.type === 'resource').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Content Studio</h1>
            <p className="text-muted-foreground mt-1">
              Manage landing pages, blog posts, and resource articles. Paste content from Claude/Gemini, preview, publish.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSeedGreenRoof} size="sm">
              Seed Green Roof
            </Button>
            <Button data-testid="new-cms-page-btn" onClick={() => navigate('/admin/cms/new')}>
              <Plus className="h-4 w-4 mr-2" /> New Page
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {['all', 'landing', 'blog', 'resource'].map(f => (
            <button
              key={f}
              type="button"
              data-testid={`filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 text-muted-foreground hover:bg-muted'
              }`}
            >
              {f === 'all' ? 'All' : TYPE_META[f].label} ({counts[f]})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card className="text-center py-16 border-dashed">
            <CardContent>
              <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No pages yet.</p>
              <Button onClick={() => navigate('/admin/cms/new')}>
                <Plus className="h-4 w-4 mr-2" /> Create your first page
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => {
              const meta = TYPE_META[p.type] || TYPE_META.landing;
              const Icon = meta.icon;
              const publicPath = p.type === 'blog' ? `/blog/${p.slug}` : `/${p.slug}`;
              return (
                <Card key={p.page_id} data-testid={`cms-row-${p.slug}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${meta.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{p.title}</h3>
                          <Badge variant={p.published ? 'default' : 'outline'} className="text-[10px]">
                            {p.published ? 'Published' : 'Draft'}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] capitalize">{p.type}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {publicPath} · {p.view_count || 0} views · updated {new Date(p.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {p.published && (
                          <Link to={publicPath} target="_blank">
                            <Button size="icon" variant="ghost" title="View live">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Edit"
                          data-testid={`edit-${p.slug}`}
                          onClick={() => navigate(`/admin/cms/${p.page_id}/edit`)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete"
                          onClick={() => handleDelete(p.page_id, p.title)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
