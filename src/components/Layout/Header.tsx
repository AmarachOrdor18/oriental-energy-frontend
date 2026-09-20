import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { CalendarClock, ChevronRight, Moon } from 'lucide-react';
import NotificationCenter from '../NotificationCenter';
import { useAuth } from '../../lib/auth';
import { breadcrumbsFor } from './Sidebar';

export default function Header() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) { root.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { root.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDark]);

  const breadcrumbs = breadcrumbsFor(location);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-40 sticky top-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 shadow-sm">
          <CalendarClock className="h-3.5 w-3.5 text-gold-600" />
          <span>Accounting period: May 2026</span>
        </div>

        {/* Breadcrumbs */}
        <nav className="hidden md:flex items-center gap-2 text-[13px] font-medium">
          {breadcrumbs.map((bc, idx) => (
            <span key={bc.path} className="flex items-center gap-2">
              {idx > 0 && <ChevronRight className="h-3 w-3 text-gray-300" />}
              <Link
                href={bc.path}
                className={idx === breadcrumbs.length - 1
                  ? 'text-navy-900 font-bold'
                  : 'text-gray-400 hover:text-navy-700 transition-colors'}
              >
                {bc.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <p className="hidden lg:block text-[11px] text-gray-400 font-bold tracking-widest uppercase">
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
        </p>

        <div className="flex items-center gap-3 border-l border-gray-100 pl-4">
          <button
            onClick={() => setIsDark(prev => !prev)}
            title={isDark ? 'Light mode' : 'Dark mode'}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <Moon
              className={`h-4 w-4 ${isDark
                ? 'text-gold-500 drop-shadow-sm'
                : ''
              }`}
              style={{ transform: isDark ? 'rotate(20deg) scale(1.05)' : 'rotate(0deg)' }}
            />
          </button>

          <NotificationCenter />

          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-navy-100 border border-teal-200 flex items-center justify-center text-navy-700 font-bold text-xs">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[13px] font-bold text-navy-900 leading-none">{user?.name}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
