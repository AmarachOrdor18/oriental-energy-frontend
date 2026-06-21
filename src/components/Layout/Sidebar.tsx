import {
  LayoutDashboard, Users, Settings, LogOut,
  BarChart3, Inbox, User, Sun, Moon, FileText, Calendar, PieChart
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    if (isDark) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDark]);

  const role = user?.role || 'user';
  const userName = user?.name || 'Guest';

  const NavItem = ({ icon: Icon, label, path, active }: any) => (
    <button
      onClick={() => setLocation(path)}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group
        ${active ? 'bg-white/10 text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-sidebar_hover'}`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 transition-colors ${active ? 'text-accent' : 'text-white/60 group-hover:text-white'}`} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      {active && <div className="h-5 w-1 rounded-full bg-accent" />}
    </button>
  );

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  return (
    <aside className="w-64 bg-sidebar h-screen flex flex-col fixed left-0 top-0 z-50 text-white shadow-[16px_0_40px_-28px_rgba(3,30,24,0.75)]">
      <div className="px-5 pt-6 pb-6">
        <img
          src="/oriental-logo.jpg"
          alt="Oriental Energy Resources Limited"
          className="h-20 w-auto rounded-lg"
        />

      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-6 custom-scrollbar">
        <div>
          <label className="px-3 text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-3 block">Workspace</label>
          <div className="space-y-1">
            <NavItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" active={location === '/dashboard' || location === '/'} />
            <NavItem icon={Calendar} label="Daily Logging" path="/daily-logging" active={location.startsWith('/daily-logging')} />
            <NavItem icon={FileText} label="Submissions" path="/submissions" active={location === '/submissions'} />
          </div>
        </div>

        {(role === 'line_manager' || role === 'hod' || role === 'admin') && (
          <div>
            <label className="px-3 text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-3 block">Approvals</label>
            <div className="space-y-1">
              <NavItem icon={Users} label="Team Members" path="/team" active={location.startsWith('/team')} />
              <NavItem icon={Inbox} label="Review Queue" path="/approvals" active={location === '/approvals'} />
            </div>
          </div>
        )}

        {(role === 'finance' || role === 'admin') && (
          <div>
            <label className="px-3 text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-3 block">Finance</label>
            <div className="space-y-1">
              <NavItem icon={BarChart3} label="Finance Review" path="/finance" active={location === '/finance'} />
            </div>
          </div>
        )}

        {(role === 'finance' || role === 'admin' || role === 'line_manager' || role === 'hod') && (
          <div>
            <label className="px-3 text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-3 block">Reporting</label>
            <div className="space-y-1">
              <NavItem icon={PieChart} label="Reports" path="/reports" active={location === '/reports'} />
            </div>
          </div>
        )}

        {role === 'admin' && (
          <div>
            <label className="px-3 text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-3 block">Control</label>
            <div className="space-y-1">
              <NavItem icon={Settings} label="Administration" path="/admin" active={location === '/admin'} />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10 space-y-2">
        <button
          onClick={() => setIsDark(!isDark)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-sidebar_hover transition-all"
        >
          <div className="flex items-center gap-3">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="text-xs font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
        </button>

        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white/10 border border-white/10">
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-sidebar" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{userName}</p>
            <p className="text-[10px] text-white/50 font-medium truncate">{role.replace('_', ' ')}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs font-semibold"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
