import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiRequest } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Leaf, Loader2, Lock, Mail, ArrowLeft } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);
  const { setUser, setIsAuthenticated } = useAuth();
  const [error, setError] = useState(null);
  const [betaInfo, setBetaInfo] = useState(null); // { message, contact_email }

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        const hash = location.hash;
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);

        if (!sessionIdMatch) {
          throw new Error('No session ID found');
        }

        const sessionId = sessionIdMatch[1];

        const response = await apiRequest('/auth/session', {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (response.user) {
          setUser(response.user);
          setIsAuthenticated(true);
          navigate('/dashboard', { state: { user: response.user }, replace: true });
        } else {
          throw new Error('No user data received');
        }
      } catch (err) {
        console.error('Auth callback error:', err);

        // Private-beta allowlist rejection from backend
        if (err.status === 403 && err.detail && err.detail.code === 'private_beta') {
          setBetaInfo({
            message: err.detail.message,
            contact_email: err.detail.contact_email || 'hello@sus10.ai',
          });
          return;
        }

        setError(err.message);
        setTimeout(() => navigate('/', { replace: true }), 3000);
      }
    };

    processAuth();
  }, [location, navigate, setUser, setIsAuthenticated]);

  if (betaInfo) {
    const mailto = `mailto:${betaInfo.contact_email}?subject=${encodeURIComponent('Sus10 AI — Beta Access Request')}&body=${encodeURIComponent("Hi Sus10 team,\n\nI'd like to request access to the Sus10 AI private beta.\n\nName:\nOrganization:\nUse case:\n\nThanks!")}`;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6" data-testid="private-beta-screen">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-lg p-8 space-y-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <Leaf className="h-8 w-8 text-primary" />
            <span className="text-2xl font-heading font-bold">Sus10 AI</span>
          </div>

          <div className="flex items-center justify-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold" data-testid="private-beta-title">
              Private Beta
            </h1>
            <p className="text-muted-foreground text-sm" data-testid="private-beta-message">
              {betaInfo.message}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={mailto}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
              data-testid="private-beta-contact-btn"
            >
              <Mail className="h-4 w-4" />
              Contact us for access
            </a>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              data-testid="private-beta-home-btn"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            We'll reach out to <span className="font-medium">{betaInfo.contact_email}</span> as soon as a seat opens up.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-destructive text-xl">Authentication failed</div>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <Leaf className="h-10 w-10 text-primary animate-pulse" />
          <span className="text-3xl font-heading font-bold">Sus10 AI</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Signing you in...</span>
        </div>
      </div>
    </div>
  );
}
