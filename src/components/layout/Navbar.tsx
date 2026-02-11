import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, Menu, X, Search, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/contexts/FavoritesContext';
import logo from '@/assets/logo.png';

export function Navbar() {
  const { itemCount } = useCart();
  const { favoritesCount } = useFavorites();
  const { user, isAdmin, isModerator, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const navLinks = [
    { href: '/shop', label: 'Shop' },
    { href: '/shop?category=tops-and-more', label: 'Tops & more' },
    { href: '/shop?category=leggings', label: 'Leggings' },
    { href: '/shop?category=pants', label: 'Pants' },
  ];

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    navigate(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : '/shop');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" onClick={handleLogoClick}>
          <img
            src={logo}
            alt="DRIPPSS"
            className="h-[160px] md:h-[170px] w-auto"
          />
        </Link>

        {/* Desktop Search */}
        <div className="hidden md:flex flex-1 items-center px-6">
          <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-10 w-full rounded-full pl-9 pr-4"
            />
          </form>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/favorites" className="relative">
            <Button variant="ghost" size="icon">
              <Heart className={cn("h-5 w-5", favoritesCount > 0 && "text-primary")} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {favoritesCount}
                </span>
              )}
            </Button>
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm">
                    Admin
                  </Button>
                </Link>
              )}
              {isModerator && (
                <Link to="/moderator">
                  <Button variant="ghost" size="sm">
                    Moderator
                  </Button>
                </Link>
              )}
              <Link to="/orders">
                <Button variant="ghost" size="sm">
                  Orders
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          )}

          <Link to="/cart" className="relative">
            <Button variant="ghost" size="icon">
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link to="/favorites" className="relative">
            <Button variant="ghost" size="icon">
              <Heart className={cn("h-5 w-5", favoritesCount > 0 && "text-primary")} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {favoritesCount}
                </span>
              )}
            </Button>
          </Link>
          <Link to="/cart" className="relative">
            <Button variant="ghost" size="icon">
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300',
            mobileMenuOpen ? 'max-h-96' : 'max-h-0'
          )}
        >
        <div className="container mx-auto px-4 py-4 space-y-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-10 w-full rounded-full pl-9 pr-4"
            />
          </form>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/favorites"
            className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            Favorites
          </Link>
          <div className="pt-4 border-t border-gray-200 space-y-2">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Admin
                    </Button>
                  </Link>
                )}
                {isModerator && (
                  <Link to="/moderator" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Moderator
                    </Button>
                  </Link>
                )}
                <Link to="/orders" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    My Orders
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="default" className="w-full">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
