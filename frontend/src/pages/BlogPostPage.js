/**
 * @deprecated This page is no longer routed — /blog/:slug now uses CmsPage (unified CMS).
 * Kept temporarily for reference. Safe to delete after Feb 28, 2026.
 */

import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import {
  BookOpen, Calendar, User, ArrowLeft, Tag,
  Share2, Clock, Eye, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { apiRequest, formatDate } from '../lib/utils';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function BlogPostPage() {
  const { slug } = useParams();
  const { isEnabled } = useFeatureFlags();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await apiRequest(`/blog/posts/${slug}`);
        setPost(data);
      } catch (error) {
        console.error('Failed to fetch post:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isEnabled('blog')) {
      fetchPost();
    } else {
      setLoading(false);
    }
  }, [slug, isEnabled]);

  if (!isEnabled('blog')) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-max section-padding py-20 text-center">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-heading font-bold mb-2">Feature Not Available</h1>
          <p className="text-muted-foreground mb-6">
            The blog feature is currently disabled.
          </p>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-max section-padding py-12">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-64 w-full mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-max section-padding py-20 text-center">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-heading font-bold mb-2">Post Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The article you're looking for doesn't exist.
          </p>
          <Link to="/blog">
            <Button>Browse Articles</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <article className="container-max section-padding py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/blog" className="hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span>Blog</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground truncate">{post.title}</span>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            {post.category && (
              <Badge variant="secondary" className="mb-4">
                <Tag className="h-3 w-3 mr-1" />
                {post.category}
              </Badge>
            )}
            
            <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tight mb-4">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="text-xl text-muted-foreground mb-6">
                {post.excerpt}
              </p>
            )}

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              {post.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(post.published_at)}</span>
                </div>
              )}
              {post.views_count > 0 && (
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>{post.views_count} views</span>
                </div>
              )}
            </div>
          </header>

          {/* Featured Image */}
          {post.featured_image_url && (
            <div className="rounded-2xl overflow-hidden mb-8">
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <div 
              className="text-foreground leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content.replace(/\n/g, '<br/>')) }}
            />
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 pt-8 border-t border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Tags:</span>
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="mt-8 pt-8 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Share this article</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(post.title + '\n\n' + window.location.href)}`, '_blank');
                }}>
                  WhatsApp
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  window.location.href = `mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(window.location.href)}`;
                }}>
                  Email
                </Button>
              </div>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
