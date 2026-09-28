import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  LayoutDashboard, Users, Settings, LogOut,
  BarChart3, Inbox, FileText, Calendar, PieChart, Activity, Banknote, Target,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface NavItemDef {
  label: string;
  path: string;
  icon: any;
  match: (loc: string) => boolean;
}

interface NavGroupDef {
  label: string;
  items: NavItemDef[];
}

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const role = user?.role || 'user';

  /* Grouped nav — Oriental Energy's own information architecture */
  const navGroups: NavGroupDef[] = [
    {
      label: 'Workspace',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, match: (l) => l === '/' || l === '/dashboard' },
        { label: 'Daily Logging', path: '/daily-logging', icon: Calendar, match: (l) => l.startsWith('/daily-logging') },
        { label: 'Submissions', path: '/submissions', icon: FileText, match: (l) => l.startsWith('/submissions') },
      ],
    },
    {
      label: 'Approvals',
      items: [
        { label: 'Team Members', path: '/team', icon: Users, match: (l) => l.startsWith('/team') },
        { label: 'Review Queue', path: '/approvals', icon: Inbox, match: (l) => l.startsWith('/approvals') },
      ],
    },
    {
      label: 'Finance',
      items: [
        { label: 'Finance Review', path: '/finance', icon: BarChart3, match: (l) => l.startsWith('/finance') },
      ],
    },
    {
      label: 'Reporting',
      items: [
        { label: 'Reports', path: '/reports', icon: PieChart, match: (l) => l.startsWith('/reports') },
        { label: 'Utilisation', path: '/utilisation', icon: Activity, match: (l) => l.startsWith('/utilisation') },
        { label: 'Budgets', path: '/budgets', icon: Target, match: (l) => l.startsWith('/budgets') },
      ],
    },
    {
      label: 'Control',
      items: [
        { label: 'Administration', path: '/admin', icon: Settings, match: (l) => l.startsWith('/admin') },
        { label: 'Rate Cards', path: '/rate-cards', icon: Banknote, match: (l) => l.startsWith('/rate-cards') },
      ],
    },
  ];

  const roleAllows = (group: NavGroupDef) => {
    switch (group.label) {
      case 'Approvals': return ['line_manager', 'hod', 'admin'].includes(role);
      case 'Finance': return ['finance', 'admin', 'hod'].includes(role);
      case 'Reporting': return ['finance', 'admin', 'line_manager', 'hod'].includes(role);
      case 'Control': return role === 'admin';
      default: return true;
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  const [, setLocation] = useLocation();

  const applyCollapseClass = (collapsed: boolean) => {
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
  };

  useEffect(() => { applyCollapseClass(isCollapsed); }, [isCollapsed]);

  return (
    <aside
      className={`bg-navy-900 text-white flex flex-col flex-shrink-0 fixed left-0 z-50 shadow-xl transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-12 h-screen top-0 bottom-auto' : 'w-64 h-screen top-0'
      }`}
    >
      {/* Brand + collapse | collapsed: button under logo; expanded: button right of logo */}
      <div className={`border-b border-navy-800 shrink-0 ${isCollapsed ? 'flex flex-col items-center gap-2 py-3 px-1' : 'flex flex-row items-center justify-between gap-2 py-3 px-4'}`}>
        {!isCollapsed ? (
          <img src="/oriental-logo.jpg" alt="Oriental Energy" className="h-9 w-auto rounded" />
        ) : (
          <img src="/oriental-logo.jpg" alt="Oriental Energy" className="h-7 w-auto rounded" />
        )}
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors"
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {isCollapsed ? (
        /* Collapsed → pure icon rail: icons only, sign-out icon at the bottom */
        <>
          <div className="flex-1 overflow-y-auto py-4 custom-scrollbar overflow-x-hidden scrollbar-hide">
            {navGroups.filter(roleAllows).map((group) => (
              <div key={group.label} className="mb-2">
                <div className="mx-auto mb-2 h-px w-6 bg-white/10" />
                <ul>
                  {group.items.map((item) => {
                    const isActive = item.match(location);
                    return (
                      <li key={item.label} title={item.label}>
                        <button
                          onClick={() => setLocation(item.path)}
                          data-tour={`nav-${item.path.replace('/', '').replace('/', '-')}`}
                          className={`flex w-full items-center justify-center py-2.5 transition-all duration-200 ${
                            isActive
                              ? 'bg-navy-700 text-white shadow-inner relative'
                              : 'text-gray-400 hover:bg-navy-800 hover:text-white'
                          }`}
                        >
                          {isActive && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-gold-500" />}
                          <item.icon
                            className={`w-4 h-4 transition-transform ${
                              isActive ? 'text-gold-500 scale-110' : ''
                            }`}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Rail footer: sign-out icon only */}
          <div className="p-2 border-t border-navy-700 bg-navy-950 flex justify-center">
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-navy-800 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </>
      ) : (
        /* Expanded → normal sidebar */
        <>
          {/* Nav */}
          <div className="flex-1 overflow-y-auto py-4 custom-scrollbar overflow-x-hidden scrollbar-hide">
            {navGroups.filter(roleAllows).map((group) => (
              <div key={group.label} className="mb-6">
                {!isCollapsed ? (
                  <h2 className="nav-group-label">{group.label}</h2>
                ) : (
                  <div className="px-6 mb-3 border-b border-navy-800 opacity-20" />
                )}
                <ul>
                  {group.items.map((item) => {
                    const isActive = item.match(location);
                    return (
                      <li key={item.label} title={isCollapsed ? item.label : ''}>
                        <button
                          onClick={() => setLocation(item.path)}
                          data-tour={`nav-${item.path.replace('/', '').replace('/', '-')}`}
                          className={`flex w-full items-center py-2.5 transition-all duration-200 border-l-[3px] ${
                            isCollapsed ? 'justify-center px-0' : 'px-6'
                          } ${
                            isActive
                              ? 'bg-navy-700 border-gold-500 text-white shadow-inner'
                              : 'border-transparent text-gray-400 hover:bg-navy-800 hover:text-white'
                          }`}
                        >
                          <item.icon
                            className={`w-4 h-4 transition-transform ${!isCollapsed ? 'mr-3' : ''} ${
                              isActive ? 'text-gold-500 scale-110' : ''
                            }`}
                          />
                          {!isCollapsed && (
                            <span className="text-[13px] font-medium tracking-tight truncate">{item.label}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Footer: logout */}
          <div className="p-4 border-t border-navy-700 bg-navy-950">
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-navy-800 transition-all w-full"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-[13px] font-medium">Sign Out</span>
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

/* Breadcrumb bar lives in Header via shared logic */
export { breadcrumbsFor };
function breadcrumbsFor(location: string) {
  const pathParts = location.split('/').filter((p) => p !== '');
  return [
    { label: 'Home', path: '/dashboard' },
    ...pathParts.map((part, i) => ({
      label: part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      path: '/' + pathParts.slice(0, i + 1).join('/'),
    })),
  ];
}
