import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Loader2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { apiRequest } from '../lib/utils';
import WaitlistForm from '../components/cms/WaitlistForm';

function resolveAssetUrl(url) {
  if (!url) return url;
  if (url.startsWith('/api/')) return `${process.env.REACT_APP_BACKEND_URL}${url}`;
  return url;
}

function IconByName({ name, className, style }) {
  const Icon = name && LucideIcons[name] ? LucideIcons[name] : LucideIcons.Sparkle;
  return <Icon className={className} style={style} aria-hidden="true" />;
}

// ─── Sprint 4 revised: FeatureRoadmapGrid ────────────────────────────────────

function extractTextFromReactNode(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractTextFromReactNode).join('');
  if (node?.props?.children) return extractTextFromReactNode(node.props.children);
  return '';
}

// Matches: emoji Name — description. (Status)
// e.g.  "🏛️ Verified Provider Marketplace — Connect with installers. (Coming soon)"
const FEATURE_ITEM_RE = /^(\S+)\s+(.+?)\s+[—–]\s+(.+?\.?)\s*\((In development|Coming soon|Planned)\)\.?\s*$/i;

function parseFeatureItem(text) {
  const m = text.trim().match(FEATURE_ITEM_RE);
  if (!m) return null;
  return { emoji: m[1], name: m[2], description: m[3].replace(/\.$/, ''), status: m[4] };
}

const FEATURE_ICON_MAP = [
  { keywords: ['vendor', 'profile'],      icon: 'Store'     },
  { keywords: ['lead', 'rwa', 'society'], icon: 'Users'     },
  { keywords: ['proposal', 'scoping'],    icon: 'FileText'  },
  { keywords: ['subsidy', 'compliance'],  icon: 'Landmark'  },
  { keywords: ['rooftop', 'mapping'],     icon: 'Map'       },
  { keywords: ['community', 'action'],    icon: 'Building2' },
  { keywords: ['impact', 'dashboard'],    icon: 'BarChart2' },
];

function getFeatureIconName(name) {
  const lower = name.toLowerCase();
  for (const { keywords, icon } of FEATURE_ICON_MAP) {
    if (keywords.some(k => lower.includes(k))) return icon;
  }
  return 'Zap';
}

const STATUS_STYLE_MAP = {
  'in development': {
    accentColor: '#4ade80',
    badgeBg:     'rgba(74,222,128,0.1)',
    badgeBorder: 'rgba(74,222,128,0.25)',
    badgeColor:  '#4ade80',
    label:       'In development',
  },
  'coming soon': {
    accentColor: '#f5a623',
    badgeBg:     'rgba(245,166,35,0.1)',
    badgeBorder: 'rgba(245,166,35,0.25)',
    badgeColor:  '#f5a623',
    label:       'Coming soon',
  },
  'planned': {
    accentColor: '#4a6a4a',
    badgeBg:     'rgba(106,138,106,0.12)',
    badgeBorder: 'rgba(106,138,106,0.2)',
    badgeColor:  '#7aaa8a',
    label:       'Planned',
  },
};

