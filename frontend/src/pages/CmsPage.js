import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Loader2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { apiRequest } from '../lib/utils';

function resolveAssetUrl(url) {
  if (!url) return url;
  if (url.startsWith('/api/')) return `${process.env.REACT_APP_BACKEND_URL}${url}`;
  return url;
}

function IconByName({ name, className }) {
  const Icon = name && LucideIcons[name] ? LucideIcons[name] : LucideIcons.Sparkle;
  return <Icon className={className} aria-hidden="true" />;
}

function injectGAScript(trackingId) {
  if (!trackingId || typeof window === 'undefined') return;
  if (document.getElementById(`ga-script-${trackingId}`)) return;
  const s1 = document.createElement('script');
  s1.id = `ga-script-${trackingId}`;
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  document.head.appendChild(s1);
  const s2 = document.createElement('script');
  s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config','${trackingId}');`;
  document.head.appendChild(s2);
}

function setMetaTags(page) {
  if (typeof document === 'undefined') return;
  if (page.meta_title || page.title) {
    document.title = page.meta_title || page.title;
  }
  const setMeta = (name, content, isProperty = false) => {
    if (!content) return;
    const attr = isProperty ? 'property' : 'name';
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };
  setMeta('description', page.meta_description);
  setMeta('og:title', page.meta_title || page.title, true);
  setMeta('og:description', page.meta_description || page.subtitle, true);
  setMeta('og:image', resolveAssetUrl(page.og_image || page.hero_image_url), true);
  setMeta('og:type', page.type === 'blog' ? 'article' : 'website', true);
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', page.meta_title || page.title);
  setMeta('twitter:description', page.meta_description || page.subtitle);
  setMeta('twitter:image', resolveAssetUrl(page.og_image || page.hero_image_url));
}

export default function CmsPage({ expectedType = null }) {
  const params = useParams();
  const slug = params.slug;
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    apiRequest(`/cms/pages/${slug}`)
      .then(p => {
        if (!active) return;
        if (expectedType && p.type !== expectedType) {
          setNotFound(true);
        } else {
          setPage(p);
          setMetaTags(p);
          if (p.ga_enabled && p.ga_tracking_id) injectGAScript(p.ga_tracking_id);
        }
      })
      .catch(() => active && setNotFound(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug, expectedType]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-muted-foreground mb-6">No content exists at this URL.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Back to home
        </button>
      </div>
    );
  }

  const cover = page.cover_color || '#1a3d2b';
  const isLanding = page.type === 'landing';

  return (
    <div className="min-h-screen bg-background" data-testid="cms-page">
      {/* HERO */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: cover, color: 'white' }}
      >
        {page.hero_image_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${resolveAssetUrl(page.hero_image_url)})` }}
          />
        )}
        <div className="relative max-w-5xl mx-auto px-6 py-16 sm:py-20 md:py-28">
          {page.type === 'blog' && (
            <Link to="/blog" className="inline-flex items-center text-sm text-white/80 hover:text-white mb-6">
              <ArrowLeft className="h-4 w-4 mr-1" /> All articles
            </Link>
          )}
          {!!(page.badges?.length) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {page.badges.map((b, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-white/15 backdrop-blur border border-white/20"
                >
                  <IconByName name={b.icon} className="h-3.5 w-3.5" />
                  {b.label}
                </span>
              ))}
            </div>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight max-w-4xl"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            {page.title}
          </motion.h1>
          {page.subtitle && (
            <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-white/85 max-w-3xl leading-relaxed">
              {page.subtitle}
            </p>
          )}
          {page.author && page.type === 'blog' && (
            <p className="mt-6 text-sm text-white/70">
              By {page.author}
              {page.published_at && ` · ${new Date(page.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            </p>
          )}
        </div>
      </section>

      {/* BENEFITS GRID */}
      {!!(page.benefits?.length) && (
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {page.benefits.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl border bg-card p-5"
              >
                <div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3"
                  style={{ backgroundColor: `${cover}1A`, color: cover }}
                >
                  <IconByName name={b.icon} className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-1.5">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* INTRO */}
      {page.intro_markdown && (
        <section className="max-w-3xl mx-auto px-6 pb-12">
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.intro_markdown}</ReactMarkdown>
          </div>
        </section>
      )}

      {/* CAROUSEL */}
      {!!(page.carousel?.length) && (
        <PageCarousel items={page.carousel} accentColor={cover} />
      )}

      {/* MAIN BODY */}
      {page.body_markdown && (
        <article className="max-w-3xl mx-auto px-6 py-12">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.body_markdown}</ReactMarkdown>
          </div>
        </article>
      )}

      {/* SURVEY IFRAME */}
      {page.survey_url && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="rounded-xl border overflow-hidden bg-card shadow-sm" data-testid="cms-survey-iframe">
            <iframe
              src={page.survey_url}
              title={`${page.title} survey`}
              className="w-full"
              style={{ height: '820px', border: 'none' }}
            />
          </div>
        </section>
      )}

      {/* CTA */}
      {page.cta_url && page.cta_label && (
        <section className="max-w-3xl mx-auto px-6 pb-16 text-center">
          <a
            href={page.cta_url}
            target={page.cta_url.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 rounded-lg font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: cover }}
            data-testid="cms-cta-btn"
          >
            {page.cta_label}
          </a>
        </section>
      )}

      {/* FOOTER */}
      {(page.footer_attribution || isLanding) && (
        <footer className="border-t mt-8">
          <div className="max-w-5xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
            {page.footer_attribution && <p className="mb-2">{page.footer_attribution}</p>}
            <p>
              <Link to="/" className="hover:underline">Sus10 AI</Link>
              {' · '}
              <Link to="/blog" className="hover:underline">Resources</Link>
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

function PageCarousel({ items, accentColor }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' });
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  return (
    <section className="max-w-6xl mx-auto px-6 py-12">
      <div className="relative" data-testid="cms-carousel">
        <div ref={emblaRef} className="overflow-hidden rounded-xl">
          <div className="flex">
            {items.map((it, i) => (
              <div key={i} className="flex-[0_0_100%] min-w-0 relative">
                <img
                  src={resolveAssetUrl(it.image_url)}
                  alt={it.caption || `Slide ${i + 1}`}
                  className="w-full h-[240px] sm:h-[320px] md:h-[440px] object-cover rounded-xl"
                />
                {it.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 md:p-6 text-white rounded-b-xl">
                    <p className="text-sm md:text-base">{it.caption}</p>
                    {it.link_url && (
                      <a href={it.link_url} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-1 inline-block">
                        Learn more →
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {items.length > 1 && (
          <>
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2"
              aria-label="Next slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="flex justify-center gap-2 mt-4">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className="w-2 h-2 rounded-full transition"
                  style={{
                    backgroundColor: i === selected ? accentColor : 'rgba(0,0,0,0.2)',
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
