import { CalendarClock, ChevronDown } from 'lucide-react';
import NotificationCenter from '../NotificationCenter';
import { useAuth } from '../../lib/auth';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-background/95 border-b border-border flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-text_secondary">
          <CalendarClock className="h-4 w-4 text-primary" />
          <span>Accounting period: May 2026</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NotificationCenter />

        <div className="h-8 w-px bg-border mx-2 hidden sm:block" />

        <button className="flex items-center gap-3 hover:bg-surface p-1.5 rounded-lg transition-colors">
          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-text_primary leading-none">{user?.name}</p>
            <p className="text-[10px] text-text_secondary font-medium mt-1">
              {user?.department_code || 'HQ'} / {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-text_secondary hidden sm:block" />
        </button>
      </div>
    </header>
  );
}
