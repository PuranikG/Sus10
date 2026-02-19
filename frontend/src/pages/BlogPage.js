import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Calendar, User, ArrowRight, Tag,
  Search, Clock, Eye, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { apiRequest, formatDate } from '../lib/utils';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function BlogPage() {
  const { isEnabled } = useFeatureFlags();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedCategory) params.append('category', selectedCategory);
        params.append('limit', '20');
        
        const data = await apiRequest(`/blog/posts?${params.toString()}`);
        setPosts(data);
      } catch (error) {
        console.error('Failed to fetch blog posts:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    if (isEnabled('blog')) {
      fetchPosts();
    } else {
      setLoading(false);
    }
  }, [selectedCategory, isEnabled]);

  const categories = [
    { value: '', label: 'All Posts' },
    { value: 'guides', label: 'Guides' },
    { value: 'case-studies', label: 'Case Studies' },
    { value: 'news', label: 'News' },
    { value: 'sustainability', label: 'Sustainability' },
  ];

  const filteredPosts = posts.filter(p =>
    !searchQuery ||
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isEnabled('blog')) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-max section-padding py-20 text-center">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-heading font-bold mb-2">Resources Coming Soon</h1>
          <p className="text-muted-foreground mb-6">
            Our blog and resource hub is currently being prepared. Check back soon!
          </p>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container-max section-padding py-12">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4">
              <BookOpen className="h-3 w-3 mr-1" />
              Resources & Insights
            </Badge>
            <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tight mb-4">
              Sustainability Knowledge Hub
            </h1>
            <p className="text-lg text-muted-foreground">
              Expert guides, case studies, and the latest news in urban sustainability and green building solutions.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 border-b border-border bg-card/50">
        <div className="container-max section-padding">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-background"
                data-testid="blog-search-input"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                  data-testid={`category-${cat.value || 'all'}`}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-12">
        <div className="container-max section-padding">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48" />
                  <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-heading font-medium mb-2">No articles found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search terms.' : 'New content coming soon!'}
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post, index) => (
                <BlogPostCard key={post.post_id} post={post} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function BlogPostCard({ post, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/blog/${post.slug}`} data-testid={`blog-post-${post.slug}`}>
        <Card className="h-full card-hover overflow-hidden group">
          {/* Featured Image */}
          <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
            {post.featured_image_url ? (
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-primary/30" />
              </div>
            )}
            {post.category && (
              <Badge className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm">
                {post.category}
              </Badge>
            )}
          </div>

          <CardContent className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {post.title}
            </h3>
            
            {post.excerpt && (
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {post.excerpt}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                {post.published_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(post.published_at)}</span>
                  </div>
                )}
                {post.views_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{post.views_count}</span>
                  </div>
                )}
              </div>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
