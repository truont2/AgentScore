
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface NavLinkProps {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export function NavLink({ href, icon: Icon, children }: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}
