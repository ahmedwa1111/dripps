import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Youtube } from 'lucide-react';
import logo from '@/assets/logo.png';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    shop: [
      { href: '/shop', label: 'All Products' },
      { href: '/shop?category=tops-and-more', label: 'Tops & more' },
      { href: '/shop?category=leggings', label: 'Leggings' },
      { href: '/shop?category=pants', label: 'Pants' },
    ],
    company: [
      { href: '#', label: 'About Us' },
      { href: '#', label: 'Careers' },
      { href: '#', label: 'Press' },
      { href: '#', label: 'Stores' },
    ],
    help: [
      { href: '#', label: 'FAQ' },
      { href: '#', label: 'Shipping' },
      { href: '#', label: 'Returns' },
      { href: '#', label: 'Contact Us' },
    ],
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block" onClick={handleLogoClick}>
              <img
                src={logo}
                alt="DRIPPSS"
                className="h-[160px] md:h-[120px] w-auto"
              />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Elevate your style with premium streetwear. Bold designs, quality materials,
              and the confidence to stand out.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Shop</h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.href}>
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

          {/* Company Links */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Help Links */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Help</h4>
            <ul className="space-y-3">
              {footerLinks.help.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              (c) {currentYear} Drippss. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                to="/privacy-policy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline decoration-purple-400/80"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline decoration-purple-400/80"
              >
                Terms &amp; Conditions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
