import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Loader2, Sparkles, Wrench, Building2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import Navbar from '../components/layout/Navbar';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function VendorBrochurePage() {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    brand_name: '',
    tagline: '',
    contact_name: '',
    phone: '',
    email: '',
    website: '',
    cities: '',
    years_experience: '',
    certifications: '',
    badges: '',
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.brand_name.trim()) {
      toast.error('Add your brand name to generate the brochure.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        brand_name: form.brand_name.trim(),
        tagline: form.tagline.trim() || undefined,
        contact_name: form.contact_name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        website: form.website.trim() || undefined,
        cities: form.cities.trim() || undefined,
        years_experience: form.years_experience ? Number(form.years_experience) : undefined,
        certifications: form.certifications.trim() || undefined,
        badges: form.badges ? form.badges.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6) : undefined,
      };
      const res = await fetch(`${BACKEND_URL}/api/vendor-offering/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const safeBrand = form.brand_name.replace(/[^a-z0-9-_]/gi, '_').slice(0, 32) || 'vendor';
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sus10_${safeBrand}_Integrated_Roof_Offering.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Your brochure is downloaded. Open it from your downloads folder.');
    } catch (err) {
      toast.error(err?.message || 'Failed to generate brochure. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-emerald-900/40 bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950">
        <div className="container-max section-padding py-12 md:py-16">
          <Badge variant="outline" className="mb-3 border-emerald-700/60 text-emerald-200 bg-emerald-950/50" data-testid="brochure-eyebrow">
            <Wrench className="h-3 w-3 mr-1" /> For installers · Free
          </Badge>
          <h1 className="text-3xl md:text-5xl font-heading font-bold tracking-tight mb-3 text-slate-50">
            Hand your warm leads a <span className="text-emerald-400">co-branded brochure</span>.
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl">
            One A4 page. Your brand, your colors, your contact. The integrated 4-pillar story (solar + biogas + rainwater + plantation)
            already done. Hand it to your customer at the end of every site visit.
          </p>
        </div>
      </section>

      <section className="container-max section-padding py-10">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardContent className="p-6 md:p-8">
                  <form onSubmit={handleSubmit} className="space-y-5" data-testid="brochure-form">
                    <div>
                      <Label htmlFor="b-brand" className="mb-1.5 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> Brand name <span className="text-red-500">*</span>
                      </Label>
                      <Input id="b-brand" required value={form.brand_name} onChange={(e) => update('brand_name', e.target.value)} placeholder="e.g. GreenScape Solutions" data-testid="brochure-brand" />
                    </div>

                    <div>
                      <Label htmlFor="b-tagline" className="mb-1.5">Tagline <span className="text-muted-foreground text-xs">optional</span></Label>
                      <Input id="b-tagline" value={form.tagline} onChange={(e) => update('tagline', e.target.value)} placeholder="e.g. Rooftop solar + integrated greening, since 2017" data-testid="brochure-tagline" />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="b-contact" className="mb-1.5">Contact name</Label>
                        <Input id="b-contact" value={form.contact_name} onChange={(e) => update('contact_name', e.target.value)} placeholder="e.g. Ramesh K" data-testid="brochure-contact" />
                      </div>
                      <div>
                        <Label htmlFor="b-phone" className="mb-1.5">Phone</Label>
                        <Input id="b-phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+91-9XXXX XXXXX" data-testid="brochure-phone" />
                      </div>
                      <div>
                        <Label htmlFor="b-email" className="mb-1.5">Email</Label>
                        <Input id="b-email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="ramesh@yourcompany.in" data-testid="brochure-email" />
                      </div>
                      <div>
                        <Label htmlFor="b-website" className="mb-1.5">Website</Label>
                        <Input id="b-website" value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="yourcompany.in" data-testid="brochure-website" />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="b-cities" className="mb-1.5">Cities you serve</Label>
                        <Input id="b-cities" value={form.cities} onChange={(e) => update('cities', e.target.value)} placeholder="Bengaluru, Mysuru" data-testid="brochure-cities" />
                      </div>
                      <div>
                        <Label htmlFor="b-years" className="mb-1.5">Years of experience</Label>
                        <Input id="b-years" type="number" min="0" max="80" value={form.years_experience} onChange={(e) => update('years_experience', e.target.value)} placeholder="8" data-testid="brochure-years" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="b-certs" className="mb-1.5">Certifications</Label>
                      <Input id="b-certs" value={form.certifications} onChange={(e) => update('certifications', e.target.value)} placeholder="MNRE empanelled · ISO 9001 · IGBC accredited" data-testid="brochure-certs" />
                    </div>

                    <div>
                      <Label htmlFor="b-badges" className="mb-1.5">Highlight badges <span className="text-muted-foreground text-xs">comma-separated, max 6</span></Label>
                      <Textarea id="b-badges" value={form.badges} onChange={(e) => update('badges', e.target.value)} rows={2} placeholder="MNRE empanelled, ISO 9001, IGBC accredited" data-testid="brochure-badges" />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                      <p className="text-xs text-muted-foreground">
                        Free. Re-generate any time. No login needed.
                      </p>
                      <Button type="submit" size="lg" disabled={submitting} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold" data-testid="brochure-submit">
                        {submitting ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
                        ) : (
                          <><Download className="h-4 w-4 mr-2" /> Download my brochure</>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Side reassurance */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20">
              <CardContent className="p-5">
                <FileText className="h-7 w-7 text-emerald-600 dark:text-emerald-400 mb-2" />
                <h3 className="font-semibold mb-2">What you'll get</h3>
                <ul className="text-sm space-y-1.5 text-foreground/80">
                  <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400">✓</span> 1-page A4 PDF, ready to print or email</li>
                  <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400">✓</span> Your brand name + tagline in the hero</li>
                  <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400">✓</span> Headline KPIs across all 4 pillars</li>
                  <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400">✓</span> "How it works" + "Why integrated wins" sections</li>
                  <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400">✓</span> Your contact card at the bottom</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <Sparkles className="h-7 w-7 text-emerald-600 dark:text-emerald-400 mb-2" />
                <h3 className="font-semibold mb-2">Why this exists</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Most homeowners don't know solar + biogas + rainwater + greening can be done together.
                  Customers convert 2-3x faster when they see one integrated story instead of four separate quotes.
                  This brochure tells that story for you — so you can focus on the site survey.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/40">
              <CardContent className="p-5 text-xs text-muted-foreground">
                <div className="font-semibold text-foreground mb-1.5">Numbers used in the brochure</div>
                Based on MNRE GHI, CPCB norms, IMD rainfall, CEA grid factors. Final site-specific numbers come from your own survey.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
