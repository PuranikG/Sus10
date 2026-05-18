import { useState } from 'react';
import { Loader2, Check, Mail, ArrowRight } from 'lucide-react';
import { apiRequest } from '../../lib/utils';

const PERSONA_COPY = {
  citizen: {
    title: 'Be first on Sus10 AI when it launches in your city',
    subtitle: 'Join the early community of Indian homeowners turning rooftops into power, food and water.',
  },
  'citizen-crisis': {
    title: 'Get climate-resilient before the next heatwave',
    subtitle: "We'll let you know the moment Sus10 AI is open in your neighbourhood.",
  },
  rwa: {
    title: 'Be the first RWA on Sus10 AI',
    subtitle: 'Priority access during the pilot phase — at no cost.',
  },
  vendor: {
    title: 'Priority vendor access',
    subtitle: 'Complete the survey to lock in priority listing + first access to RWA leads.',
  },
};

export default function WaitlistForm({ persona = 'citizen', source, accentColor = '#1a3d2b' }) {
  const copy = PERSONA_COPY[persona] || PERSONA_COPY.citizen;
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/beta-waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          city: city.trim() || undefined,
          persona,
          source: source || (typeof window !== 'undefined' ? window.location.pathname : undefined),
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not save right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div
          className="rounded-2xl p-8 text-center text-white"
          style={{ backgroundColor: accentColor }}
          data-testid="waitlist-form-success"
        >
          <div className="inline-flex h-12 w-12 rounded-full bg-white/15 items-center justify-center mb-4">
            <Check className="h-6 w-6" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">You're on the list</h3>
          <p className="text-white/85 text-sm">
            We'll email <span className="font-medium">{email}</span> when Sus10 AI opens in your area.
            In the meantime, please fill out the survey above — your answers shape what we build first.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-3xl mx-auto px-6 py-16" data-testid="waitlist-form-section">
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}
          >
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-1" data-testid="waitlist-title">{copy.title}</h3>
            <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="waitlist-name-input"
            />
            <input
              type="text"
              placeholder="City (optional)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="waitlist-city-input"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="waitlist-email-input"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: accentColor }}
              data-testid="waitlist-submit-btn"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Join the list
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
          {error && (
            <p className="text-sm text-destructive" data-testid="waitlist-error">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            We use your email only to notify you about launch and follow-ups. No spam, ever.
          </p>
        </form>
      </div>
    </section>
  );
}
