import { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { CheckCircle, Clock, AlertTriangle, Inbox, X, Eye, Edit2, RotateCcw } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { motion } from 'framer-motion';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TableToolbar, TablePagination, SortableTh, useTableControls } from '../components/ui/TableControls';

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

export default function Submissions() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { loadSubmissions(); }, []);

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
    approved: timesheets.filter((t) => t.status === 'approved').length,
    pending: timesheets.filter((t) => ['submitted', 'under_review'].includes(t.status)).length,
    returned: timesheets.filter((t) => t.status === 'rejected').length,
    overdue: timesheets.filter((t) => t.status === 'overdue').length,
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

  const table = useTableControls(displayedTimesheets as any, 10);

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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy-800" />
        </div>
      </DashboardLayout>
    );
  }

  const statChips = [
    { label: 'Approved', value: counts.approved, icon: CheckCircle, tone: 'text-success', ring: 'bg-success-bg' },
    { label: 'Pending Review', value: counts.pending, icon: Clock, tone: 'text-warning', ring: 'bg-warning-bg' },
    { label: 'Returned', value: counts.returned, icon: AlertTriangle, tone: 'text-danger', ring: 'bg-danger-bg' },
    { label: 'Overdue', value: counts.overdue, icon: AlertTriangle, tone: 'text-gray-600', ring: 'bg-gray-100' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-12">
        {/* Page header */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="page-header-title">Submission Tracker</h1>
            <p className="page-header-sub">Track the status of all your weekly submissions.</p>
          </div>
        </div>

        {/* Stat chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statChips.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="kpi-card"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-8 w-8 rounded-lg ${c.ring} flex items-center justify-center`}>
                  <c.icon className={`h-4 w-4 ${c.tone}`} />
                </div>
              </div>
              <p className="kpi-value font-mono">{c.value}</p>
              <p className="kpi-label mt-1">{c.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Datagrid */}
        <div className="table-datagrid-container">
          <div className="p-4 border-b border-gray-100 bg-white/60 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-navy-900 text-sm uppercase tracking-wider">All Submissions</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">{table.totalItems} visible in the current filter.</p>
            </div>
            <TableToolbar
              searchValue={table.search}
              onSearchChange={(v) => { table.setSearch(v); }}
              left={
                <>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white border border-gray-200 text-navy-900 px-3 py-1.5 rounded-lg text-xs font-semibold outline-none focus:border-gold-500/50 transition-all"
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
                    className="bg-white border border-gray-200 text-navy-900 px-3 py-1.5 rounded-lg text-xs font-semibold outline-none focus:border-gold-500/50 transition-all"
                    aria-label="Filter submissions from date"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-white border border-gray-200 text-navy-900 px-3 py-1.5 rounded-lg text-xs font-semibold outline-none focus:border-gold-500/50 transition-all"
                    aria-label="Filter submissions to date"
                  />
                  {hasFilters && (
                    <button onClick={clearFilters} className="btn-ghost !px-3 !py-1.5 text-xs">
                      <X className="h-3.5 w-3.5" /> Clear
                    </button>
                  )}
                </>
              }
            />
          </div>

          {timesheets.length === 0 ? (
            <div className="p-16 text-center text-gray-400">
              <Inbox className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="font-semibold text-gray-600">No submissions yet.</p>
              <button onClick={() => setLocation('/daily-logging')} className="mt-4 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors">
                Start logging hours
              </button>
            </div>
          ) : table.totalItems === 0 ? (
            <div className="p-16 text-center text-gray-400">
              <Inbox className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="font-semibold text-gray-600">No submissions match these filters.</p>
              <button onClick={clearFilters} className="mt-4 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors">
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table-datagrid min-w-[860px]">
                  <thead>
                    <tr>
                      <SortableTh label="Timesheet ID" k="id" sortKey={table.sortKey} onSort={table.toggleSort} className="w-32" />
                      <SortableTh label="Timeline" k="week_start_date" sortKey={table.sortKey} onSort={table.toggleSort} className="w-44" />
                      <th>Reporting Period</th>
                      <th className="w-40">Submission Status</th>
                      <th className="w-36">Submission Date</th>
                      <th className="w-36">Approval Status</th>
                      <th className="w-28 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.paged.map((ts: any) => {
                      const startDate = parseDateKey(ts.week_start_date);
                      const endDate = parseDateKey(ts.week_end_date);
                      const timeline = `${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                      const submittedAt = ts.submitted_at ? new Date(ts.submitted_at) : null;
                      const isSubmitted = !!submittedAt;
                      const isReturned = ts.status === 'rejected';
                      const isDraft = ts.status === 'draft' || ts.status === 'overdue';

                      const approvalLabel: Record<string, string> = {
                        draft: 'Draft',
                        submitted: 'Pending',
                        under_review: 'Under Review',
                        approved: 'Approved',
                        rejected: 'Returned',
                        overdue: 'Overdue',
                      };

                      return (
                        <tr key={ts.id}>
                          <td><span className="font-mono text-[13px] font-semibold text-navy-900">{ts.id}</span></td>
                          <td><span className="font-semibold text-navy-900">{timeline}</span></td>
                          <td>{formatPeriod(ts.accounting_period)}</td>
                          <td>
                            <span className={`status-pill ${isSubmitted ? 'bg-navy-100 text-navy-700' : 'bg-gray-100 text-gray-500'}`}>
                              {isSubmitted ? 'Submitted' : 'Not Submitted'}
                            </span>
                          </td>
                          <td>
                            {submittedAt
                              ? submittedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                              : <span className="text-gray-400">—</span>}
                          </td>
                          <td><StatusBadge status={approvalLabel[ts.status] || 'Draft'} /></td>
                          <td>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setLocation(`/submissions/${ts.id}`)}
                                title="View history"
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-navy-700 hover:border-teal-300 hover:bg-navy-50 transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {isDraft && (
                                <button
                                  onClick={() => setLocation('/daily-logging')}
                                  title="Edit in daily log"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-navy-700 hover:border-teal-300 hover:bg-navy-50 transition-all"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}
                              {isReturned && (
                                <button
                                  onClick={() => setLocation(`/submissions/${ts.id}`)}
                                  title="Resubmit"
                                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-danger/30 text-danger hover:bg-danger hover:text-white hover:border-danger transition-all"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <TablePagination
                page={table.page}
                totalPages={table.totalPages}
                totalItems={table.totalItems}
                pageSize={table.pageSize}
                onPage={table.setPage}
              />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
