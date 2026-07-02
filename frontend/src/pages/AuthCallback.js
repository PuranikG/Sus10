import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Leaf, Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const dest = user.user_type === 'provider' ? '/vendor/dashboard' : '/dashboard';
      navigate(dest, { replace: true });
      return;
    }
    // Cookie is set server-side before redirect — give AuthContext time to load
    const timer = setTimeout(() => {
      navigate('/?error=auth_failed', { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, navigate]);

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