function FeatureRoadmapGrid({ items }) {
  return (
    <div style={{
      background: '#0d1710',
      borderRadius: '20px',
      padding: '40px',
      margin: '40px 0',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '14px',
      }}>
        {items.map((item, i) => {
          const s = STATUS_STYLE_MAP[item.status.toLowerCase()] || STATUS_STYLE_MAP['planned'];
          const iconName = getFeatureIconName(item.name);
          const IconComp = LucideIcons[iconName] || LucideIcons.Zap;
          return (
            <div
              key={i}
              style={{
                background: '#111e15',
                border: '1px solid #1e3024',
                borderRadius: '14px',
                padding: '22px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top accent line */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: '2px',
                background: s.accentColor,
              }} />

              {/* Icon + status badge row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: 'rgba(74,222,128,0.1)',
                  border: '1px solid rgba(74,222,128,0.2)',
                  borderRadius: '10px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <IconComp style={{ width: '18px', height: '18px', color: '#4ade80' }} />
                </div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  color: s.badgeColor,
                  background: s.badgeBg,
                  border: `1px solid ${s.badgeBorder}`,
                }}>
                  {s.label}
                </span>
              </div>

              {/* Feature name */}
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fdf8', marginBottom: '8px' }}>
                {item.name}
              </div>

              {/* Description */}
              <div style={{ fontSize: '13px', color: '#5a8a6a', lineHeight: 1.6 }}>
                {item.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function injectGAScript(trackingId) {
  if (!trackingId || typeof window === 'undefined') return;
  // Whitelist: GA4 IDs are `G-XXXXXXXXXX`, UA IDs are `UA-…`, AW are `AW-…`.
  // Reject anything that isn't strictly alphanumeric/dash to prevent script
  // injection via attacker-controlled CMS settings.
  if (!/^[A-Z]{1,3}-[A-Z0-9-]{6,32}$/i.test(trackingId)) return;
  if (document.getElementById(`ga-script-${trackingId}`)) return;
  const s1 = document.createElement('script');
  s1.id = `ga-script-${trackingId}`;
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(trackingId)}`;
  document.head.appendChild(s1);
  const s2 = document.createElement('script');
  // Use textContent (safe) + JSON.stringify (escapes quotes/backslashes) to
  // bind the trackingId without enabling HTML/JS injection.
  s2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', ${JSON.stringify(trackingId)});`;
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
                  key={`${b.label || ''}-${b.icon || ''}-${i}`}
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
                key={`${b.label || ''}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                style={{
                  background: '#111e15',
                  border: '1px solid #1e3024',
                  borderRadius: '14px',
                  padding: '24px',
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(0,201,110,0.12)',
                  border: '1px solid rgba(0,201,110,0.25)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                }}>
                  <IconByName name={b.icon} className="h-[18px] w-[18px]" style={{ color: '#00c96e' }} />
                </div>
                <h3 style={{ color: '#f8fdf8', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>{b.title}</h3>
                <p style={{ color: '#7aaa8a', fontSize: '13px', lineHeight: 1.65, margin: 0 }}>{b.body}</p>
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
          <div style={{ background: '#0d1710', borderRadius: '12px', padding: '32px 36px' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p style={{ color: '#c8ddd0', fontSize: '14px', lineHeight: 1.75, marginBottom: '16px' }}>{children}</p>
                ),
                h2: ({ children }) => {
                  const text = extractTextFromReactNode(children);
                  const isRoadmap = /roadmap/i.test(text);
                  return (
                    <div style={{ marginTop: '32px', marginBottom: '12px' }}>
                      {isRoadmap && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px',
                        }}>
                          <div style={{ width: '24px', height: '1px', background: '#4ade80', flexShrink: 0 }} />
                          <span style={{
                            fontSize: '10px',
                            letterSpacing: '0.18em',
                            color: '#4ade80',
                            textTransform: 'uppercase',
                          }}>Product Roadmap</span>
                        </div>
                      )}
                      <h2 style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: isRoadmap ? '28px' : '20px',
                        fontWeight: 700,
                        color: '#f8fdf8',
                        margin: 0,
                      }}>
                        {children}
                      </h2>
                    </div>
                  );
                },
                h3: ({ children }) => (
                  <h3 style={{ color: '#f8fdf8', fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '8px' }}>{children}</h3>
                ),
                strong: ({ children }) => (
                  <strong style={{ color: '#f8fdf8', fontWeight: 700 }}>{children}</strong>
                ),
                li: ({ children }) => {
                  const getFirstChar = (node) => {
                    if (typeof node === 'string') return node.trimStart()[0] || '';
                    if (Array.isArray(node)) {
                      for (const child of node) {
                        const ch = getFirstChar(child);
                        if (ch) return ch;
                      }
                      return '';
                    }
                    if (node?.props?.children) return getFirstChar(node.props.children);
                    return '';
                  };
                  const first = getFirstChar(children);
                  const color = first === '✓' ? '#4ade80' : first === '✗' ? '#ff6b6b' : '#c8ddd0';
                  return (
                    <li style={{ color, fontSize: '14px', lineHeight: 1.75, marginBottom: '8px', paddingLeft: '4px' }}>
                      {children}
                    </li>
                  );
                },
                ul: ({ children }) => {
                  // Try to parse as feature cards grid
                  const childArr = Array.isArray(children)
                    ? children.filter(Boolean)
                    : children ? [children] : [];
                  const featureItems = [];
                  let allMatch = childArr.length >= 2;
                  for (const child of childArr) {
                    if (typeof child !== 'object' || !child) { allMatch = false; break; }
                    const rawText = extractTextFromReactNode(child.props?.children).trim();
                    const parsed = parseFeatureItem(rawText);
                    if (parsed) {
                      featureItems.push(parsed);
                    } else {
                      allMatch = false;
                      break;
                    }
                  }
                  if (allMatch && featureItems.length >= 2) {
                    return <FeatureRoadmapGrid items={featureItems} />;
                  }
                  return <ul style={{ marginBottom: '20px', paddingLeft: 0, listStyle: 'none' }}>{children}</ul>;
                },
                ol: ({ children }) => (
                  <ol style={{ marginBottom: '20px', paddingLeft: 0, listStyle: 'none' }}>{children}</ol>
                ),
              }}
            >
              {page.body_markdown}
            </ReactMarkdown>
          </div>
        </article>
      )}

      {/* SURVEY CTA */}
      {page.survey_url && (
        <section className="max-w-3xl mx-auto px-6 py-16">
          <div
            data-testid="cms-survey-cta"
            style={{
              background: '#111e15',
              border: '1px solid #1e3024',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <h3 style={{ color: '#f8fdf8', fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
              Share your thoughts
            </h3>
            <p style={{ color: '#7aaa8a', fontSize: '13px', marginBottom: '28px' }}>
              Takes 10–12 minutes · Anonymous · No login required
            </p>
            <a
              href={page.survey_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: '#00c96e',
                color: '#0a0f0a',
                fontWeight: 700,
                padding: '14px 32px',
                borderRadius: '100px',
                fontSize: '15px',
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#00e87a'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#00c96e'; }}
            >
              Take the Survey →
            </a>
            <p style={{ color: '#4a6a4a', fontSize: '11px', marginTop: '16px', marginBottom: 0 }}>
              Powered by Zoho Survey · Your responses are confidential
            </p>
          </div>
        </section>
      )}

      {/* WAITLIST FORM (rendered only when CMS page sets waitlist_persona) */}
      {page.waitlist_persona && (
        <WaitlistForm
          persona={page.waitlist_persona}
          source={`cms:${page.slug}`}
          accentColor={cover}
        />
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
              <div key={`${it.image_url || ''}-${i}`} className="flex-[0_0_100%] min-w-0 relative">
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
              {items.map((it, i) => (
                <button
                  key={`dot-${it.image_url || ''}-${i}`}
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
