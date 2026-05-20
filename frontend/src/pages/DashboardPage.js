import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Building2, Users, FileText, Settings,
  TrendingUp, AlertCircle, CheckCircle2, Clock, ChevronRight,
  Leaf, Sun, Target, Bell, Search
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { apiRequest, formatCurrency } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentBuildings, setRecentBuildings] = useState([]);
  const [userLeads, setUserLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsData, buildingsData, leadsData] = await Promise.all([
          apiRequest('/stats/overview'),
          apiRequest('/buildings/search?limit=5'),
          apiRequest('/leads/user').catch(() => [])
        ]);
        setStats(statsData);
        setRecentBuildings(buildingsData);
        setUserLeads(leadsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const quickActions = [
    { 
      icon: Building2, 
      label: 'Search Buildings', 
      href: '/search',
      description: 'Find buildings to analyze'
    },
    { 
      icon: LayoutDashboard, 
      label: 'Projects / Portfolios', 
      href: '/projects',
      description: 'Group buildings for ESG rollup'
    },
    { 
      icon: Users, 
      label: 'Find Providers', 
      href: '/providers',
      description: 'Connect with experts'
    },
    { 
      icon: Target, 
      label: 'View Initiatives', 
      href: '/initiatives',
      description: 'Join community projects'
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container-max section-padding py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight mb-1">
              Welcome back, {user?.name?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your sustainability journey
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="icon" data-testid="notifications-btn">
              <Bell className="h-5 w-5" />
            </Button>
            <Link to="/search">
              <Button data-testid="new-analysis-btn">
                <Search className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={action.href} data-testid={`quick-action-${action.label.toLowerCase().replace(/\s/g, '-')}`}>
                <Card className="card-hover h-full">
                  <CardContent className="p-4">
                    <action.icon className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-heading font-medium">{action.label}</h3>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <Card key={`stat-skel-${i}`}>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <>
                  <StatCard
                    icon={Building2}
                    label="Buildings"
                    value={stats?.buildings_analyzed || 0}
                  />
                  <StatCard
                    icon={Users}
                    label="Providers"
                    value={stats?.active_providers || 0}
                  />
                  <StatCard
                    icon={Target}
                    label="Initiatives"
                    value={stats?.community_initiatives || 0}
                  />
                  <StatCard
                    icon={Leaf}
                    label="Cities"
                    value={stats?.cities_covered || 0}
                  />
                </>
              )}
            </div>

            {/* Recent Buildings */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Buildings</CardTitle>
                  <CardDescription>Buildings available for analysis</CardDescription>
                </div>
                <Link to="/search">
                  <Button variant="ghost" size="sm">
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={`bldg-skel-${i}`} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentBuildings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No buildings available yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentBuildings.slice(0, 5).map((building) => (
                      <Link
                        key={building.building_id}
                        to={`/buildings/${building.building_id}`}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid={`recent-building-${building.building_id}`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{building.address}</div>
                          <div className="text-sm text-muted-foreground">
                            {building.city} • {building.usable_terrace_area?.toLocaleString()} sqm
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Leads */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>My Leads</CardTitle>
                  <CardDescription>Your project inquiries</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <Skeleton key={`lead-skel-${i}`} className="h-16" />
                    ))}
                  </div>
                ) : userLeads.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground mb-4">No leads yet</p>
                    <Link to="/search">
                      <Button variant="outline" size="sm">
                        Start Your First Analysis
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userLeads.slice(0, 5).map((lead) => (
                      <div
                        key={lead.lead_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            lead.lead_status === 'new' ? 'bg-blue-500' :
                            lead.lead_status === 'contacted' ? 'bg-yellow-500' :
                            lead.lead_status === 'won' ? 'bg-green-500' : 'bg-muted-foreground'
                          }`} />
                          <div>
                            <div className="font-medium text-sm">Lead #{lead.lead_id.slice(-6)}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {lead.lead_status?.replace(/_/g, ' ')}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">{lead.timeline || 'Flexible'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="text-xl">
                      {user?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-heading font-semibold">{user?.name}</div>
                    <div className="text-sm text-muted-foreground">{user?.email}</div>
                    <Badge variant="secondary" className="mt-1 capitalize">
                      {user?.user_type || 'Individual'}
                    </Badge>
                  </div>
                </div>
                <Link to="/profile">
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ActivityItem
                    icon={CheckCircle2}
                    title="Platform launched"
                    description="Sus10 AI is now live"
                    time="Today"
                    iconColor="text-green-500"
                  />
                  <ActivityItem
                    icon={Building2}
                    title="Buildings added"
                    description="New buildings available for analysis"
                    time="Today"
                    iconColor="text-primary"
                  />
                  <ActivityItem
                    icon={Users}
                    title="Providers onboarded"
                    description="Verified providers now available"
                    time="Today"
                    iconColor="text-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <Leaf className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-heading font-semibold mb-2">Pro Tip</h3>
                <p className="text-sm text-muted-foreground">
                  Start with a building analysis to discover your rooftop's green potential. 
                  You can then connect with providers and even start community initiatives.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <TrendingUp className="h-4 w-4 text-green-500" />
        </div>
        <div className="text-2xl font-heading font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ icon: Icon, title, description, time, iconColor }) {
  return (
    <div className="flex gap-3">
      <div className={`mt-0.5 ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="text-xs text-muted-foreground">{time}</div>
    </div>
  );
}
