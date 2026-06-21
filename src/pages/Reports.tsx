import { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { BarChart3, FileText, Search, Download, RefreshCw, Users, AlertTriangle, PieChart } from 'lucide-react';
import { api } from '../lib/api';
import { motion } from 'framer-motion';

type ReportType = 'not_posted' | 'hours_summary';

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>('not_posted');
  const [periods, setPeriods] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Not-posted params
  const [notPostedPeriod, setNotPostedPeriod] = useState('');
  const [notPostedDept, setNotPostedDept] = useState('');
  const [notPostedResults, setNotPostedResults] = useState<any>(null);

  // Hours summary params
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summaryDept, setSummaryDept] = useState('');
  const [summaryResults, setSummaryResults] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    Promise.all([api.getAccountingPeriods(), api.getDepartments()])
      .then(([p, d]) => { setPeriods(p); setDepartments(d); })
      .catch(() => {});
  }, []);

  const runNotPosted = async () => {
    if (!notPostedPeriod) { setError('Select an accounting period.'); return; }
    setIsLoading(true); setError(''); setHasRun(false);
    try {
      const params: Record<string, string> = {};
      if (notPostedDept) params.department_id = notPostedDept;
      const data = await api.getNotPostedReport(notPostedPeriod, params);
      setNotPostedResults(data);
      setHasRun(true);
    } catch (err: any) {
      setError(err.message || 'Failed to run report.');
    } finally {
      setIsLoading(false);
    }
  };

  const runHoursSummary = async () => {
    if (!dateFrom || !dateTo) { setError('Select both date from and date to.'); return; }
    setIsLoading(true); setError(''); setHasRun(false);
    try {
      const params: Record<string, string> = { date_from: dateFrom, date_to: dateTo };
      if (summaryDept) params.department_id = summaryDept;
      const data = await api.getHoursSummary(params);
      setSummaryResults(data.rows || data);
      setHasRun(true);
    } catch (err: any) {
      setError(err.message || 'Failed to run report.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCSV = (rows: any[], filename: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]).join(',');
    const body = rows
      .map(r => Object.values(r).map(v => JSON.stringify(v ?? '')).join(','))
      .join('\n');
    const blob = new Blob([`${headers}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const reports = [
    {
      key: 'not_posted' as ReportType,
      label: 'Timesheets Not Posted',
      icon: AlertTriangle,
      description: 'Employees who have not submitted a timesheet for a given accounting period.',
    },
    {
      key: 'hours_summary' as ReportType,
      label: 'Hours Summary (Time Inquiry)',
      icon: BarChart3,
      description: 'Total hours logged per employee and project within a custom date range.',
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-12 space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Finance &amp; Management</p>
          <h1 className="text-3xl font-bold text-text_primary">Reports</h1>
          <p className="text-sm text-text_secondary mt-2">Run parameterised reports on timesheet data.</p>
        </div>

        {/* Report selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map(r => (
            <button
              key={r.key}
              onClick={() => {
                setActiveReport(r.key);
                setError('');
                setNotPostedResults(null);
                setSummaryResults([]);
                setHasRun(false);
              }}
              className={`text-left p-5 rounded-2xl border-2 transition-all ${
                activeReport === r.key
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-surface hover:border-primary/30'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <r.icon className={`h-5 w-5 ${activeReport === r.key ? 'text-primary' : 'text-text_secondary'}`} />
                <span className={`text-sm font-bold ${activeReport === r.key ? 'text-primary' : 'text-text_primary'}`}>
                  {r.label}
                </span>
              </div>
              <p className="text-xs text-text_secondary">{r.description}</p>
            </button>
          ))}
        </div>

        {/* Parameters panel */}
        <div className="section-card">
          <div className="p-5 border-b border-border">
            <h2 className="text-base font-bold text-text_primary">Parameters</h2>
          </div>
          <div className="p-5 space-y-4">
            {activeReport === 'not_posted' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-text_secondary uppercase tracking-widest mb-2">
                    Accounting Period <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={notPostedPeriod}
                    onChange={e => setNotPostedPeriod(e.target.value)}
                    className="input-base w-full"
                  >
                    <option value="">Select period…</option>
                    {periods.map((p: any) => (
                      <option key={p.id} value={p.period_code}>
                        {p.period_code} ({new Date(p.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
                        {new Date(p.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text_secondary uppercase tracking-widest mb-2">
                    Department
                  </label>
                  <select
                    value={notPostedDept}
                    onChange={e => setNotPostedDept(e.target.value)}
                    className="input-base w-full"
                  >
                    <option value="">All departments</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={runNotPosted}
                  disabled={isLoading}
                  className="btn-solid flex items-center gap-2 justify-center"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {isLoading ? 'Running…' : 'Run Report'}
                </button>
              </div>
            )}

            {activeReport === 'hours_summary' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-text_secondary uppercase tracking-widest mb-2">
                    Date From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="input-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text_secondary uppercase tracking-widest mb-2">
                    Date To <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="input-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text_secondary uppercase tracking-widest mb-2">
                    Department
                  </label>
                  <select
                    value={summaryDept}
                    onChange={e => setSummaryDept(e.target.value)}
                    className="input-base w-full"
                  >
                    <option value="">All departments</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={runHoursSummary}
                  disabled={isLoading}
                  className="btn-solid flex items-center gap-2 justify-center"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {isLoading ? 'Running…' : 'Run Report'}
                </button>
              </div>
            )}

            {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
          </div>
        </div>

        {/* Not-posted results */}
        {activeReport === 'not_posted' && notPostedResults && (
          <div className="section-card">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text_primary">
                  Timesheets Not Posted — Period {notPostedResults.period?.period_code}
                </h2>
                <p className="text-xs text-text_secondary mt-1">
                  {notPostedResults.not_posted?.length || 0} employee(s) with no submission
                </p>
              </div>
              <button
                onClick={() =>
                  downloadCSV(
                    notPostedResults.not_posted || [],
                    `not-posted-${notPostedResults.period?.period_code}.csv`
                  )
                }
                className="btn-outline text-xs py-2 flex items-center gap-2"
              >
                <Download className="h-3.5 w-3.5" /> Download CSV
              </button>
            </div>
            {(notPostedResults.not_posted || []).length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
                <p className="font-bold text-text_primary">All employees have submitted for this period.</p>
                <p className="text-sm text-text_secondary mt-1">No outstanding timesheets found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-text_secondary border-b border-border bg-background/40">
                      <th className="px-5 py-4">Employee</th>
                      <th className="px-5 py-4">Department</th>
                      <th className="px-5 py-4">Manager</th>
                      <th className="px-5 py-4">Last Submission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {notPostedResults.not_posted.map((row: any, i: number) => (
                      <motion.tr
                        key={row.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-background/50"
                      >
                        <td className="px-5 py-3">
                          <p className="text-sm font-bold text-text_primary">{row.name}</p>
                          <p className="text-xs text-text_secondary">{row.email}</p>
                        </td>
                        <td className="px-5 py-3 text-sm text-text_secondary">{row.department_name || '—'}</td>
                        <td className="px-5 py-3 text-sm text-text_secondary">{row.manager_name || '—'}</td>
                        <td className="px-5 py-3 text-xs">
                          {row.last_submitted ? (
                            new Date(row.last_submitted).toLocaleDateString('en-GB')
                          ) : (
                            <span className="text-red-500 font-semibold">Never submitted</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Hours summary results */}
        {activeReport === 'hours_summary' && summaryResults.length > 0 && (
          <div className="section-card">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text_primary">Hours Summary</h2>
                <p className="text-xs text-text_secondary mt-1">
                  {dateFrom} to {dateTo} · {summaryResults.length} record(s)
                </p>
              </div>
              <button
                onClick={() =>
                  downloadCSV(summaryResults, `hours-summary-${dateFrom}-to-${dateTo}.csv`)
                }
                className="btn-outline text-xs py-2 flex items-center gap-2"
              >
                <Download className="h-3.5 w-3.5" /> Download CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-text_secondary border-b border-border bg-background/40">
                    <th className="px-5 py-4">Employee</th>
                    <th className="px-5 py-4">Department</th>
                    <th className="px-5 py-4">Project</th>
                    <th className="px-5 py-4 text-right">Total Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summaryResults.map((row: any, i: number) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-background/50"
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-bold text-text_primary">{row.user_name || row.name}</p>
                        <p className="text-xs text-text_secondary font-mono">{row.user_id}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-text_secondary">{row.department_name || '—'}</td>
                      <td className="px-5 py-3 text-sm text-text_secondary">{row.project_name || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-bold text-text_primary">
                          {parseFloat(row.total_hours || 0).toFixed(1)}h
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {hasRun && activeReport === 'hours_summary' && summaryResults.length === 0 && (
          <div className="section-card p-12 text-center">
            <PieChart className="h-10 w-10 mx-auto mb-3 text-text_secondary opacity-30" />
            <p className="font-bold text-text_primary">No records found</p>
            <p className="text-sm text-text_secondary mt-1">
              No approved hours in this date range for the selected filters.
            </p>
          </div>
        )}

        {!hasRun && !isLoading && (
          <div className="section-card p-12 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-text_secondary opacity-30" />
            <p className="font-bold text-text_primary">Configure parameters above and click Run Report.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
