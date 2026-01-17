
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-64 h-10 bg-muted/50 rounded-md flex items-center px-3 border border-transparent focus-within:border-primary">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <input
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground"
            placeholder="Search workflows..."
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
          CN
        </div>
      </div>
    </header>
  );
}
