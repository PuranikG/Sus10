import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiRequest } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Leaf, Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);
  const { setUser, setIsAuthenticated } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = location.hash;
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        
        if (!sessionIdMatch) {
          throw new Error('No session ID found');
        }

        const sessionId = sessionIdMatch[1];

        // Exchange session_id for session_token
        const response = await apiRequest('/auth/session', {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (response.user) {
          setUser(response.user);
          setIsAuthenticated(true);
          
          // Navigate to dashboard with user data
          navigate('/dashboard', { state: { user: response.user }, replace: true });
        } else {
          throw new Error('No user data received');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message);
        setTimeout(() => navigate('/', { replace: true }), 3000);
      }
    };

    processAuth();
  }, [location, navigate, setUser, setIsAuthenticated]);

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
