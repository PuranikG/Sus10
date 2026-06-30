import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { apiRequest } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import VendorLayout from '../components/vendor/VendorLayout';

export default function VendorStubPage({ title, icon: Icon, description }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { navigate('/'); return; }
    apiRequest('/vendor/dashboard/stats').then(setStats).catch(() => {});
  }, [isAuthenticated, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <VendorLayout title={title} stats={stats}>
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="text-center py-16 px-12 max-w-md">
          <CardContent>
            {Icon && <Icon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />}
            <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
            <p className="text-sm text-muted-foreground">
              {description || 'This feature is coming in the next update.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
}
