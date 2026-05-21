import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Leaf, Sun, Droplets, Search, ArrowRight, Building2, 
  Users, TrendingUp, MapPin, ChevronRight, Sparkles,
  TreePine, Recycle, BarChart3, Shield, Info, TrendingDown,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { useAuth } from '../context/AuthContext';
import { apiRequest, formatNumber } from '../lib/utils';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  const { login, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiRequest('/stats/overview');
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const features = [
    {
      icon: Building2,
      title: 'Building Analysis',
      description: 'AI-powered assessment of rooftop potential for greening, solar, and water harvesting.'
    },
    {
      icon: BarChart3,
      title: 'Impact Reports',
      description: 'Detailed 5-page reports with full calculation transparency and explainability.'
    },
    {
      icon: Users,
      title: 'Provider Network',
      description: 'Connect with verified solution providers - landscapers, solar installers, and more.'
    },
    {
      icon: TreePine,
      title: 'Subsidies & Financing',
      description: 'Discover central + state subsidies, CFAs, loans and net-metering for your building.'
    }
  ];

  const solutions = [
    { icon: Leaf, name: 'Terrace Greening', color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: Sun, name: 'Rooftop Solar', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { icon: Droplets, name: 'Rainwater Harvesting', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Recycle, name: 'Biogas / Climate Tech', color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        
        {/* Floating Elements */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="container-max section-padding relative z-10 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <motion.div 
              className="space-y-8"
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp}>
                <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Climate action starts from home
                </Badge>
              </motion.div>
              
              <motion.h1 
                variants={fadeInUp}
                className="text-5xl md:text-7xl font-heading font-bold tracking-tight leading-none"
              >
                Imagine a Rooftop that{' '}
                <span className="text-gradient">Pays You Back</span>
              </motion.h1>
              
              <motion.p 
                variants={fadeInUp}
                className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl"
              >
                With lower bills, fresh food, cleaner air & water, and a thriving lifestyle.
                Discover your building's integrated 4-pillar potential — solar, biogas,
                rainwater, and green roofing — in 60 seconds.
              </motion.p>

              {/* FD-beating payback trust line */}
              <motion.div variants={fadeInUp} className="flex items-center gap-2 max-w-lg text-sm">
                <TrendingDown className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-foreground/80">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Payback that beats FD rates</span>
                  <span className="text-muted-foreground"> · proven by independent experts · backed by MNRE / CPCB / IMD reference data</span>
                </span>
              </motion.div>
              
              {/* Calculator-first CTA — primary homeowner path */}
              <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-3 max-w-lg">
                <Link to="/calculate" data-testid="hero-calculate-cta">
                  <Button size="lg" className="h-12 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Calculate your roof potential
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <span className="text-sm text-muted-foreground">
                  60 seconds · No login · Free integrated report
                </span>
              </motion.div>
              
            </motion.div>
            
            {/* Right Column - Hero Image */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.pexels.com/photos/29206495/pexels-photo-29206495.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                  alt="Green building rooftop"
                  className="w-full h-[600px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Persona Switcher — pre-launch teasers */}
      <section className="py-20 border-y border-border bg-background" data-testid="persona-switcher">
        <div className="container-max section-padding">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3" data-testid="persona-eyebrow">For everyone with a rooftop</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-semibold tracking-tight mb-2">
              Tell us who you are. We'll show you what's possible.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sus10 AI is launching in private beta. Pick the page that fits you, take a short survey, and we'll
              get you onto the platform first.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              {
                slug: 'for-homeowners',
                title: "I'm a Homeowner",
                blurb: "Turn your rooftop into power, food, water and a cooler home.",
                accent: '#1a3d2b',
                eyebrow: 'Citizens',
                testid: 'persona-card-homeowner',
              },
              {
                slug: 'for-communities',
                title: "I'm RWA / Housing Society",
                blurb: 'Coordinate solar, water, gardens and biogas across your colony.',
                accent: '#0f3a3a',
                eyebrow: 'RWAs & Societies',
                testid: 'persona-card-rwa',
              },
              {
                slug: 'for-installers',
                title: "I'm a Solution Provider",
                blurb: 'Leads, verified profile, integrated-roof brochure, subsidy navigation.',
                accent: '#1e3a8a',
                eyebrow: 'Vendors & Installers',
                testid: 'persona-card-vendor',
              },
            ].map((p) => {
              const isHomeownerAspirational = p.slug === 'for-homeowners';
              const isInstaller = p.slug === 'for-installers';
              const href = isHomeownerAspirational
                ? '/calculate'
                : isInstaller
                ? '/for-installers/brochure'
                : `/${p.slug}`;
              const ctaText = isHomeownerAspirational
                ? 'Calculate my potential'
                : isInstaller
                ? 'Get my free brochure'
                : 'Read & take the survey';
              return (
              <Link
                key={p.slug}
                to={href}
                className="group rounded-2xl border bg-card p-6 hover:shadow-md transition-all relative overflow-hidden"
                data-testid={p.testid}
              >
                <div
                  className="absolute top-0 left-0 h-1 w-full"
                  style={{ backgroundColor: p.accent }}
                />
                <div className="text-xs uppercase tracking-wider mb-2" style={{ color: p.accent }}>
                  {p.eyebrow}
                </div>
                <h3 className="text-lg font-semibold mb-1">{p.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{p.blurb}</p>
                <span
                  className="inline-flex items-center text-sm font-medium group-hover:gap-2 gap-1 transition-all"
                  style={{ color: p.accent }}
                >
                  {ctaText}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-24 bg-card/50">
        <div className="container-max section-padding">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4">Solutions</Badge>
            <h2 className="text-4xl md:text-5xl font-heading font-semibold tracking-tight mb-4">
              Multiple Pathways to Sustainability
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From green rooftops to solar energy, discover solutions tailored to your building's unique potential.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {solutions.map((solution, index) => (
              <motion.div
                key={solution.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full card-hover border-border/50 bg-card">
                  <CardContent className="p-6 text-center">
                    <div className={`inline-flex p-4 rounded-2xl ${solution.bg} mb-4`}>
                      <solution.icon className={`h-8 w-8 ${solution.color}`} />
                    </div>
                    <h3 className="text-xl font-heading font-medium mb-2">{solution.name}</h3>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container-max section-padding">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Badge variant="outline" className="mb-4">How It Works</Badge>
              <h2 className="text-4xl md:text-5xl font-heading font-semibold tracking-tight mb-6">
                From Analysis to Action
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our AI-powered platform guides you through every step - from discovering 
                your building's potential to connecting with implementation partners.
              </p>
              
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-4"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-medium mb-1">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-8 flex gap-4">
                <Link to="/search">
                  <Button size="lg" className="rounded-full btn-primary" data-testid="explore-buildings-btn">
                    Explore Buildings
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/providers">
                  <Button size="lg" variant="outline" className="rounded-full" data-testid="find-providers-btn">
                    Find Providers
                  </Button>
                </Link>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Card className="glass-card overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1765572810664-f2504b7b9dc4?crop=entropy&cs=srgb&fm=jpg&q=85&w=400"
                      alt="Solar panels"
                      className="w-full h-48 object-cover"
                    />
                  </Card>
                  <TooltipProvider delayDuration={120}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card className="p-6 bg-primary text-primary-foreground cursor-help" data-testid="trust-accuracy-card">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-4xl font-heading font-bold mb-2">95%</div>
                              <div className="text-sm opacity-90 flex items-center gap-1">
                                Calculation Accuracy
                                <Info className="h-3.5 w-3.5 opacity-70" />
                              </div>
                            </div>
                          </div>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs leading-relaxed">
                        <strong>How we get to 95%:</strong> Estimates use MNRE GHI atlas (solar irradiance),
                        CPCB organic-waste norms (biogas), IMD rainfall data (RWH), and CEA grid emission
                        factors. Each pillar's formula is published and explainable on the building report.
                        The remaining ~5% comes from site-specific factors only a survey can capture
                        (shading, slab strength, plumbing geometry).
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="space-y-4 pt-8">
                  <TooltipProvider delayDuration={120}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card className="p-6 bg-card border-primary/20 cursor-help" data-testid="trust-verified-card">
                          <Shield className="h-8 w-8 text-primary mb-3" />
                          <div className="font-heading font-medium mb-1 flex items-center gap-1">
                            Verified Providers <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="text-sm text-muted-foreground">All partners are certified and reviewed</div>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs leading-relaxed">
                        <strong>Our verification:</strong> Each provider in our directory submits proof of
                        MNRE / IGBC / state certifications, GST registration, 3 reference projects, and a
                        signed code-of-conduct. Sus10 reviews submissions monthly and audits leads quarterly.
                        Provider profiles show their verification badges + last-reviewed date.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Card className="glass-card overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1768224123432-729e0a6fed58?crop=entropy&cs=srgb&fm=jpg&q=85&w=400"
                      alt="Green rooftop"
                      className="w-full h-48 object-cover"
                    />
                  </Card>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 grid-pattern" />
        </div>
        
        <div className="container-max section-padding relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight mb-6">
              Ready to Green Your Building?
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
              Join hundreds of building owners who are already making a difference. 
              Start your sustainability journey today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button size="lg" variant="secondary" className="rounded-full text-lg px-8" data-testid="go-to-dashboard-btn">
                    Go to Dashboard
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="rounded-full text-lg px-8"
                  onClick={login}
                  data-testid="get-started-btn"
                >
                  Get Started Free
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              <Link to="/insights">
                <Button size="lg" variant="outline" className="rounded-full text-lg px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" data-testid="view-insights-btn">
                  See city insights
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
