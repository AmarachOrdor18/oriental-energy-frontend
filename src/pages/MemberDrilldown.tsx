import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { ChevronLeft, Clock, CheckCircle, Briefcase, Calendar } from 'lucide-react';
import { api } from '../lib/api';
import { motion } from 'framer-motion';

export default function MemberDrilldown() {
  const { userId } = useParams();
  const [, setLocation] = useLocation();
  const [member, setMember] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadMember(); }, [userId]);

  const loadMember = async () => {
    try {
      const [userData, summaryData] = await Promise.all([
        api.getUser(userId!),
        api.getUserTimesheetSummary(userId!),
      ]);
      setMember(userData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Load member error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const statusColor = (s: string) => {
    const c: Record<string, string> = {
      approved: 'bg-success-bg text-success', submitted: 'bg-navy-100 text-navy-700',
      draft: 'bg-gray-100 text-gray-500',
      rejected: 'bg-danger-bg text-danger', overdue: 'bg-danger-bg text-danger',
      under_review: 'bg-warning-bg text-warning',
    };
    return c[s] || c.draft;
  };

  if (isLoading) {
    return <DashboardLayout><div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div></DashboardLayout>;
  }

  const completeness = summary?.log_completeness || { total_days: 0, filled_days: 0 };
  const pct = completeness.total_days > 0 ? Math.round((completeness.filled_days / completeness.total_days) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto pb-12">
        <button onClick={() => setLocation('/team')} className="flex items-center gap-2 text-text_secondary hover:text-text_primary mb-6 text-sm font-medium transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to Team
        </button>

        {/* Member Header */}
        <div className="section-card p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-navy-900 border border-navy-800 flex items-center justify-center text-2xl font-bold text-gold-500">
              {member?.name?.charAt(0)}
            </div>
            <div>
              <h1 className="page-header-title">{member?.name}</h1>
              <p className="page-header-sub">{member?.email} • {member?.role?.replace('_', ' ')} • {member?.department_name || 'No department'}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="kpi-card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text_secondary uppercase tracking-widest">Log Completeness</span>
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <div className="text-3xl font-bold text-text_primary">{pct}%</div>
            <p className="text-xs text-text_secondary mt-1">{completeness.filled_days} / {completeness.total_days} days logged</p>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div className="h-full bg-success" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="kpi-card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text_secondary uppercase tracking-widest">Timesheets</span>
              <Calendar className="h-4 w-4 text-navy-700" />
            </div>
            <div className="text-3xl font-bold text-text_primary">{summary?.timesheets?.length || 0}</div>
            <p className="text-xs text-text_secondary mt-1">Total submissions</p>
          </div>
          <div className="kpi-card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text_secondary uppercase tracking-widest">Projects</span>
              <Briefcase className="h-4 w-4 text-navy-700" />
            </div>
            <div className="text-3xl font-bold text-text_primary">{summary?.hours_by_project?.length || 0}</div>
            <p className="text-xs text-text_secondary mt-1">Active projects</p>
          </div>
        </div>

        {/* Hours by Project */}
        {summary?.hours_by_project?.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden mb-8">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider">Hours by Project</h2>
            </div>
            <div className="p-5 space-y-4">
              {summary.hours_by_project.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-navy-50 border border-teal-100 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-navy-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text_primary">{p.project_name}</p>
                      <p className="text-[10px] text-text_secondary">{p.project_code}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-text_primary">{parseFloat(p.total_hours).toFixed(1)}h</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timesheet History */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">          <div className="p-5 border-b border-gray-100">
              <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider">Timesheet History</h2>
            </div>
          {summary?.timesheets?.length === 0 ? (
            <div className="p-12 text-center text-text_secondary">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No timesheets found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {summary?.timesheets?.map((ts: any, i: number) => (
                <motion.div key={ts.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  onClick={() => setLocation(`/timesheets/${ts.id}`)}
                  className="flex items-center justify-between p-4 hover:bg-gray-50/60 transition-all cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold text-text_primary">
                      {new Date(ts.week_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(ts.week_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-[10px] text-text_secondary">{ts.accounting_period}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${statusColor(ts.status)}`}>{ts.status}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
