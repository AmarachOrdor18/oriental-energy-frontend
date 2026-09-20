import { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { Plus, FileText, Clock, CheckCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { motion } from 'framer-motion';

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function Timesheets() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [weeklySummary, setWeeklySummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get current week's Monday
  const getCurrentWeekMonday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return toDateKey(monday);
  };

  useEffect(() => { loadCurrentWeek(); }, []);

  const loadCurrentWeek = async () => {
    try {
      const start = getCurrentWeekMonday();
      if (user?.id) {
        const summary = await api.getWeeklySummary(user.id, start);
        setWeeklySummary({ ...summary, weekStart: start });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <DashboardLayout><div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"/></div></DashboardLayout>;

  const currentWeekStart = weeklySummary?.weekStart || getCurrentWeekMonday();

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text_primary">Daily Logs</h1>
            <p className="text-sm text-text_secondary mt-1">Manage and submit your daily hours on the grid.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setLocation('/submissions')} className="bg-surface hover:bg-background border border-border text-text_primary font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all text-sm shadow-sm">
              <FileText className="h-4 w-4 text-text_secondary" /> View Submissions History
            </button>
            <button onClick={() => setLocation('/timesheets/new')} className="bg-primary hover:bg-primary_dark text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 text-sm">
              <Plus className="h-4 w-4" /> Open Current Week
            </button>
          </div>
        </div>

        {/* Current Week Summary Card */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-border bg-background/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text_primary">Current Week Overview</h2>
                <p className="text-xs text-text_secondary">Week starting {parseDateKey(currentWeekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <button onClick={() => setLocation('/timesheets/new')} className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
              Edit Grid <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="flex items-end gap-3 mb-4">
              <span className="text-4xl font-black text-text_primary tracking-tight">{weeklySummary?.grand_total || 0}</span>
              <span className="text-sm font-semibold text-text_secondary mb-1">hours logged so far</span>
            </div>
            <div className="w-full bg-background rounded-full h-2 mb-6 overflow-hidden border border-border/50">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(((weeklySummary?.grand_total || 0) / 40) * 100, 100)}%` }}
                className="h-full bg-primary rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-background border border-border rounded-xl p-4">
                <p className="text-xs font-bold text-text_secondary uppercase tracking-wider mb-3">Project Breakdown</p>
                {weeklySummary?.project_totals?.length > 0 ? (
                  <div className="space-y-2">
                    {weeklySummary.project_totals.map((pt: any) => (
                      <div key={pt.project_id} className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-text_primary">{pt.project_name}</span>
                        <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{pt.total_hours}h</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text_secondary italic">No hours logged to projects yet.</p>
                )}
              </div>
              <div className="bg-background border border-border rounded-xl p-4">
                <p className="text-xs font-bold text-text_secondary uppercase tracking-wider mb-3">Daily Completeness</p>
                <div className="flex justify-between items-center h-[calc(100%-2rem)]">
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => {
                    const dt = parseDateKey(currentWeekStart);
                    dt.setDate(dt.getDate() + i);
                    const dtStr = toDateKey(dt);
                    const dayData = weeklySummary?.daily_totals?.find((d: any) => d.date?.slice(0, 10) === dtStr);
                    const filled = dayData?.total_hours > 0;
                    
                    return (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-bold text-text_secondary">{day}</span>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${filled ? 'bg-success-bg border-success text-success' : 'bg-surface border-border text-text_secondary/30'}`}>
                          {filled ? <CheckCircle className="h-4 w-4" /> : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ArrowRight icon
function ArrowRight(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  );
}
