import { useState } from 'react';
import { Loader2, Download, Mail, Check, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { apiRequest } from '../../lib/utils';
import { toast } from 'sonner';

const PERSONAS = [
  { key: 'citizen_owner', label: 'Homeowner', sub: 'Personal — monthly savings + simple ROI', accent: '#1a3d2b' },
  { key: 'rwa',           label: 'RWA / Society', sub: 'Committee-friendly — community impact + action checklist', accent: '#0f3a3a' },
  { key: 'provider',      label: 'Solution provider', sub: 'Technical scoping + warm-lead context', accent: '#1e3a8a' },
  { key: 'corporate_esg', label: 'Corporate / ESG', sub: 'BRSR-aligned impact narrative', accent: '#0c4a6e' },
];

const SECTIONS = [
  { key: 'summary',     label: 'Executive summary' },
  { key: 'solar',       label: 'Solar PV' },
  { key: 'plantation',  label: 'Greening & plantation' },
  { key: 'biogas',      label: 'Biogas & composting' },
  { key: 'rainwater',   label: 'Rainwater harvesting' },
  { key: 'subsidies',   label: 'Subsidies & financing' },
  { key: 'methodology', label: 'Methodology & data sources' },
];

const DEFAULT_SECTIONS_BY_PERSONA = {
  citizen_owner: ['summary', 'solar', 'plantation', 'rainwater', 'subsidies', 'methodology'],
  rwa:           ['summary', 'solar', 'plantation', 'biogas', 'rainwater', 'subsidies', 'methodology'],
  provider:      ['summary', 'solar', 'plantation', 'biogas', 'rainwater', 'methodology'],
  corporate_esg: ['summary', 'solar', 'plantation', 'biogas', 'rainwater', 'subsidies', 'methodology'],
};

export default function ReportDownloadDialog({
  open, onOpenChange, buildingId, families, waste, defaultPersona = 'citizen_owner',
  mode = 'download', // 'download' | 'email'
}) {
  const [persona, setPersona] = useState(defaultPersona);
  const [sections, setSections] = useState(DEFAULT_SECTIONS_BY_PERSONA[defaultPersona]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailedUrl, setEmailedUrl] = useState(null);

  const changePersona = (p) => {
    setPersona(p);
    setSections(DEFAULT_SECTIONS_BY_PERSONA[p] || SECTIONS.map(s => s.key));
  };

  const toggle = (k) => setSections((prev) => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  const buildQuery = () => {
    const sp = new URLSearchParams();
    sp.set('persona', persona);
    sp.set('sections', sections.join(','));
    if (families) sp.set('families', String(families));
    if (waste) sp.set('waste_kg_per_family_per_day', String(waste));
    return sp.toString();
  };

  const handleDownload = () => {
    const apiBase = process.env.REACT_APP_BACKEND_URL;
    const url = `${apiBase}/api/buildings/${buildingId}/report.pdf?${buildQuery()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('Report opening in a new tab');
    onOpenChange(false);
  };

  const handleEmail = async () => {
    if (!email || !email.includes('@')) return toast.error('Please enter a valid email');
    setSubmitting(true);
    try {
      const r = await apiRequest(`/buildings/${buildingId}/report-email`, {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          persona,
          sections: sections.join(','),
          families: families || undefined,
          waste_kg_per_family_per_day: waste || undefined,
        }),
      });
      setEmailedUrl(r.download_url);
      toast.success("We've got your report ready — open the download link.");
    } catch (e) {
      toast.error(e.message || 'Could not generate the report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="report-download-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {mode === 'email' ? 'Email me this report' : 'Download report'}
          </DialogTitle>
        </DialogHeader>

        {emailedUrl ? (
          <div className="space-y-4 py-4" data-testid="report-emailed-success">
            <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Saved · ready to download</span>
            </div>
            <p className="text-sm text-muted-foreground">
              We've generated your <strong>{PERSONAS.find(p => p.key === persona)?.label}</strong> report. We'll also email it to <strong>{email}</strong> shortly.
            </p>
            <Button asChild className="w-full" data-testid="emailed-download-btn">
              <a href={`${process.env.REACT_APP_BACKEND_URL}${emailedUrl}`} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" /> Download the PDF now
              </a>
            </Button>
          </div>
        ) : (
          <>
            {/* Persona radio */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tune for</Label>
              <RadioGroup value={persona} onValueChange={changePersona} className="grid sm:grid-cols-2 gap-2">
                {PERSONAS.map((p) => {
                  const active = persona === p.key;
                  return (
                    <label
                      key={p.key}
                      htmlFor={`persona-${p.key}`}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${active ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                      data-testid={`persona-radio-${p.key}`}
                    >
                      <RadioGroupItem value={p.key} id={`persona-${p.key}`} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{p.label}</div>
                        <div className="text-xs text-muted-foreground">{p.sub}</div>
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Section toggles */}
            <div className="space-y-2 mt-5">
              <Label className="text-sm font-medium">Include sections</Label>
              <div className="grid sm:grid-cols-2 gap-2" data-testid="report-section-toggles">
                {SECTIONS.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm cursor-pointer hover:bg-muted">
                    <Checkbox
                      checked={sections.includes(s.key)}
                      onCheckedChange={() => toggle(s.key)}
                      data-testid={`section-toggle-${s.key}`}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            {mode === 'email' && (
              <div className="space-y-2 mt-5">
                <Label className="text-sm font-medium">Where should we send it?</Label>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" data-testid="report-email-name" />
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" required data-testid="report-email-input" />
                </div>
                <p className="text-xs text-muted-foreground">No spam. We only use your email for follow-up about this report.</p>
              </div>
            )}

            <Badge variant="outline" className="mt-2 text-xs">
              {sections.length} sections selected · {PERSONAS.find(p => p.key === persona)?.label}
            </Badge>
          </>
        )}

        {!emailedUrl && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            {mode === 'email' ? (
              <Button onClick={handleEmail} disabled={submitting} data-testid="report-email-submit">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                Generate & email
              </Button>
            ) : (
              <Button onClick={handleDownload} disabled={sections.length === 0} data-testid="report-download-submit">
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
