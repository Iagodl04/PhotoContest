
import { useAuth } from '@/hooks/useAuth';
import { Camera, Grid3X3, Trophy, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Navigation() {
  const { isAdmin } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: Camera, label: 'Subir', path: '/subir' },
    { icon: Grid3X3, label: 'Galería', path: '/galeria' },
    { icon: Trophy, label: 'Ranking', path: '/ranking' },
    ...(isAdmin() ? [{ icon: Settings, label: 'Admin', path: '/admin' }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-colors",
                isActive
                  ? "text-purple-600 bg-purple-50"
                  : "text-gray-600 hover:text-purple-600 hover:bg-gray-50"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
