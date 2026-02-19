import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Target, TrendingUp, MapPin, Calendar,
  ArrowLeft, ChevronRight, Heart, HandHeart, Share2,
  CheckCircle2, Circle, Clock, MessageSquare, Mail, Copy, Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { apiRequest, formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { toast } from 'sonner';

export default function InitiativeDetailPage() {
  const { initiativeId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [initiativeData, setInitiativeData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pledgeDialogOpen, setPledgeDialogOpen] = useState(false);

  useEffect(() => {
    const fetchInitiative = async () => {
      try {
        const [detailData, progress] = await Promise.all([
          apiRequest(`/initiatives/${initiativeId}`),
          apiRequest(`/initiatives/${initiativeId}/progress`)
        ]);
        setInitiativeData(detailData);
        setProgressData(progress);
      } catch (error) {
        console.error('Failed to fetch initiative:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitiative();
  }, [initiativeId]);

  if (loading) {
    return <InitiativeSkeleton />;
  }

  if (!initiativeData || !initiativeData.initiative) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-max section-padding py-20 text-center">
          <Target className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-heading font-bold mb-2">Initiative Not Found</h1>
          <p className="text-muted-foreground mb-6">The initiative you're looking for doesn't exist.</p>
          <Link to="/initiatives">
            <Button>Browse Initiatives</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const { initiative, pledges, champion } = initiativeData;
  const fundingProgress = initiative.funding_goal 
    ? Math.min(100, (initiative.funding_pledged / initiative.funding_goal) * 100)
    : 0;

  const initiativeTypes = {
    society: { label: 'Society', color: 'bg-blue-500/10 text-blue-500' },
    corporate: { label: 'Corporate', color: 'bg-purple-500/10 text-purple-500' },
    community: { label: 'Community', color: 'bg-green-500/10 text-green-500' },
    ngo: { label: 'NGO', color: 'bg-orange-500/10 text-orange-500' },
  };

  const typeInfo = initiativeTypes[initiative.initiative_type];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container-max section-padding py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/initiatives" className="hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span>Initiatives</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground truncate">{initiative.title}</span>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-2 mb-4">
                {typeInfo && (
                  <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                )}
                <Badge variant="outline">{initiative.visibility}</Badge>
              </div>

              <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-4">
                {initiative.title}
              </h1>

              <p className="text-lg text-muted-foreground mb-6">
                {initiative.description}
              </p>

              <div className="flex flex-wrap gap-6">
                {initiative.area && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{initiative.area}</span>
                  </div>
                )}
                {initiative.start_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{initiative.start_date} - {initiative.end_date || 'Ongoing'}</span>
                  </div>
                )}
              </div>

              {/* Champion */}
              {champion && (
                <div className="flex items-center gap-4 mt-6 pt-6 border-t border-border">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={champion.picture} />
                    <AvatarFallback>{champion.name?.[0] || 'C'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm text-muted-foreground">Led by</div>
                    <div className="font-medium">{champion.name}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Funding Card */}
            <Card>
              <CardContent className="p-6">
                {initiative.funding_goal ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-4xl font-heading font-bold text-primary mb-1">
                        {formatCurrency(initiative.funding_pledged || 0)}
                      </div>
                      <div className="text-muted-foreground">
                        raised of {formatCurrency(initiative.funding_goal)} goal
                      </div>
                    </div>
                    <Progress value={fundingProgress} className="h-3 mb-4" />
                    <div className="flex justify-between text-sm text-muted-foreground mb-6">
                      <span>{Math.round(fundingProgress)}% funded</span>
                      <span>{pledges?.length || 0} pledges</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center mb-6">
                    <Target className="h-12 w-12 mx-auto text-primary mb-3" />
                    <div className="font-heading font-semibold">Impact Initiative</div>
                    <div className="text-sm text-muted-foreground">
                      Join to volunteer or contribute
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {isAuthenticated ? (
                    <>
                      <Dialog open={pledgeDialogOpen} onOpenChange={setPledgeDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full" size="lg" data-testid="pledge-support-btn">
                            <Heart className="h-5 w-5 mr-2" />
                            Pledge Support
                          </Button>
                        </DialogTrigger>
                        <PledgeDialog
                          initiativeId={initiativeId}
                          hasFunding={!!initiative.funding_goal}
                          onSuccess={() => {
                            setPledgeDialogOpen(false);
                            // Refresh data
                            window.location.reload();
                          }}
                        />
                      </Dialog>
                      <InitiativeShareDropdown initiative={initiative} />
                    </>
                  ) : (
                    <Button className="w-full" size="lg" disabled>
                      Sign in to Pledge
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8">
        <div className="container-max section-padding">
          <Tabs defaultValue="progress" className="space-y-6">
            <TabsList>
              <TabsTrigger value="progress" data-testid="tab-progress">Progress</TabsTrigger>
              <TabsTrigger value="team" data-testid="tab-team">Team</TabsTrigger>
              <TabsTrigger value="pledges" data-testid="tab-pledges">Pledges</TabsTrigger>
            </TabsList>

            <TabsContent value="progress" className="space-y-6">
              {/* Impact Goal */}
              {initiative.impact_goal && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Impact Goal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl font-heading font-bold text-primary">
                        {initiative.impact_goal.target}
                      </span>
                      <span className="text-lg text-muted-foreground">
                        {initiative.impact_goal.unit}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {initiative.impact_goal.metric?.replace(/_/g, ' ')}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Milestones */}
              <Card>
                <CardHeader>
                  <CardTitle>Milestones</CardTitle>
                </CardHeader>
                <CardContent>
                  {progressData?.milestones && progressData.milestones.length > 0 ? (
                    <div className="space-y-4">
                      {progressData.milestones.map((milestone, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex-shrink-0 pt-1">
                            {milestone.status === 'completed' ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : milestone.status === 'in_progress' ? (
                              <Clock className="h-5 w-5 text-yellow-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 pb-4 border-b border-border last:border-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{milestone.description}</span>
                              <Badge variant={
                                milestone.status === 'completed' ? 'default' :
                                milestone.status === 'in_progress' ? 'secondary' : 'outline'
                              }>
                                {milestone.status?.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Target: {milestone.date}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No milestones defined yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team">
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    {progressData?.team_members?.length || 0} members working on this initiative
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(progressData?.team_members || []).map((memberId, index) => (
                      <Card key={memberId} className="bg-muted/50">
                        <CardContent className="p-4 flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {String.fromCharCode(65 + index)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">Team Member</div>
                            <div className="text-sm text-muted-foreground">
                              {index === 0 ? 'Champion' : 'Member'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pledges">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Pledges</CardTitle>
                  <CardDescription>
                    {pledges?.length || 0} people have pledged support
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pledges && pledges.length > 0 ? (
                    <div className="space-y-4">
                      {pledges.map((pledge, index) => (
                        <div key={pledge.pledge_id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                          <Avatar>
                            <AvatarFallback>
                              {String.fromCharCode(65 + index)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium">Supporter</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {pledge.pledge_type} pledge
                            </div>
                          </div>
                          {pledge.pledge_amount && (
                            <div className="text-right">
                              <div className="font-bold text-primary">
                                {formatCurrency(pledge.pledge_amount)}
                              </div>
                            </div>
                          )}
                          <Badge variant={
                            pledge.pledge_status === 'completed' ? 'default' :
                            pledge.pledge_status === 'committed' ? 'secondary' : 'outline'
                          }>
                            {pledge.pledge_status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No pledges yet. Be the first to support!
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function PledgeDialog({ initiativeId, hasFunding, onSuccess }) {
  const [pledgeType, setPledgeType] = useState('volunteering');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiRequest(`/initiatives/${initiativeId}/pledge`, {
        method: 'POST',
        body: JSON.stringify({
          pledge_type: pledgeType,
          pledge_amount: pledgeType === 'funding' ? parseInt(amount) : null,
        }),
      });
      toast.success('Pledge submitted successfully!');
      onSuccess();
    } catch (error) {
      toast.error('Failed to submit pledge');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Pledge Your Support</DialogTitle>
        <DialogDescription>
          Choose how you'd like to contribute to this initiative.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6 pt-4">
        <div className="space-y-4">
          <Label>Pledge Type</Label>
          <RadioGroup value={pledgeType} onValueChange={setPledgeType}>
            <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="volunteering" id="volunteering" />
              <Label htmlFor="volunteering" className="flex-1 cursor-pointer">
                <div className="font-medium">Volunteer</div>
                <div className="text-sm text-muted-foreground">
                  Contribute your time and skills
                </div>
              </Label>
              <HandHeart className="h-5 w-5 text-muted-foreground" />
            </div>
            {hasFunding && (
              <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="funding" id="funding" />
                <Label htmlFor="funding" className="flex-1 cursor-pointer">
                  <div className="font-medium">Funding</div>
                  <div className="text-sm text-muted-foreground">
                    Contribute financially
                  </div>
                </Label>
                <Heart className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="implementation" id="implementation" />
              <Label htmlFor="implementation" className="flex-1 cursor-pointer">
                <div className="font-medium">Implementation</div>
                <div className="text-sm text-muted-foreground">
                  Help with actual execution
                </div>
              </Label>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
          </RadioGroup>
        </div>

        {pledgeType === 'funding' && (
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="100"
              required
            />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Pledge'}
        </Button>
      </form>
    </DialogContent>
  );
}

function InitiativeSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="border-b border-border bg-card/50">
        <div className="container-max section-padding py-8">
          <Skeleton className="h-4 w-48 mb-4" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
