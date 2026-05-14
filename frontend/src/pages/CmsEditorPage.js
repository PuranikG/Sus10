import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Loader2, ArrowLeft, Plus, Trash2, Eye, Save, Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { apiRequest } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import { toast } from 'sonner';

const BLANK = {
  slug: '',
  type: 'landing',
  title: '',
  subtitle: '',
  hero_image_url: '',
  cover_color: '#1a3d2b',
  badges: [],
  intro_markdown: '',
  benefits: [],
  carousel: [],
  survey_url: '',
  body_markdown: '',
  footer_attribution: '',
  cta_url: '',
  cta_label: '',
  meta_title: '',
  meta_description: '',
  og_image: '',
  ga_tracking_id: '',
  ga_enabled: true,
  published: false,
  author: '',
};

export default function CmsEditorPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { pageId } = useParams();
  const isEdit = !!pageId;
  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'admin') { navigate('/'); return; }
    if (!isEdit) return;
    apiRequest('/admin/cms/pages')
      .then(list => {
        const found = list.find(p => p.page_id === pageId);
        if (found) {
          // Need full content (body_markdown is excluded from list endpoint)
          apiRequest(`/cms/pages/${found.slug}`)
            .catch(() => null)
            .then(full => setForm({ ...BLANK, ...found, body_markdown: full?.body_markdown || '' }))
            .finally(() => setLoading(false));
        } else {
          toast.error('Page not found');
          navigate('/admin/cms');
        }
      })
      .catch(() => { toast.error('Load failed'); setLoading(false); });
  }, [authLoading, user, isEdit, pageId, navigate]);

  const update = (patch) => setForm(f => ({ ...f, ...patch }));

  const handleSave = async (publish = null) => {
    if (!form.slug.trim() || !form.title.trim()) {
      toast.error('Slug and title are required');
      return;
    }
    try {
      setSaving(true);
      const payload = { ...form };
      if (publish !== null) payload.published = publish;

      if (isEdit) {
        await apiRequest(`/admin/cms/pages/${pageId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success(publish === true ? 'Published' : 'Saved');
      } else {
        const created = await apiRequest('/admin/cms/pages', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Page created');
        navigate(`/admin/cms/${created.page_id}/edit`);
        return;
      }
    } catch (e) {
      toast.error('Save failed: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const previewPath = form.type === 'blog' ? `/blog/${form.slug}` : `/${form.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <Link to="/admin/cms" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Content Studio
            </Link>
            <h1 className="text-2xl font-bold">{isEdit ? 'Edit Page' : 'New Page'}</h1>
          </div>
          <div className="flex gap-2">
            {form.published && form.slug && (
              <Link to={previewPath} target="_blank">
                <Button variant="outline" size="sm" data-testid="view-live-btn">
                  <ExternalLink className="h-4 w-4 mr-1.5" /> View live
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} data-testid="save-draft-btn">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save draft
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} data-testid="publish-btn">
              {form.published ? 'Update & keep published' : 'Publish'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="basics" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="benefits">Benefits</TabsTrigger>
            <TabsTrigger value="carousel">Carousel</TabsTrigger>
            <TabsTrigger value="survey">Survey & CTA</TabsTrigger>
            <TabsTrigger value="seo">SEO & Analytics</TabsTrigger>
          </TabsList>

          {/* BASICS */}
          <TabsContent value="basics" className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={v => update({ type: v })}>
                      <SelectTrigger data-testid="type-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="landing">Landing Page (e.g., sus10.ai/cool-roof)</SelectItem>
                        <SelectItem value="blog">Blog Post (sus10.ai/blog/...)</SelectItem>
                        <SelectItem value="resource">Resource (sus10.ai/...)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>URL Slug *</Label>
                    <Input
                      data-testid="slug-input"
                      value={form.slug}
                      onChange={e => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') })}
                      placeholder="cool-roof"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Will be: sus10.ai{previewPath}
                    </p>
                  </div>
                </div>
                <div>
                  <Label>Title *</Label>
                  <Input
                    data-testid="title-input"
                    value={form.title}
                    onChange={e => update({ title: e.target.value })}
                    placeholder="Your roof could cool your home and your city."
                  />
                </div>
                <div>
                  <Label>Subtitle</Label>
                  <Textarea
                    rows={2}
                    value={form.subtitle}
                    onChange={e => update({ subtitle: e.target.value })}
                    placeholder="A one-line hook below the headline."
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Cover color (hex)</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.cover_color || '#1a3d2b'}
                        onChange={e => update({ cover_color: e.target.value })}
                        className="h-10 w-16 rounded-md border cursor-pointer"
                      />
                      <Input
                        value={form.cover_color || ''}
                        onChange={e => update({ cover_color: e.target.value })}
                        placeholder="#1a3d2b"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Hero image URL (optional)</Label>
                    <Input
                      value={form.hero_image_url}
                      onChange={e => update({ hero_image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div>
                  <Label>Author</Label>
                  <Input value={form.author} onChange={e => update({ author: e.target.value })} placeholder="Optional" />
                </div>
                <div>
                  <Label>Footer attribution</Label>
                  <Input
                    value={form.footer_attribution}
                    onChange={e => update({ footer_attribution: e.target.value })}
                    placeholder="Research led by ..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Hero badges</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Small pills above the title (e.g., "10-12 mins", "Anonymous"). Icon names: any
                  <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline">Lucide icon</a>.
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <ListEditor
                  items={form.badges || []}
                  onChange={badges => update({ badges })}
                  fields={[
                    { key: 'label', label: 'Label', placeholder: 'Anonymous' },
                    { key: 'icon', label: 'Icon (Lucide)', placeholder: 'Lock' },
                  ]}
                  addLabel="Add badge"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONTENT */}
          <TabsContent value="content">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <Label>Intro (markdown — shown above carousel/body)</Label>
                  <Textarea
                    rows={6}
                    data-testid="intro-md"
                    value={form.intro_markdown}
                    onChange={e => update({ intro_markdown: e.target.value })}
                    placeholder="**Welcome.** This is a short intro..."
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label>Main body (markdown — long-form content for blog/resource pages)</Label>
                  <Textarea
                    rows={16}
                    data-testid="body-md"
                    value={form.body_markdown}
                    onChange={e => update({ body_markdown: e.target.value })}
                    placeholder="## Section&#10;&#10;Paste your article from Claude here..."
                    className="font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Markdown is supported — headings (##), **bold**, [links](url), - lists, tables, etc.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BENEFITS */}
          <TabsContent value="benefits">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Benefits grid (optional)</CardTitle>
                <p className="text-xs text-muted-foreground">
                  4-card grid below the hero. Best for landing pages. Icon names from
                  <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline">Lucide icons</a>.
                </p>
              </CardHeader>
              <CardContent>
                <ListEditor
                  items={form.benefits || []}
                  onChange={benefits => update({ benefits })}
                  fields={[
                    { key: 'icon', label: 'Icon (Lucide)', placeholder: 'Thermometer' },
                    { key: 'title', label: 'Title', placeholder: 'Beat the Heat' },
                    { key: 'body', label: 'Body', placeholder: 'Short benefit description', type: 'textarea' },
                  ]}
                  addLabel="Add benefit"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* CAROUSEL */}
          <TabsContent value="carousel">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Image carousel</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Add 1+ images. They'll auto-loop. Use Cloudinary, public URLs, or any image host.
                </p>
              </CardHeader>
              <CardContent>
                <ListEditor
                  items={form.carousel || []}
                  onChange={carousel => update({ carousel })}
                  fields={[
                    { key: 'image_url', label: 'Image URL', placeholder: 'https://...' },
                    { key: 'caption', label: 'Caption', placeholder: 'Optional caption' },
                    { key: 'link_url', label: 'Link URL (optional)', placeholder: 'https://...' },
                  ]}
                  addLabel="Add slide"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* SURVEY & CTA */}
          <TabsContent value="survey">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <Label>Zoho Survey URL (iframe src)</Label>
                  <Input
                    data-testid="survey-url"
                    value={form.survey_url}
                    onChange={e => update({ survey_url: e.target.value })}
                    placeholder="https://survey.zohopublic.in/zs/..."
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Paste the public survey URL from Zoho. It will be embedded as an 820px-tall iframe.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>CTA URL (optional)</Label>
                    <Input
                      value={form.cta_url}
                      onChange={e => update({ cta_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>CTA label</Label>
                    <Input
                      value={form.cta_label}
                      onChange={e => update({ cta_label: e.target.value })}
                      placeholder="Get the report"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO + GA */}
          <TabsContent value="seo">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <Label>SEO meta title</Label>
                  <Input
                    value={form.meta_title}
                    onChange={e => update({ meta_title: e.target.value })}
                    placeholder="60 chars ideal"
                  />
                </div>
                <div>
                  <Label>SEO meta description</Label>
                  <Textarea
                    rows={2}
                    value={form.meta_description}
                    onChange={e => update({ meta_description: e.target.value })}
                    placeholder="155 chars ideal — shown in Google + WhatsApp/LinkedIn previews"
                  />
                </div>
                <div>
                  <Label>Open Graph image URL (for social shares)</Label>
                  <Input
                    value={form.og_image}
                    onChange={e => update({ og_image: e.target.value })}
                    placeholder="https://... (1200x630 ideal)"
                  />
                </div>
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Google Analytics</Label>
                      <p className="text-xs text-muted-foreground">
                        Enabled by default. Toggle off if not needed for this page.
                      </p>
                    </div>
                    <Switch
                      checked={form.ga_enabled}
                      onCheckedChange={v => update({ ga_enabled: v })}
                      data-testid="ga-switch"
                    />
                  </div>
                  {form.ga_enabled && (
                    <div>
                      <Label>GA4 tracking ID</Label>
                      <Input
                        data-testid="ga-id"
                        value={form.ga_tracking_id}
                        onChange={e => update({ ga_tracking_id: e.target.value })}
                        placeholder="G-XXXXXXXXXX"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Just the Measurement ID (e.g., G-XXXXXXXXXX). gtag.js will be injected automatically.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Reusable list editor for badges/benefits/carousel
function ListEditor({ items, onChange, fields, addLabel }) {
  const add = () => {
    const blank = fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
    onChange([...(items || []), blank]);
  };
  const update = (idx, patch) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {(items || []).map((it, i) => (
        <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
            <Button size="icon" variant="ghost" onClick={() => remove(i)} className="h-7 w-7 text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {fields.map(f => (
              <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <Label className="text-xs">{f.label}</Label>
                {f.type === 'textarea' ? (
                  <Textarea
                    rows={2}
                    value={it[f.key] || ''}
                    onChange={e => update(i, { [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="text-sm"
                  />
                ) : (
                  <Input
                    value={it[f.key] || ''}
                    onChange={e => update(i, { [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5 mr-1.5" /> {addLabel}
      </Button>
    </div>
  );
}
