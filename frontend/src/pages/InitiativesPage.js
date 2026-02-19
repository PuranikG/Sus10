import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Target, TrendingUp, MapPin, Calendar,
  Plus, ChevronRight, Heart, HandHeart, Sparkles, ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { apiRequest, formatCurrency } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function InitiativesPage() {
  const { isAuthenticated } = useAuth();
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitiatives = async () => {
      try {
        const data = await apiRequest('/initiatives?limit=20');
        setInitiatives(data);
      } catch (error) {
        console.error('Failed to fetch initiatives:', error);
        setInitiatives([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitiatives();
  }, []);

  const initiativeTypes = {
    society: { label: 'Society', color: 'bg-blue-500/10 text-blue-500' },
    corporate: { label: 'Corporate', color: 'bg-purple-500/10 text-purple-500' },
    community: { label: 'Community', color: 'bg-green-500/10 text-green-500' },
    ngo: { label: 'NGO', color: 'bg-orange-500/10 text-orange-500' },
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 to-accent/5 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="container-max section-padding py-16 relative z-10">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Community Initiatives
            </Badge>
            <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tight mb-4">
              Rally for{' '}
              <span className="text-gradient">Climate Action</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Join community-driven initiatives to green your neighborhood. 
              Become a champion, pledge support, and track collective impact.
            </p>
            {isAuthenticated ? (
              <Link to="/initiatives/new">
                <Button size="lg" className="rounded-full" data-testid="create-initiative-btn">
                  <Plus className="h-5 w-5 mr-2" />
                  Start an Initiative
                </Button>
              </Link>
            ) : (
              <Button size="lg" className="rounded-full" disabled>
                Sign in to Create Initiative
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 border-b border-border bg-card/50">
        <div className="container-max section-padding">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard icon={Users} label="Active Champions" value="25+" />
            <StatCard icon={Target} label="Initiatives" value={initiatives.length.toString()} />
            <StatCard icon={TrendingUp} label="Funding Raised" value="₹12.5L" />
            <StatCard icon={Heart} label="Pledges Made" value="150+" />
          </div>
        </div>
      </section>

      {/* Initiatives List */}
      <section className="py-12">
        <div className="container-max section-padding">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-heading font-semibold mb-2">Active Initiatives</h2>
              <p className="text-muted-foreground">Join the movement and support local green projects</p>
            </div>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48" />
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : initiatives.length === 0 ? (
            <Card className="p-12 text-center">
              <Target className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-heading font-medium mb-2">No initiatives yet</h3>
              <p className="text-muted-foreground mb-6">
                Be the first to start a community initiative in your area.
              </p>
              {isAuthenticated && (
                <Link to="/initiatives/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Initiative
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {initiatives.map((initiative, index) => (
                <InitiativeCard
                  key={initiative.initiative_id}
                  initiative={initiative}
                  typeInfo={initiativeTypes[initiative.initiative_type]}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container-max section-padding text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Become a Climate Champion
          </h2>
          <p className="text-lg opacity-90 max-w-xl mx-auto mb-8">
            Lead the change in your community. Start an initiative, rally supporters, 
            and make a lasting impact on your neighborhood's sustainability.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/initiatives/new">
              <Button size="lg" variant="secondary" className="rounded-full" data-testid="start-initiative-btn">
                Start Your Initiative
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="text-center">
      <Icon className="h-6 w-6 mx-auto text-primary mb-2" />
      <div className="text-2xl font-heading font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function InitiativeCard({ initiative, typeInfo, index }) {
  const fundingProgress = initiative.funding_goal 
    ? Math.min(100, (initiative.funding_pledged / initiative.funding_goal) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/initiatives/${initiative.initiative_id}`} data-testid={`initiative-card-${initiative.initiative_id}`}>
        <Card className="h-full card-hover overflow-hidden group">
          {/* Header Image */}
          <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 relative">
            <div className="absolute inset-0 grid-pattern opacity-30" />
            <div className="absolute top-4 left-4 right-4 flex justify-between">
              {typeInfo && (
                <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
              )}
              {initiative.visibility === 'public' && (
                <Badge variant="outline" className="bg-background/80">Public</Badge>
              )}
            </div>
          </div>

          <CardContent className="p-6">
            <h3 className="font-heading font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-1">
              {initiative.title}
            </h3>
            
            {initiative.area && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <MapPin className="h-4 w-4" />
                <span>{initiative.area}</span>
              </div>
            )}

            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {initiative.description}
            </p>

            {/* Funding Progress */}
            {initiative.funding_goal && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{formatCurrency(initiative.funding_pledged || 0)}</span>
                  <span className="text-muted-foreground">of {formatCurrency(initiative.funding_goal)}</span>
                </div>
                <Progress value={fundingProgress} className="h-2" />
              </div>
            )}

            {/* Impact Goal */}
            {initiative.impact_goal && (
              <div className="flex items-center gap-2 text-sm p-3 bg-primary/5 rounded-lg">
                <Target className="h-4 w-4 text-primary" />
                <span>
                  Goal: {initiative.impact_goal.target} {initiative.impact_goal.unit}
                </span>
              </div>
            )}

            {/* Team */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="flex -space-x-2">
                {(initiative.team_members || []).slice(0, 4).map((_, i) => (
                  <Avatar key={i} className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {String.fromCharCode(65 + i)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {(initiative.team_members || []).length > 4 && (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                    +{initiative.team_members.length - 4}
                  </div>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
