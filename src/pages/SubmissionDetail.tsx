import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { ArrowLeft, CalendarDays, CheckCircle, FileText, Layers, Timer, RotateCcw, Loader2 } from 'lucide-react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const parseDateKey = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const statusColor = (status: string) => {
  const colors: Record<string, string> = {
    approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    submitted: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    under_review: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    draft: 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    overdue: 'bg-red-500/10 text-red-500 border-red-500/20',
  };
  return colors[status] || colors.draft;
};

const leaveLabel = (value?: string) => {
  if (value === 'annual_leave') return 'Annual leave';
  if (value === 'sick_leave') return 'Sick leave';
  return '';
};

export default function SubmissionDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [timesheet, setTimesheet] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    loadHistory();
  }, [id]);

  const handleResubmit = async () => {
    if (!timesheet?.id) return;
    setIsResubmitting(true);
    setActionError('');
    try {
      await api.submitTimesheet(timesheet.id);
      await loadHistory();
    } catch (err: any) {
      setActionError(err.message || 'Failed to resubmit.');
    } finally {
      setIsResubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!timesheet?.id) return;
    setIsWithdrawing(true);
    setActionError('');
    try {
      await api.withdrawTimesheet(timesheet.id);
      setLocation('/daily-logging');
    } catch (err: any) {
      setActionError(err.message || 'Failed to withdraw.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const loadHistory = async () => {
    try {
      if (!id) return;
      const ts = await api.getTimesheet(id);
      const weekStart = apiDateKey(ts.week_start_date);
      const [dailyLogs, holidayList] = await Promise.all([
        api.getDailyLogs({ user_id: user?.id || ts.user_id, week_start: weekStart }),
        api.getHolidays(parseDateKey(weekStart).getFullYear()),
      ]);
      setTimesheet(ts);
      setLogs(dailyLogs);
      setHolidays(holidayList);
    } catch (err: any) {
      setError(err.message || 'Failed to load submission history.');
    } finally {
      setIsLoading(false);
    }
  };

  const days = useMemo(() => {
    if (!timesheet?.week_start_date) return [];
    const start = parseDateKey(timesheet.week_start_date);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      const label = WEEKDAY_LABELS[date.getDay()];
      return { label, date, dateStr: toDateKey(date) };
    });
  }, [timesheet]);

  const projects = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>();
    logs.forEach((log) => {
      map.set(log.project_id, {
        id: log.project_id,
        name: log.project_name || 'Project',
        code: log.project_code || log.project_id,
      });
    });
    return Array.from(map.values());
  }, [logs]);

  const getLog = (projectId: string, dateStr: string) => logs.find((log) => log.project_id === projectId && apiDateKey(log.date) === dateStr);
  const getDayLogs = (dateStr: string) => logs.filter((log) => apiDateKey(log.date) === dateStr);
  const getDayTotal = (dateStr: string) => getDayLogs(dateStr).reduce((sum, log) => sum + (parseFloat(log.hours) || 0), 0);
  const getProjectTotal = (projectId: string) => logs.filter((log) => log.project_id === projectId).reduce((sum, log) => sum + (parseFloat(log.hours) || 0), 0);
  const grandTotal = logs.reduce((sum, log) => sum + (parseFloat(log.hours) || 0), 0);
  const leaveDays = new Set(logs.filter((log) => log.notes === 'annual_leave' || log.notes === 'sick_leave').map((log) => apiDateKey(log.date)));
  const holidaySet = new Set(holidays.map((holiday) => apiDateKey(holiday.date)));
  const completedWeekdays = days.filter((day, index) => index < 5 && (getDayTotal(day.dateStr) >= 8 || leaveDays.has(day.dateStr) || holidaySet.has(day.dateStr))).length;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !timesheet) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-3xl rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-500">
          <p className="font-semibold">{error || 'Submission not found.'}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <button onClick={() => setLocation('/submissions')} className="rounded-lg border border-border bg-surface p-2 text-text_secondary transition-colors hover:text-text_primary">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-text_primary">Submission History</h1>
                <span className={`status-pill ${statusColor(timesheet.status)}`}>
                  {timesheet.status === 'rejected' ? 'returned' : timesheet.status.replace('_', ' ')}
                </span>
              </div>
              <p className="mt-1 text-sm text-text_secondary">
                {parseDateKey(timesheet.week_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} - {parseDateKey(timesheet.week_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {timesheet.status === 'rejected' && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-red-500 mb-1">This timesheet was returned</p>
              {timesheet.rejection_reason && (
                <p className="text-sm text-red-400">Reason: {timesheet.rejection_reason}</p>
              )}
              <p className="text-xs text-red-400/80 mt-1">Fix your hours in Daily Log if needed, then resubmit.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setLocation('/daily-logging')}
                className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-red-300 dark:border-red-500/30 bg-white dark:bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors"
              >
                Fix in Daily Log
              </button>
              <button
                onClick={handleResubmit}
                disabled={isResubmitting}
                className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isResubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {isResubmitting ? 'Resubmitting…' : 'Resubmit'}
              </button>
            </div>
          </div>
        )}

        {actionError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500 font-semibold">{actionError}</div>
        )}

        {(timesheet.status === 'submitted' || timesheet.status === 'under_review') && (
          <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">
                {timesheet.status === 'under_review' ? 'Your Line Manager is reviewing this' : 'Awaiting Line Manager review'}
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                You can withdraw this submission, fix your hours in Daily Log, and resubmit.
              </p>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-amber-400 bg-white dark:bg-amber-500/20 px-5 py-2.5 text-sm font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/30 transition-colors flex-shrink-0 disabled:opacity-50"
            >
              {isWithdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {isWithdrawing ? 'Withdrawing…' : 'Withdraw & Edit'}
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { label: 'Total hours', value: `${grandTotal.toFixed(1)}h`, icon: Timer },
            { label: 'Projects', value: projects.length, icon: Layers },
            { label: 'Weekdays complete', value: `${completedWeekdays}/5`, icon: CheckCircle },
            { label: 'Period', value: timesheet.accounting_period, icon: CalendarDays },
          ].map((item) => (
            <div key={item.label} className="kpi-card">
              <item.icon className="mb-4 h-5 w-5 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-text_secondary">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-text_primary">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="section-card">
          <div className="border-b border-border p-5">
            <h2 className="text-base font-bold text-text_primary">Daily breakdown</h2>
            <p className="mt-1 text-xs text-text_secondary">Read-only view of the hours, notes, leave, and holidays saved for this week.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-background/40">
                  <th className="w-1/5 p-4 text-xs font-bold uppercase tracking-wider text-text_secondary">Project</th>
                  {days.map((day) => {
                    const dayLogs = getDayLogs(day.dateStr);
                    const leave = dayLogs.find((log) => log.notes === 'annual_leave' || log.notes === 'sick_leave')?.notes;
                    const holiday = holidays.find((item) => apiDateKey(item.date) === day.dateStr);
                    return (
                      <th key={day.dateStr} className="min-w-[96px] border-l border-border/50 p-3 text-center">
                        <div className="text-xs font-bold uppercase tracking-wider text-text_secondary">{day.label}</div>
                        <div className="mt-0.5 text-sm text-text_primary">{day.date.getDate()}</div>
                        {leave && <div className="mt-1 text-[9px] font-bold uppercase text-orange-500">{leaveLabel(leave)}</div>}
                        {holiday && <div className="mt-1 truncate text-[9px] font-bold uppercase text-purple-500">{holiday.name}</div>}
                      </th>
                    );
                  })}
                  <th className="border-l border-border bg-background/20 p-3 text-center text-xs font-bold uppercase text-text_primary">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-sm text-text_secondary">
                      <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
                      No daily logs were saved for this week.
                    </td>
                  </tr>
                ) : projects.map((project) => (
                  <tr key={project.id}>
                    <td className="p-4">
                      <p className="text-sm font-bold text-text_primary">{project.name}</p>
                      <p className="text-xs text-text_secondary">{project.code}</p>
                    </td>
                    {days.map((day) => {
                      const log = getLog(project.id, day.dateStr);
                      const hours = parseFloat(log?.hours || 0);
                      return (
                        <td key={day.dateStr} className="border-l border-border/30 p-3 text-center">
                          <div className="text-sm font-bold text-text_primary">{hours ? `${hours}h` : '-'}</div>
                          {log?.notes && !leaveLabel(log.notes) && <div className="mt-1 truncate text-[10px] text-text_secondary">{log.notes}</div>}
                        </td>
                      );
                    })}
                    <td className="border-l border-border bg-background/10 p-3 text-center text-sm font-bold text-text_primary">
                      {getProjectTotal(project.id).toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-background/40">
                <tr>
                  <td className="p-4 text-xs font-bold uppercase tracking-wider text-text_secondary">Daily totals</td>
                  {days.map((day) => (
                    <td key={day.dateStr} className="border-l border-border/50 p-3 text-center text-sm font-bold text-text_primary">
                      {getDayTotal(day.dateStr).toFixed(1)}h
                    </td>
                  ))}
                  <td className="border-l border-border bg-primary/10 p-3 text-center text-lg font-bold text-primary">{grandTotal.toFixed(1)}h</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="section-card">
          <div className="border-b border-border p-5">
            <h2 className="text-base font-bold text-text_primary">Workflow status</h2>
            <p className="mt-1 text-xs text-text_secondary">Approval pipeline for this timesheet.</p>
          </div>
          <div className="p-6 overflow-x-auto">
            <div className="flex flex-col md:flex-row items-start md:items-start gap-0 min-w-[640px]">
              {(
                [
                  {
                    actor: 'System',
                    label: 'Created',
                    detail: new Date(timesheet.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    done: true,
                    active: false,
                    failed: false,
                  },
                  {
                    actor: 'Employee',
                    label: timesheet.submitted_at ? 'Entry Complete' : 'Pending Submission',
                    detail: timesheet.submitted_at
                      ? new Date(timesheet.submitted_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Not yet submitted',
                    done: !!timesheet.submitted_at,
                    active: !timesheet.submitted_at && timesheet.status === 'draft',
                    failed: false,
                  },
                  {
                    actor: 'Line Manager',
                    label: timesheet.status === 'rejected'
                      ? 'Returned'
                      : timesheet.approved_at
                      ? 'Auth Complete'
                      : timesheet.submitted_at
                      ? 'Issued for Auth'
                      : 'Awaiting Submission',
                    detail: timesheet.approved_at
                      ? new Date(timesheet.approved_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : timesheet.status === 'rejected'
                      ? timesheet.rejection_reason ? `"${timesheet.rejection_reason}"` : 'Returned to employee'
                      : timesheet.submitted_at
                      ? 'In progress…'
                      : '—',
                    done: !!timesheet.approved_at,
                    active: !!timesheet.submitted_at && !timesheet.approved_at && timesheet.status !== 'rejected',
                    failed: timesheet.status === 'rejected',
                  },
                  {
                    actor: 'System',
                    label: timesheet.status === 'approved' ? 'Posted' : 'Pending Post',
                    detail: timesheet.status === 'approved' ? 'Authorised and posted' : '—',
                    done: timesheet.status === 'approved',
                    active: false,
                    failed: false,
                  },
                ] as { actor: string; label: string; detail: string; done: boolean; active: boolean; failed: boolean }[]
              ).map((stage, i, arr) => (
                <div key={i} className="flex flex-col md:flex-row items-center flex-1">
                  <div className="flex flex-col items-center w-full md:w-auto md:min-w-[140px] md:max-w-[160px]">
                    <div
                      className={`h-14 w-14 rounded-2xl flex items-center justify-center border-2 transition-all shadow-sm
                        ${stage.failed ? 'border-red-500/40 bg-red-500/10 ring-4 ring-red-500/10'
                          : stage.done ? 'border-emerald-500/40 bg-emerald-500/10 ring-4 ring-emerald-500/10'
                          : stage.active ? 'border-amber-400/50 bg-amber-50 dark:bg-amber-500/10 ring-4 ring-amber-400/10'
                          : 'border-border bg-background'}`}
                    >
                      <div
                        className={`h-3 w-3 rounded-full
                          ${stage.failed ? 'bg-red-500'
                            : stage.done ? 'bg-emerald-500'
                            : stage.active ? 'bg-amber-400 animate-pulse'
                            : 'bg-zinc-300 dark:bg-zinc-600'}`}
                      />
                    </div>
                    <div className="mt-3 text-center px-1 w-full">
                      <p className={`text-[10px] font-bold uppercase tracking-widest
                        ${stage.failed ? 'text-red-500' : stage.done ? 'text-emerald-600 dark:text-emerald-400' : stage.active ? 'text-amber-600 dark:text-amber-400' : 'text-text_secondary'}`}>
                        {stage.actor}
                      </p>
                      <p className={`text-xs font-bold mt-0.5
                        ${stage.failed ? 'text-red-500' : stage.done ? 'text-text_primary' : stage.active ? 'text-text_primary' : 'text-text_secondary/50'}`}>
                        {stage.label}
                      </p>
                      <p className="text-[10px] text-text_secondary mt-0.5 leading-tight line-clamp-2">{stage.detail}</p>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div className={`hidden md:block flex-1 h-0.5 mx-2 transition-all
                      ${stage.done ? 'bg-emerald-500/40' : 'bg-border'}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
