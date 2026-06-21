import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle,
  Clock,
  Inbox,
  Plus,
  Send,
} from 'lucide-react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

type StatusCounts = {
  approved: number;
  pending: number;
  draft: number;
  returned: number;
  overdue: number;
  total: number;
};

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentWeekMonday = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return toDateKey(monday);
};

const statusColor = (status: string) => {
  const colors: Record<string, string> = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
    submitted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
    under_review: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
    draft: 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:border-white/10',
    rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
    overdue: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
  };
  return colors[status] || colors.draft;
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const role = user?.role || 'user';
  const userName = user?.name || 'User';
  const period = currentPeriod();

  const [counts, setCounts] = useState<StatusCounts>({ approved: 0, pending: 0, draft: 0, returned: 0, overdue: 0, total: 0 });
  const [recentTimesheets, setRecentTimesheets] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [financeReviewHours, setFinanceReviewHours] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [role]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const ts = await api.getTimesheets({ user_id: user?.id || '' });
      setRecentTimesheets(ts.slice(0, 5));
      setCounts({
        approved: ts.filter((t: any) => t.status === 'approved').length,
        pending: ts.filter((t: any) => t.status === 'submitted' || t.status === 'under_review').length,
        draft: ts.filter((t: any) => t.status === 'draft').length,
        returned: ts.filter((t: any) => t.status === 'rejected').length,
        overdue: ts.filter((t: any) => t.status === 'overdue').length,
        total: ts.length,
      });

      if (user?.id) {
        try {
          const summary = await api.getWeeklySummary(user.id, getCurrentWeekMonday());
          setWeeklyHours(summary.grand_total || 0);
        } catch {
          setWeeklyHours(0);
        }
      }

      if (['line_manager', 'hod', 'admin'].includes(role)) {
        try {
          setPendingApprovals(await api.getPendingApprovals());
        } catch {
          setPendingApprovals([]);
        }
      }

      if (['finance', 'admin'].includes(role)) {
        try {
          const finance = await api.getFinanceReviewQueue({ period });
          setFinanceReviewHours(finance.summary?.total_hours || 0);
        } catch {
          setFinanceReviewHours(0);
        }
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const outstanding = counts.draft + counts.returned + counts.overdue;
  const actionQueue = role === 'finance'
    ? Math.max(counts.approved, 0)
    : ['line_manager', 'hod', 'admin'].includes(role)
      ? pendingApprovals.length
      : outstanding;

  const statCards = [
    { label: 'Outstanding timesheets', value: outstanding, detail: 'Draft, returned, or overdue', icon: Inbox },
    { label: 'Weekly hours', value: `${weeklyHours.toFixed(1)}h`, detail: 'Current open week', icon: Clock },
    { label: 'Approved', value: counts.approved, detail: 'Visible submissions', icon: CheckCircle },
    role === 'finance' || role === 'admin'
      ? { label: 'Finance hours', value: financeReviewHours.toFixed(1), detail: `Period ${period}`, icon: BarChart3 }
      : { label: 'Needs submission', value: actionQueue, detail: 'Draft, returned, or overdue weeks', icon: AlertTriangle },
  ];

  const pulseBars = [
    { label: 'Approved', value: counts.approved, color: 'bg-primary' },
    { label: 'Pending', value: counts.pending, color: 'bg-blue-500' },
    { label: 'Returned', value: counts.returned, color: 'bg-amber-500' },
    { label: 'Overdue', value: counts.overdue, color: 'bg-red-500' },
  ];
  const maxPulse = Math.max(...pulseBars.map((item) => item.value), 1);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Role workspace / {role.replace('_', ' ')}</p>
            <h1 className="text-3xl font-bold text-text_primary">Welcome back, {userName.split(' ')[0]}</h1>
            <p className="text-sm text-text_secondary mt-2 max-w-2xl">
              A corporate control view for daily logging, approvals, finance readiness, and open-period compliance.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setLocation('/daily-logging')} className="btn-solid">
              <Plus className="h-4 w-4" /> Log Hours
            </button>
            {['line_manager', 'hod', 'admin'].includes(role) && (
              <button onClick={() => setLocation('/approvals')} className="btn-outline">
                <Send className="h-4 w-4" /> Review Queue
              </button>
            )}
          </div>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="kpi-card">
              <div className="flex items-center justify-between mb-5">
                <div className="h-9 w-9 rounded-lg bg-background border border-border flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-[10px] font-bold text-text_secondary uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-bold text-text_primary mt-1">{stat.value}</p>
              <p className="text-xs text-text_secondary mt-1">{stat.detail}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="section-card">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text_primary">Monthly submission pulse</h2>
                <p className="text-xs text-text_secondary mt-1">Status mix for visible timesheets.</p>
              </div>
              <button onClick={() => setLocation('/submissions')} className="text-xs font-bold text-primary flex items-center gap-1">
                View tracker <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {pulseBars.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="text-text_secondary">{item.label}</span>
                    <span className="text-text_primary">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-background border border-border overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${Math.max((item.value / maxPulse) * 100, item.value ? 8 : 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-text_primary">Recent submissions</h2>
              <button onClick={() => setLocation('/submissions')} className="text-xs font-bold text-primary">All submissions</button>
            </div>
            <div className="divide-y divide-border">
              {recentTimesheets.length === 0 ? (
                <div className="p-10 text-center text-text_secondary">
                  <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No submissions yet.</p>
                </div>
              ) : recentTimesheets.map((ts) => (
                <button key={ts.id} onClick={() => setLocation(`/submissions/${ts.id}`)} className="w-full p-4 flex items-center justify-between text-left hover:bg-background transition-colors">
                  <div>
                    <p className="text-sm font-bold text-text_primary">
                      {new Date(ts.week_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(ts.week_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-text_secondary mt-1">{ts.id} / Period {ts.accounting_period}</p>
                  </div>
                  <span className={`status-pill ${statusColor(ts.status)}`}>{ts.status === 'rejected' ? 'returned' : ts.status.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
