import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowRight, FileText, Layout, BookOpen, Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { apiRequest } from '../lib/utils';
import Navbar from '../components/layout/Navbar';

const TYPE_META = {
  landing: { label: 'Campaign', icon: Layout, color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' },
  blog: { label: 'Article', icon: BookOpen, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' },
  resource: { label: 'Resource', icon: FileText, color: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300' },
};

function resolveAssetUrl(url) {
  if (!url) return url;
  if (url.startsWith('/api/')) return `${process.env.REACT_APP_BACKEND_URL}${url}`;
  return url;
}

export default function ResourcesIndexPage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    document.title = 'Resources — Sus10 AI';
    apiRequest('/cms/pages?limit=100')
      .then(d => setPages(Array.isArray(d) ? d : []))
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    all: pages.length,
    blog: pages.filter(p => p.type === 'blog').length,
    resource: pages.filter(p => p.type === 'resource').length,
    landing: pages.filter(p => p.type === 'landing').length,
  };

  const filtered = pages
    .filter(p => filter === 'all' || p.type === filter)
    .filter(p => !q || (p.title + ' ' + (p.subtitle || '') + ' ' + (p.meta_description || '')).toLowerCase().includes(q.toLowerCase()));

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="resources-index">
      <Navbar />

      {/* Hero */}
      <section className="border-b bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/20">
        <div className="container mx-auto px-4 py-12 md:py-16 max-w-6xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            Resources
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
            Research, surveys, case studies and field guides on rooftop sustainability,
            BRSR/ESG reporting, and India's urban climate adaptation.
          </p>
        </div>
      </section>

      {/* Filters + search */}
      <section className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex flex-wrap gap-3 items-center mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { v: 'all', label: 'All' },
              { v: 'blog', label: 'Articles' },
              { v: 'resource', label: 'Field guides' },
              { v: 'landing', label: 'Active surveys' },
            ].map(f => (
              <button
                key={f.v}
                type="button"
                data-testid={`filter-${f.v}`}
                onClick={() => setFilter(f.v)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  filter === f.v
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted'
                }`}
              >
                {f.label} ({counts[f.v]})
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="resources-search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search…"
              className="pl-9"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="text-center py-16 border-dashed">
            <CardContent>
              <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {q ? `No results for "${q}"` : 'No published resources yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(p => {
              const meta = TYPE_META[p.type] || TYPE_META.resource;
              const Icon = meta.icon;
              const publicPath = p.type === 'blog' ? `/blog/${p.slug}` : `/${p.slug}`;
              return (
                <Link
                  key={p.page_id}
                  to={publicPath}
                  className="group"
                  data-testid={`resource-card-${p.slug}`}
                >
                  <Card className="h-full overflow-hidden hover:shadow-md transition flex flex-col">
                    {/* Cover image / color block */}
                    <div
                      className="aspect-[16/9] relative overflow-hidden"
                      style={{
                        backgroundColor: p.cover_color || '#1a3d2b',
                        backgroundImage: p.hero_image_url
                          ? `url(${resolveAssetUrl(p.hero_image_url)})`
                          : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" />
                      <div className="absolute top-3 left-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${meta.color}`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <h3
                        className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition"
                        style={p.type === 'blog' ? {} : { fontFamily: '"Playfair Display", Georgia, serif' }}
                      >
                        {p.title}
                      </h3>
                      {p.subtitle && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                          {p.subtitle}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                        <span>
                          {p.published_at && new Date(p.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-primary group-hover:gap-2 transition-all">
                          Read <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
