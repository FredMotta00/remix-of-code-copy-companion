import { Link, useLocation } from 'react-router-dom';
import { Package, Calendar, Settings, Menu, X, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import logoExs from '@/assets/logo-exs.png';

const Header = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Produtos', icon: Package },
    { to: '/minhas-reservas', label: 'Minhas Reservas', icon: Calendar }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center group">
          <img 
            src={logoExs} 
            alt="EXS Solutions" 
            className="h-10 w-auto object-contain"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}>
              <Button
                variant={isActive(to) ? 'default' : 'ghost'}
                className={`gap-2 font-medium transition-all duration-200 ${
                  isActive(to) 
                    ? 'shadow-md' 
                    : 'hover:bg-accent'
                }`}
                size="sm"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}
          <Link to="/auth">
            <Button variant="outline" size="sm" className="gap-2 ml-2">
              <LogIn className="h-4 w-4" />
              Login
            </Button>
          </Link>
          <Link to="/configuracoes">
            <Button
              variant={isActive('/configuracoes') ? 'default' : 'ghost'}
              className={`transition-all duration-200 ${
                isActive('/configuracoes') 
                  ? 'shadow-md' 
                  : 'hover:bg-accent'
              }`}
              size="icon"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-border/40 bg-card/95 backdrop-blur-sm p-4 space-y-2 animate-fade-in">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
            >
              <Button
                variant={isActive(to) ? 'default' : 'ghost'}
                className="w-full justify-start gap-2"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}
          <Link to="/auth" onClick={() => setMenuOpen(false)}>
            <Button variant="outline" className="w-full justify-start gap-2 mt-2">
              <LogIn className="h-4 w-4" />
              Login
            </Button>
          </Link>
          <Link to="/configuracoes" onClick={() => setMenuOpen(false)}>
            <Button
              variant={isActive('/configuracoes') ? 'default' : 'ghost'}
              className="w-full justify-start gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
          </Link>
        </nav>
      )}
    </header>
  );
};

export default Header;