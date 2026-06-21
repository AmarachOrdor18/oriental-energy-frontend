import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { ChevronLeft, Save, Send, Plus, CheckCircle2, Clock, Lock, Unlock, Loader2, X, AlertCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

interface Project { id: string; name: string; code: string; max_hours_per_week: number; }

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

const apiDateKey = (value?: string) => value ? value.slice(0, 10) : '';

export default function TimesheetDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [gridData, setGridData] = useState<Record<string, Record<string, number>>>({}); // { projectId: { dateStr: hours } }
  const [leaveBlocks, setLeaveBlocks] = useState<Record<string, string>>({}); // { dateStr: 'annual_leave' | 'sick_leave' }
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [timesheetStatus, setTimesheetStatus] = useState('draft');
  const [timesheetId, setTimesheetId] = useState(id || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [dayEditor, setDayEditor] = useState<{ dateStr: string; label: string } | null>(null);

  // Get current week's Monday
  const getCurrentWeekMonday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return toDateKey(monday);
  };

  const getDays = (startDate: string) => {
    const days = [];
    const date = parseDateKey(startDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(date);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = weekStart ? getDays(weekStart) : [];

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      // Load projects
      const projectList = await api.getProjects();
      setProjects(projectList);

      // Load holidays
      const hols = await api.getHolidays(2026);
      setHolidays(hols);

      if (id && id !== 'new') {
        // Load existing timesheet
        const ts = await api.getTimesheet(id);
        setTimesheetId(ts.id);
        setWeekStart(apiDateKey(ts.week_start_date));
        setWeekEnd(apiDateKey(ts.week_end_date));
        setTimesheetStatus(ts.status);

        // Load daily logs for this week
        const logs = await api.getDailyLogs({ user_id: user?.id || '', week_start: apiDateKey(ts.week_start_date) });
        const grid: Record<string, Record<string, number>> = {};
        const usedProjectIds = new Set<string>();

        logs.forEach((log: any) => {
          const dateKey = apiDateKey(log.date);
          if (!grid[log.project_id]) grid[log.project_id] = {};
          grid[log.project_id][dateKey] = parseFloat(log.hours) || 0;
          if (log.notes === 'annual_leave' || log.notes === 'sick_leave') {
            setLeaveBlocks(prev => ({ ...prev, [dateKey]: log.notes }));
          }
          usedProjectIds.add(log.project_id);
        });

        setGridData(grid);
        const usedProjects = projectList.filter((p: Project) => usedProjectIds.has(p.id));
        setSelectedProjects(usedProjects.length > 0 ? usedProjects : projectList.slice(0, 2));
      } else {
        // New timesheet - use current week
        const ws = getCurrentWeekMonday();
        const we = parseDateKey(ws);
        we.setDate(we.getDate() + 6);
        setWeekStart(ws);
        setWeekEnd(toDateKey(we));
        setSelectedProjects(projectList.slice(0, 2));
        setTimesheetStatus('draft');
      }
    } catch (err) {
      console.error('Load error:', err);
      setErrorMsg('Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHourChange = (projectId: string, dateStr: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setGridData(prev => ({
      ...prev,
      [projectId]: { ...(prev[projectId] || {}), [dateStr]: numValue }
    }));
  };

  const getHours = (projectId: string, dateStr: string) => gridData[projectId]?.[dateStr] || 0;

  const isHoliday = (dateStr: string) => holidays.some((h: any) => apiDateKey(h.date) === dateStr);
  const getHolidayName = (dateStr: string) => holidays.find((h: any) => apiDateKey(h.date) === dateStr)?.name;
  const isLeaveBlocked = (dateStr: string) => !!leaveBlocks[dateStr];
  const isWeekend = (dayIndex: number) => dayIndex >= 5; // Sat=5, Sun=6
  const dayStatusLabel = (leaveType?: string) => {
    if (leaveType === 'annual_leave') return 'Annual';
    if (leaveType === 'sick_leave') return 'Sick';
    return 'Work';
  };
  const dayStatusTone = (leaveType?: string) => {
    if (leaveType === 'annual_leave') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300';
    if (leaveType === 'sick_leave') return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300';
    return 'border-border bg-surface text-text_secondary hover:border-primary/30 hover:text-primary';
  };

  const calcProjectTotal = (projectId: string) => Object.values(gridData[projectId] || {}).reduce((s, h) => s + h, 0);
  const calcDayTotal = (dateStr: string) => selectedProjects.reduce((s, p) => s + getHours(p.id, dateStr), 0);
  const calcGrandTotal = () => selectedProjects.reduce((s, p) => s + calcProjectTotal(p.id), 0);

  const isDayFilled = (dateStr: string) => calcDayTotal(dateStr) > 0;

  const handleDayBlock = (dateStr: string, type: string) => {
    if (type === 'work') {
      setLeaveBlocks(prev => { const n = { ...prev }; delete n[dateStr]; return n; });
    } else {
      setLeaveBlocks(prev => ({ ...prev, [dateStr]: type }));
      setGridData(prev => {
        const next = { ...prev };
        selectedProjects.forEach((project) => {
          next[project.id] = { ...(next[project.id] || {}), [dateStr]: 0 };
        });
        return next;
      });
    }
  };

  const addProjectRow = (project: Project) => {
    if (!selectedProjects.find(p => p.id === project.id)) {
      setSelectedProjects([...selectedProjects, project]);
    }
    setShowAddProject(false);
  };

  const removeProjectRow = (projectId: string) => {
    setSelectedProjects(selectedProjects.filter(p => p.id !== projectId));
    setGridData(prev => { const n = { ...prev }; delete n[projectId]; return n; });
  };

  const handleSave = async (): Promise<string | null> => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      // Build batch entries
      const entries: any[] = [];
      for (const project of selectedProjects) {
        for (const day of days) {
          const dateStr = toDateKey(day);
          const leaveType = leaveBlocks[dateStr];
          const hours = leaveType ? 0 : getHours(project.id, dateStr);
          entries.push({ project_id: project.id, date: dateStr, hours, week_start_date: weekStart, notes: leaveType || '' });
        }
      }

      // Ensure timesheet exists
      let tsId = timesheetId;
      if (!tsId || tsId === 'new') {
        const period = `${weekStart.substring(0, 7)}`;
        const ts = await api.createTimesheet({ week_start_date: weekStart, week_end_date: weekEnd, accounting_period: period });
        tsId = ts.id;
        setTimesheetId(tsId);
      }

      await api.saveDailyLogBatch(entries);
      setSuccessMsg('Daily log saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
      return tsId;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitWeek = async () => {
    const shortDays = days
      .map((day, index) => ({ day, index, dateStr: toDateKey(day) }))
      .filter(({ index, dateStr }) => index < 5 && !isHoliday(dateStr) && !isLeaveBlocked(dateStr) && calcDayTotal(dateStr) < 8);

    if (shortDays.length > 0) {
      const labels = shortDays.map(({ day }) => day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })).join(', ');
      setErrorMsg(`Submission blocked: ${labels} are below the 8 hour minimum. Add hours or mark leave before submitting.`);
      return;
    }

    const savedId = await handleSave();
    if (!savedId) return;

    try {
      await api.submitTimesheet(savedId);
      setTimesheetStatus('submitted');
      setSuccessMsg('Week submitted for review!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit.');
    }
  };

  const canWithdraw = ['submitted', 'under_review'].includes(timesheetStatus);
  const isLocked = ['submitted', 'under_review', 'approved'].includes(timesheetStatus);

  const handleWithdraw = async () => {
    if (!timesheetId) return;
    try {
      await api.withdrawTimesheet(timesheetId);
      setTimesheetStatus('draft');
      setSuccessMsg('Submission withdrawn — you can now edit and resubmit.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to withdraw.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setLocation('/timesheets')} className="p-2 hover:bg-surface rounded-full transition-colors text-text_secondary hover:text-text_primary">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-text_primary">
                  Weekly Log
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border
                  ${timesheetStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    timesheetStatus === 'submitted' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    timesheetStatus === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'}`}>
                  {timesheetStatus}
                </span>
              </div>
              <p className="text-sm text-text_secondary mt-1 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                {weekStart && parseDateKey(weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} - {weekEnd && parseDateKey(weekEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canWithdraw && (
              <button onClick={handleWithdraw}
                className="flex items-center gap-2 px-4 py-2 border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 rounded-lg text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all">
                <RotateCcw className="h-4 w-4" /> Withdraw &amp; Edit
              </button>
            )}
            {!isLocked && (
              <>
                <button onClick={handleSave} disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium text-text_primary hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button onClick={handleSubmitWeek}
                  className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary_dark text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary/20">
                  <Send className="h-4 w-4" /> Submit Week
                </button>
              </>
            )}
          </div>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" /> <span className="text-sm font-medium">{successMsg}</span>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
              <AlertCircle className="h-5 w-5" /> <span className="text-sm font-medium">{errorMsg}</span>
            </motion.div>
          )}
          {dayEditor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm"
              onClick={() => setDayEditor(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">Day status</p>
                    <h3 className="mt-1 text-lg font-bold text-text_primary">{dayEditor.label}</h3>
                    <p className="mt-1 text-sm text-text_secondary">Choose how this day should appear on the timesheet and approval screens.</p>
                  </div>
                  <button onClick={() => setDayEditor(null)} className="rounded-lg p-2 text-text_secondary hover:bg-background hover:text-text_primary">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-2">
                  {[
                    ['work', 'Work day', 'Enable hour entry for this date.'],
                    ['annual_leave', 'Annual leave', 'Mark the day as annual leave and clear project hours.'],
                    ['sick_leave', 'Sick leave', 'Mark the day as sick leave and clear project hours.'],
                  ].map(([value, title, detail]) => (
                    <button
                      key={value}
                      onClick={() => {
                        handleDayBlock(dayEditor.dateStr, value);
                        setDayEditor(null);
                      }}
                      className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${dayStatusTone(value === 'work' ? undefined : value)}`}
                    >
                      <span className="block text-sm font-bold">{title}</span>
                      <span className="mt-1 block text-xs opacity-80">{detail}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Daily Log Grid */}
        <div className="bg-surface border border-border rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-background/40 border-b border-border">
                  <th className="p-4 text-xs uppercase tracking-wider text-text_secondary font-bold w-1/5">Project / Activity</th>
                  {dayNames.map((day, i) => {
                    const dateStr = days[i] ? toDateKey(days[i]) : '';
                    const holiday = getHolidayName(dateStr);
                    const leaveType = leaveBlocks[dateStr];
                    const weekend = isWeekend(i);
                    const filled = isDayFilled(dateStr);

                    return (
                      <th key={i} className={`p-3 text-center border-l border-border/50 relative group/h min-w-[80px]
                        ${holiday ? 'bg-purple-500/5' : leaveType ? 'bg-amber-500/5' : weekend ? 'bg-zinc-100/50 dark:bg-zinc-800/30' : ''}`}>
                        <div className="text-xs uppercase tracking-wider text-text_secondary font-bold">{day}</div>
                        <div className="text-sm text-text_primary mt-0.5">{days[i]?.getDate()}</div>
                        {/* Filled indicator */}
                        <div className={`h-1.5 w-1.5 rounded-full mx-auto mt-1 ${filled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                        {holiday && <div className="text-[7px] text-purple-500 font-bold uppercase mt-0.5 truncate px-1">{holiday}</div>}
                        {leaveType && <div className={`text-[7px] font-bold uppercase mt-0.5 ${leaveType === 'annual_leave' ? 'text-amber-500' : 'text-orange-500'}`}>{leaveType.replace('_', ' ')}</div>}

                        {!isLocked && !holiday && (
                          <button
                            type="button"
                            onClick={() => setDayEditor({
                              dateStr,
                              label: days[i]?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) || day,
                            })}
                            className={`mt-2 inline-flex h-7 min-w-[58px] items-center justify-center rounded-md border px-2 text-[10px] font-bold transition-colors ${dayStatusTone(leaveType)}`}
                          >
                            {dayStatusLabel(leaveType)}
                          </button>
                        )}
                      </th>
                    );
                  })}
                  <th className="p-3 text-center border-l border-border bg-background/20 font-bold text-text_primary text-xs uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {selectedProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-background/20 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold text-text_primary group-hover:text-primary transition-colors">{project.name}</span>
                          <span className="text-xs text-text_secondary ml-2">{project.code}</span>
                        </div>
                        {!isLocked && selectedProjects.length > 1 && (
                          <button onClick={() => removeProjectRow(project.id)} className="opacity-0 group-hover:opacity-100 text-text_secondary hover:text-red-500 transition-all">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    {days.map((day, dIdx) => {
                      const dateStr = toDateKey(day);
                      const holiday = isHoliday(dateStr);
                      const blocked = isLeaveBlocked(dateStr);
                      const disabled = holiday || blocked || isLocked;
                      const weekend = isWeekend(dIdx);

                      return (
                        <td key={dIdx} className={`p-1 border-l border-border/30 ${disabled ? 'bg-background/40' : weekend ? 'bg-zinc-50/50 dark:bg-zinc-800/20' : ''}`}>
                          <input
                            type="number"
                            min="0" max="24" step="0.5"
                            value={getHours(project.id, dateStr) || ''}
                            onChange={(e) => handleHourChange(project.id, dateStr, e.target.value)}
                            disabled={disabled}
                            placeholder={disabled ? '-' : '0'}
                            className="w-full bg-transparent text-center py-2 text-sm text-text_primary focus:bg-primary/5 focus:outline-none focus:ring-1 focus:ring-primary/30 rounded transition-all placeholder:text-text_secondary/30 disabled:opacity-30"
                          />
                        </td>
                      );
                    })}
                    <td className="p-3 text-center border-l border-border bg-background/10">
                      <span className="text-sm font-bold text-text_primary">{calcProjectTotal(project.id)}h</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-background/40 border-t border-border">
                <tr className="font-bold">
                  <td className="p-4 text-xs text-text_secondary uppercase tracking-wider">Daily Totals</td>
                  {days.map((day, i) => {
                    const dateStr = toDateKey(day);
                    return (
                      <td key={i} className="p-3 text-center border-l border-border/50">
                        <span className="text-sm text-text_primary">{calcDayTotal(dateStr)}h</span>
                      </td>
                    );
                  })}
                  <td className="p-3 text-center border-l border-border bg-primary/10">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-primary uppercase">Grand Total</span>
                      <span className="text-lg text-primary font-bold">{calcGrandTotal()}h</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Add Project Row */}
        {!isLocked && (
          <div className="mb-8">
            {showAddProject ? (
              <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text_primary">Add Project Row</h3>
                  <button onClick={() => setShowAddProject(false)} className="text-text_secondary hover:text-text_primary"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {projects.filter(p => !selectedProjects.find(sp => sp.id === p.id)).map(p => (
                    <button key={p.id} onClick={() => addProjectRow(p)}
                      className="text-left p-3 border border-border rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-all">
                      <p className="text-sm font-semibold text-text_primary">{p.name}</p>
                      <p className="text-[10px] text-text_secondary">{p.code} • Max {p.max_hours_per_week}h/wk</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddProject(true)}
                className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary_dark transition-colors">
                <Plus className="h-4 w-4" /> Add Project Row
              </button>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-text_secondary uppercase tracking-wider">Week Progress</span>
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-text_primary mb-2">{calcGrandTotal()} / 40h</div>
            <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((calcGrandTotal() / 40) * 100, 100)}%` }}
                className="h-full bg-primary" />
            </div>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-text_secondary uppercase tracking-wider">Projects</span>
            </div>
            <div className="text-2xl font-bold text-text_primary mb-1">{selectedProjects.length}</div>
            <p className="text-xs text-text_secondary">Active in current week</p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-text_secondary uppercase tracking-wider">Status</span>
              {isLocked ? <Lock className="h-4 w-4 text-amber-500" /> : <Unlock className="h-4 w-4 text-emerald-500" />}
            </div>
            <div className="text-lg font-bold text-text_primary">{isLocked ? 'Locked' : 'Editable'}</div>
            <p className="text-xs text-text_secondary mt-1">{isLocked ? 'This week has been approved.' : 'Submit to lock for approval.'}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
