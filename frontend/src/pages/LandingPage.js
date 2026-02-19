import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Leaf, Sun, Droplets, Search, ArrowRight, Building2, 
  Users, TrendingUp, MapPin, ChevronRight, Sparkles,
  TreePine, Wind, BarChart3, Shield
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
      title: 'Community Initiatives',
      description: 'Rally support for local green projects. Become a champion for change.'
    }
  ];

  const solutions = [
    { icon: Leaf, name: 'Terrace Greening', color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: Sun, name: 'Rooftop Solar', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { icon: Droplets, name: 'Rainwater Harvesting', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Wind, name: 'Air Quality', color: 'text-cyan-500', bg: 'bg-cyan-500/10' }
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
                  Hyperlocal Climate Action Platform
                </Badge>
              </motion.div>
              
              <motion.h1 
                variants={fadeInUp}
                className="text-5xl md:text-7xl font-heading font-bold tracking-tight leading-none"
              >
                Transform Your{' '}
                <span className="text-gradient">Rooftop</span>{' '}
                Into Climate Action
              </motion.h1>
              
              <motion.p 
                variants={fadeInUp}
                className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl"
              >
                Discover your building's green potential. Get AI-powered recommendations 
                for terrace gardens, solar panels, and water harvesting. Connect with 
                verified providers and join community initiatives.
              </motion.p>
              
              {/* Search Form */}
              <motion.form 
                variants={fadeInUp}
                onSubmit={handleSearch}
                className="flex gap-3 max-w-lg"
              >
                <div className="relative flex-1">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter your building address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-14 text-lg bg-card border-border"
                    data-testid="hero-search-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="h-14 px-8 rounded-full btn-primary"
                  data-testid="hero-search-btn"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Analyze
                </Button>
              </motion.form>
              
              {/* Quick Stats */}
              {stats && (
                <motion.div 
                  variants={fadeInUp}
                  className="flex flex-wrap gap-8 pt-4"
                >
                  <div>
                    <div className="text-3xl font-heading font-bold text-primary">
                      {formatNumber(stats.buildings_analyzed)}+
                    </div>
                    <div className="text-sm text-muted-foreground">Buildings Analyzed</div>
                  </div>
                  <div>
                    <div className="text-3xl font-heading font-bold text-primary">
                      {stats.cities_covered}
                    </div>
                    <div className="text-sm text-muted-foreground">Cities</div>
                  </div>
                  <div>
                    <div className="text-3xl font-heading font-bold text-primary">
                      {stats.active_providers}+
                    </div>
                    <div className="text-sm text-muted-foreground">Providers</div>
                  </div>
                </motion.div>
              )}
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
                
                {/* Floating Cards */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute bottom-8 left-8 right-8"
                >
                  <Card className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/20">
                            <Leaf className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">Sample Analysis</div>
                            <div className="text-sm text-muted-foreground">DLF Cyber City, Gurugram</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-heading font-bold text-primary">87%</div>
                          <div className="text-xs text-muted-foreground">Green Potential</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
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
                  <Card className="p-6 bg-primary text-primary-foreground">
                    <div className="text-4xl font-heading font-bold mb-2">95%</div>
                    <div className="text-sm opacity-90">Calculation Accuracy</div>
                  </Card>
                </div>
                <div className="space-y-4 pt-8">
                  <Card className="p-6 bg-card border-primary/20">
                    <Shield className="h-8 w-8 text-primary mb-3" />
                    <div className="font-heading font-medium mb-1">Verified Providers</div>
                    <div className="text-sm text-muted-foreground">All partners are certified and reviewed</div>
                  </Card>
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
              <Link to="/initiatives">
                <Button size="lg" variant="outline" className="rounded-full text-lg px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" data-testid="view-initiatives-btn">
                  View Initiatives
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
