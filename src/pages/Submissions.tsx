import { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { CheckCircle, Clock, AlertTriangle, Inbox, X, Eye, Edit2, RotateCcw, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { motion } from 'framer-motion';

const parseDateKey = (value: string) => {
  const normalized = apiDateKey(value);
  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const apiDateKey = (value?: string) => {
  if (!value) return '';
  if (!value.includes('T')) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const formatPeriod = (p: string) => {
  if (!p || !p.includes('-')) return p;
  const [year, month] = p.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

const PAGE_SIZE = 15;

export default function Submissions() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { loadSubmissions(); }, []);

  useEffect(() => { setPage(1); }, [statusFilter, dateFrom, dateTo]);

  const loadSubmissions = async () => {
    try {
      const data = await api.getTimesheets({ user_id: user?.id || '' });
      setTimesheets(data);
    } catch (err) {
      console.error('Load submissions error:', err);
    } finally {
      setIsLoading(false);
    }
  };


  const counts = {
    approved: timesheets.filter(t => t.status === 'approved').length,
    pending: timesheets.filter(t => ['submitted', 'under_review'].includes(t.status)).length,
    returned: timesheets.filter(t => t.status === 'rejected').length,
    overdue: timesheets.filter(t => t.status === 'overdue').length,
  };

  const displayedTimesheets = timesheets.filter((ts) => {
    const start = apiDateKey(ts.week_start_date);
    const end = apiDateKey(ts.week_end_date) || start;
    const statusMatch = statusFilter === 'all'
      || ts.status === statusFilter
      || (statusFilter === 'pending' && ['submitted', 'under_review'].includes(ts.status));
    const fromMatch = !dateFrom || end >= dateFrom;
    const toMatch = !dateTo || start <= dateTo;
    return statusMatch && fromMatch && toMatch;
  });

  const totalPages = Math.ceil(displayedTimesheets.length / PAGE_SIZE);
  const pagedTimesheets = displayedTimesheets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = statusFilter !== 'all' || !!dateFrom || !!dateTo;
  const clearFilters = () => {
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

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
      <div className="max-w-7xl mx-auto pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text_primary">Submission Tracker</h1>
          <p className="text-sm text-text_secondary mt-1">Track the status of all your weekly submissions.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Approved', value: counts.approved, color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle },
            { label: 'Pending Review', value: counts.pending, color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Clock },
            { label: 'Returned', value: counts.returned, color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle },
            { label: 'Overdue', value: counts.overdue, color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertTriangle },
          ].map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-8 w-8 rounded-lg ${c.bg} flex items-center justify-center`}>
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-text_primary">{c.value}</p>
              <p className="text-[10px] font-semibold text-text_secondary uppercase tracking-widest mt-1">{c.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-[32px] shadow-xl overflow-hidden">
          <div className="p-5 border-b border-border bg-background/80 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-text_primary">All Submissions</h2>
              <p className="text-sm text-text_secondary mt-1">{displayedTimesheets.length} visible in the current filter.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface border border-border text-text_primary px-3 py-2 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label="Filter submissions by status"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending review</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="rejected">Returned</option>
                <option value="overdue">Overdue</option>
                <option value="period_closed_no_submission">Period Closed — No Submission</option>
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-surface border border-border text-text_primary px-3 py-2 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label="Filter submissions from date"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-surface border border-border text-text_primary px-3 py-2 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label="Filter submissions to date"
              />
              {hasFilters && (
                <button onClick={clearFilters} className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text_primary hover:bg-background transition-all">
                  <X className="h-4 w-4" /> Clear
                </button>
              )}
            </div>
          </div>

          {timesheets.length === 0 ? (
            <div className="p-16 text-center text-text_secondary">
              <Inbox className="h-12 w-12 mx-auto mb-4 text-text_secondary/70" />
              <p className="font-medium text-text_primary">No submissions yet.</p>
              <button onClick={() => setLocation('/daily-logging')} className="mt-4 text-sm font-semibold text-primary hover:text-primary_dark transition-colors">
                Start logging hours
              </button>
            </div>
          ) : displayedTimesheets.length === 0 ? (
            <div className="p-16 text-center text-text_secondary">
              <Inbox className="h-12 w-12 mx-auto mb-4 text-text_secondary/70" />
              <p className="font-medium text-text_primary">No submissions match these filters.</p>
              <button onClick={clearFilters} className="mt-4 text-sm font-semibold text-primary hover:text-primary_dark transition-colors">
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <thead>
                    <tr className="bg-emerald-50/60 dark:bg-emerald-500/5 border-b-2 border-emerald-100 dark:border-border">
                      {[
                        { label: 'Timesheet ID' },
                        { label: 'Timeline' },
                        { label: 'Reporting Period' },
                        { label: 'Submission Status' },
                        { label: 'Submission Date' },
                        { label: 'Approval Status' },
                        { label: 'Actions', right: true },
                      ].map(col => (
                        <th key={col.label} className={`px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 ${col.right ? 'text-right' : 'text-left'}`}>
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {!col.right && <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-border/40">
                    {pagedTimesheets.map((ts, i) => {
                      const startDate = parseDateKey(ts.week_start_date);
                      const endDate = parseDateKey(ts.week_end_date);
                      const timeline = `${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                      const submittedAt = ts.submitted_at ? new Date(ts.submitted_at) : null;
                      const isSubmitted = !!submittedAt;
                      const isReturned = ts.status === 'rejected';
                      const isDraft = ts.status === 'draft' || ts.status === 'overdue';

                      const approvalConfig: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
                        draft:        { label: 'Draft',        dot: 'bg-zinc-400',    bg: 'bg-zinc-50 dark:bg-zinc-800/50',        text: 'text-zinc-500 dark:text-zinc-400',  border: 'border-zinc-200 dark:border-zinc-700' },
                        submitted:    { label: 'Pending',      dot: 'bg-blue-500',    bg: 'bg-blue-50 dark:bg-blue-500/10',        text: 'text-blue-600 dark:text-blue-400',  border: 'border-blue-200 dark:border-blue-500/30' },
                        under_review: { label: 'Under Review', dot: 'bg-amber-500',   bg: 'bg-amber-50 dark:bg-amber-500/10',      text: 'text-amber-600 dark:text-amber-400',border: 'border-amber-200 dark:border-amber-500/30' },
                        approved:     { label: 'Approved',     dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10',  text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30' },
                        rejected:     { label: 'Returned',     dot: 'bg-red-500',     bg: 'bg-red-50 dark:bg-red-500/10',          text: 'text-red-600 dark:text-red-400',    border: 'border-red-200 dark:border-red-500/30' },
                        overdue:      { label: 'Overdue',      dot: 'bg-orange-500',  bg: 'bg-orange-50 dark:bg-orange-500/10',    text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/30' },
                      };
                      const approval = approvalConfig[ts.status] || approvalConfig.draft;

                      return (
                        <motion.tr key={ts.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                          className="bg-white dark:bg-surface hover:bg-blue-50/40 dark:hover:bg-primary/5 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-mono text-[13px] font-semibold text-text_primary tracking-tight">{ts.id}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[13px] font-semibold text-text_primary whitespace-nowrap">{timeline}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[13px] font-medium text-text_primary">{formatPeriod(ts.accounting_period)}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border ${isSubmitted ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isSubmitted ? 'bg-blue-500' : 'bg-zinc-400'}`} />
                              {isSubmitted ? 'Submitted' : 'Not Submitted'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[13px] font-medium text-text_primary">
                              {submittedAt ? submittedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-text_secondary">—</span>}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border ${approval.bg} ${approval.text} ${approval.border}`}>
                              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${approval.dot}`} />
                              {approval.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setLocation(`/submissions/${ts.id}`)}
                                title="View history"
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-border text-text_secondary hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {isDraft && (
                                <button
                                  onClick={() => setLocation('/daily-logging')}
                                  title="Edit in daily log"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-border text-text_secondary hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}
                              {isReturned && (
                                <button
                                  onClick={() => setLocation(`/submissions/${ts.id}`)}
                                  title="Resubmit"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-border bg-gray-50/50 dark:bg-background/30">
                <p className="text-[12px] font-medium text-text_secondary">
                  Showing <span className="font-semibold text-text_primary">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, displayedTimesheets.length)}</span> of <span className="font-semibold text-text_primary">{displayedTimesheets.length}</span> results
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="h-8 px-3 flex items-center gap-1 rounded-lg border border-gray-200 dark:border-border text-[12px] font-semibold text-text_secondary hover:bg-white dark:hover:bg-surface disabled:opacity-40 transition-colors">
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </button>
                    <div className="flex items-center gap-1 mx-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, idx) => {
                        const p = totalPages <= 5 ? idx + 1 : page <= 3 ? idx + 1 : page >= totalPages - 2 ? totalPages - 4 + idx : page - 2 + idx;
                        return (
                          <button key={p} onClick={() => setPage(p)}
                            className={`h-8 min-w-[32px] px-2 rounded-lg text-[12px] font-semibold transition-colors ${p === page ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'border border-gray-200 dark:border-border text-text_secondary hover:bg-white dark:hover:bg-surface'}`}>
                            {p}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="h-8 px-3 flex items-center gap-1 rounded-lg border border-gray-200 dark:border-border text-[12px] font-semibold text-text_secondary hover:bg-white dark:hover:bg-surface disabled:opacity-40 transition-colors">
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
