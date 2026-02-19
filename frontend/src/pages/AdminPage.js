import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Settings, Users, Building2, Flag, ToggleLeft, ToggleRight,
  Shield, RefreshCw, Check, X, ChevronRight, Plus, Eye, EyeOff
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { apiRequest, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import Navbar from '../components/layout/Navbar';
import { toast } from 'sonner';

export default function AdminPage() {
  const { user } = useAuth();
  const { flags, refreshFlags } = useFeatureFlags();
  const [buildings, setBuildings] = useState([]);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [buildingsData, providersData, flagsData] = await Promise.all([
          apiRequest('/admin/buildings?limit=50'),
          apiRequest('/admin/providers/pending'),
          apiRequest('/feature-flags')
        ]);
        setBuildings(buildingsData);
        setPendingProviders(providersData);
        setFeatureFlags(flagsData);
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
        toast.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const handleToggleFeature = async (flagName, newValue) => {
    try {
      await apiRequest(`/admin/feature-flags/${flagName}`, {
        method: 'PUT',
        body: JSON.stringify({ is_enabled: newValue })
      });
      
      setFeatureFlags(prev => 
        prev.map(f => f.name === flagName ? { ...f, is_enabled: newValue } : f)
      );
      refreshFlags();
      toast.success(`Feature "${flagName}" ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update feature flag');
    }
  };

  const handleApproveBuilding = async (buildingId) => {
    try {
      await apiRequest(`/admin/buildings/${buildingId}/approve`, { method: 'PUT' });
      setBuildings(prev => 
        prev.map(b => b.building_id === buildingId ? { ...b, is_approved: true } : b)
      );
      toast.success('Building approved');
    } catch (error) {
      toast.error('Failed to approve building');
    }
  };

  const handleApproveProvider = async (providerId) => {
    try {
      await apiRequest(`/admin/providers/${providerId}/approve`, { method: 'POST' });
      setPendingProviders(prev => prev.filter(p => p.provider_id !== providerId));
      toast.success('Provider approved');
    } catch (error) {
      toast.error('Failed to approve provider');
    }
  };

  if (user?.user_type !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-max section-padding py-20 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-heading font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need admin privileges to access this page.</p>
          <Link to="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container-max section-padding py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight mb-1">
              Admin Panel
            </h1>
            <p className="text-muted-foreground">
              Manage buildings, providers, and platform features
            </p>
          </div>
          <Badge className="bg-primary">
            <Shield className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
        </div>

        <Tabs defaultValue="feature-flags" className="space-y-6">
          <TabsList>
            <TabsTrigger value="feature-flags" data-testid="tab-feature-flags">
              <Flag className="h-4 w-4 mr-2" />
              Feature Flags
            </TabsTrigger>
            <TabsTrigger value="buildings" data-testid="tab-buildings">
              <Building2 className="h-4 w-4 mr-2" />
              Buildings
            </TabsTrigger>
            <TabsTrigger value="providers" data-testid="tab-providers">
              <Users className="h-4 w-4 mr-2" />
              Providers
            </TabsTrigger>
          </TabsList>

          {/* Feature Flags Tab */}
          <TabsContent value="feature-flags">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5" />
                  Feature Flags
                </CardTitle>
                <CardDescription>
                  Toggle platform features on/off. Changes take effect immediately.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {featureFlags.map((flag) => (
                      <div
                        key={flag.flag_id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          {flag.is_enabled ? (
                            <Eye className="h-5 w-5 text-primary" />
                          ) : (
                            <EyeOff className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <div className="font-medium capitalize">{flag.name.replace(/_/g, ' ')}</div>
                            <div className="text-sm text-muted-foreground">{flag.description}</div>
                          </div>
                        </div>
                        <Switch
                          checked={flag.is_enabled}
                          onCheckedChange={(checked) => handleToggleFeature(flag.name, checked)}
                          data-testid={`toggle-${flag.name}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Buildings Tab */}
          <TabsContent value="buildings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Building Management</CardTitle>
                  <CardDescription>
                    Approve and manage buildings in the platform
                  </CardDescription>
                </div>
                <Button data-testid="add-building-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Building
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Address</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Area (sqm)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buildings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No buildings found
                          </TableCell>
                        </TableRow>
                      ) : (
                        buildings.map((building) => (
                          <TableRow key={building.building_id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {building.address}
                            </TableCell>
                            <TableCell>{building.city}</TableCell>
                            <TableCell className="capitalize">{building.building_type?.replace(/_/g, ' ')}</TableCell>
                            <TableCell>{building.usable_terrace_area?.toLocaleString()}</TableCell>
                            <TableCell>
                              {building.is_approved ? (
                                <Badge className="bg-green-500">Approved</Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {!building.is_approved && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleApproveBuilding(building.building_id)}
                                    data-testid={`approve-building-${building.building_id}`}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                <Link to={`/buildings/${building.building_id}`}>
                                  <Button size="sm" variant="ghost">
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Providers Tab */}
          <TabsContent value="providers">
            <Card>
              <CardHeader>
                <CardTitle>Provider Applications</CardTitle>
                <CardDescription>
                  Review and approve pending provider applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : pendingProviders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No pending provider applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingProviders.map((provider) => (
                      <div
                        key={provider.provider_id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{provider.company_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {provider.company_type} • {provider.service_areas?.join(', ')}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApproveProvider(provider.provider_id)}
                            data-testid={`approve-provider-${provider.provider_id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button variant="ghost" size="sm">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
