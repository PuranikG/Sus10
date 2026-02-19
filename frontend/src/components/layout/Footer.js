import { Link } from 'react-router-dom';
import { Leaf, Github, Twitter, Linkedin, Mail } from 'lucide-react';
import { Separator } from '../ui/separator';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Platform: [
      { label: 'Building Search', href: '/search' },
      { label: 'Solution Providers', href: '/providers' },
      { label: 'Community Initiatives', href: '/initiatives' },
      { label: 'Green Reports', href: '/search' },
    ],
    Solutions: [
      { label: 'Terrace Greening', href: '/solutions/greening' },
      { label: 'Rooftop Solar', href: '/solutions/solar' },
      { label: 'Rainwater Harvesting', href: '/solutions/water' },
      { label: 'Air Quality', href: '/solutions/air' },
    ],
    Company: [
      { label: 'About Us', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  };

  return (
    <footer className="bg-card border-t border-border">
      <div className="container-max section-padding py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-primary/10">
                <Leaf className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-heading font-bold">Sus10 AI</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6">
              Hyperlocal climate action platform for building sustainability in India.
            </p>
            <div className="flex gap-3">
              <a href="#" className="p-2 rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-heading font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Sus10 AI. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with 💚 for a sustainable India
          </p>
        </div>
      </div>
    </footer>
  );
}
