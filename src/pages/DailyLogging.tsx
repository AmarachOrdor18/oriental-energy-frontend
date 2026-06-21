import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { ChevronLeft, ChevronRight, CheckCircle, Plus, X, Save, AlertTriangle, Loader2, BookOpen, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Project {
  id: string;
  name: string;
  code: string;
  max_hours_per_week: number;
}

interface DayLog {
  project_id: string;
  hours: number;
  notes: string;
  activity_id?: string;
  project_name?: string;
  project_code?: string;
}

type DayMode = 'work' | 'annual_leave' | 'sick_leave';

interface MonthDayLog {
  totalHours: number;
  status: 'logged' | 'leave';
  leaveType?: Exclude<DayMode, 'work'>;
  logs: DayLog[];
}

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

export default function DailyLogging() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [activitiesByProject, setActivitiesByProject] = useState<Record<string, any[]>>({});

  // Modal state
  const [selectedDay, setSelectedDay] = useState<{ date: Date; dateStr: string } | null>(null);
  const [modalRows, setModalRows] = useState<DayLog[]>([]);
  const [dayMode, setDayMode] = useState<DayMode>('work');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Logs data: { "2026-05-28": { totalHours: 8, status: 'logged' | 'leave' } }
  const [monthLogs, setMonthLogs] = useState<Record<string, MonthDayLog>>({});
  const [monthLogsLoaded, setMonthLogsLoaded] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadProjects();
    loadHolidays();
  }, []);

  useEffect(() => {
    generateCalendar(year, month);
    loadMonthLogs(year, month);
  }, [year, month]);

  const loadProjects = async () => {
    try {
      const list = await api.getProjects();
      setProjects(list);
      // Pre-load activities for all projects
      const acts = await api.getActivities().catch(() => []);
      const byProject: Record<string, any[]> = {};
      acts.forEach((a: any) => {
        if (!byProject[a.project_id]) byProject[a.project_id] = [];
        byProject[a.project_id].push(a);
      });
      setActivitiesByProject(byProject);
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  const loadHolidays = async () => {
    try {
      const hols = await api.getHolidays(year);
      setHolidays(hols);
    } catch (err) {
      console.error('Failed to load holidays', err);
    }
  };

  const loadMonthLogs = async (y: number, m: number) => {
    if (!user?.id) return;
    setMonthLogsLoaded(false);
    try {
      // Load logs for each week in the month
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      const logsMap: Record<string, MonthDayLog> = {};

      // Get the Monday of the week containing the first day
      const startDate = new Date(firstDay);
      const dayOfWeek = startDate.getDay();
      startDate.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

      // Fetch week by week
      const weeksToFetch: string[] = [];
      const cursor = new Date(startDate);
      while (cursor <= lastDay) {
        weeksToFetch.push(toDateKey(cursor));
        cursor.setDate(cursor.getDate() + 7);
      }

      const weekLogsArrays = await Promise.all(
        weeksToFetch.map(weekStart =>
          api.getDailyLogs({ user_id: user.id, week_start: weekStart }).catch(() => [])
        )
      );
      for (const logs of weekLogsArrays) {
        logs.forEach((log: any) => {
            const dateKey = apiDateKey(log.date);
            if (!dateKey) return;
            if (!logsMap[dateKey]) {
              logsMap[dateKey] = { totalHours: 0, status: 'logged', logs: [] };
            }
            const hours = parseFloat(log.hours) || 0;
            logsMap[dateKey].totalHours += hours;
            logsMap[dateKey].logs.push({
              project_id: log.project_id,
              hours,
              notes: log.notes || '',
              project_name: log.project_name,
              project_code: log.project_code,
            });
            if (log.notes === 'annual_leave' || log.notes === 'sick_leave') {
              logsMap[dateKey].status = 'leave';
              logsMap[dateKey].leaveType = log.notes;
            }
          });
      }

      setMonthLogs(logsMap);
    } catch (err) {
      console.error('Failed to load month logs', err);
    } finally {
      setMonthLogsLoaded(true);
    }
  };

  const generateCalendar = (y: number, m: number) => {
    const firstDayOfMonth = new Date(y, m, 1);
    const lastDayOfMonth = new Date(y, m + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    const days = [];

    // Previous month padding
    const prevMonthLastDay = new Date(y, m, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(y, m - 1, prevMonthLastDay - i)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(y, m, i)
      });
    }

    // Next month padding to fill 6 rows
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(y, m + 1, i)
      });
    }

    setCalendarDays(days);
  };

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));


  const isHoliday = (dateStr: string) => holidays.some((h: any) => apiDateKey(h.date) === dateStr);
  const getHolidayName = (dateStr: string) => holidays.find((h: any) => apiDateKey(h.date) === dateStr)?.name;
  const getLeaveLabel = (leaveType?: string) => leaveType === 'sick_leave' ? 'Sick leave' : leaveType === 'annual_leave' ? 'Annual leave' : 'Leave';
  const isLatestMonth = year === new Date().getFullYear() && month === new Date().getMonth();

  const getDayStatus = (dayObj: any) => {
    if (!dayObj.isCurrentMonth) return 'padding';
    if (!monthLogsLoaded) return 'loading';
    const dateStr = toDateKey(dayObj.date);
    if (isHoliday(dateStr)) return 'holiday';
    const dayOfWeek = dayObj.date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'weekend';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dayObj.date > today) return 'future';
    const logData = monthLogs[dateStr];
    if (logData?.status === 'leave') return 'leave';
    if (logData && logData.totalHours >= 8) return 'logged';
    if (logData && logData.totalHours > 0) return 'incomplete';
    if (dayObj.date < today) return 'missed';
    return 'not_logged';
  };

  // Count incomplete days for notification
  const incompleteDays = useMemo(() => {
    return calendarDays.filter(d => {
      if (!d.isCurrentMonth) return false;
      const status = getDayStatus(d);
      return status === 'missed' || status === 'incomplete';
    });
  }, [calendarDays, monthLogs, holidays]);

  const hasWeekendLogs = useMemo(() => {
    if (!monthLogsLoaded) return false;
    return calendarDays.some(d => {
      const dow = d.date.getDay();
      if (dow !== 0 && dow !== 6) return false;
      return (monthLogs[toDateKey(d.date)]?.totalHours || 0) > 0;
    });
  }, [calendarDays, monthLogs, monthLogsLoaded]);

  const visibleCalendarDays = useMemo(() => {
    if (hasWeekendLogs) return calendarDays;
    return calendarDays.filter(d => { const dow = d.date.getDay(); return dow !== 0 && dow !== 6; });
  }, [calendarDays, hasWeekendLogs]);

  const visibleDayHeaders = hasWeekendLogs ? DAYS_OF_WEEK : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const calendarGridCols = hasWeekendLogs ? 'grid-cols-7' : 'grid-cols-5';

  // All week-start dates (Mondays) that fall within the viewed month
  const weeksInMonth = useMemo(() => {
    const weeks: string[] = [];
    const lastDay = new Date(year, month + 1, 0);
    const cursor = new Date(year, month, 1);
    const dow = cursor.getDay();
    cursor.setDate(cursor.getDate() - (dow === 0 ? 6 : dow - 1));
    while (cursor <= lastDay) {
      weeks.push(toDateKey(new Date(cursor)));
      cursor.setDate(cursor.getDate() + 7);
    }
    return weeks;
  }, [year, month]);

  // Reset selected week when navigating months
  useEffect(() => {
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (isCurrentMonth) {
      const day = now.getDay();
      now.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      setSelectedWeekStart(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    } else {
      const cursor = new Date(year, month, 1);
      const dow = cursor.getDay();
      cursor.setDate(cursor.getDate() - (dow === 0 ? 6 : dow - 1));
      setSelectedWeekStart(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
    }
  }, [year, month]);

  const handleDayClick = (dayObj: any) => {
    const status = getDayStatus(dayObj);
    if (status === 'padding' || status === 'weekend' || status === 'future' || status === 'holiday') return;

    const dateStr = toDateKey(dayObj.date);
    const existingLogs = monthLogs[dateStr]?.logs || [];
    const existingLeaveType = monthLogs[dateStr]?.leaveType;

    // Populate modal rows from existing logs, or start with one empty row
    if (existingLogs.length > 0) {
      setModalRows(existingLogs.map(l => ({ ...l })));
    } else {
      setModalRows([{ project_id: '', hours: 0, notes: '' }]);
    }

    setDayMode(existingLeaveType || 'work');
    setSelectedDay({ date: dayObj.date, dateStr });
    setSaveMsg(null);
  };

  const addRow = () => {
    setModalRows(prev => [...prev, { project_id: '', hours: 0, notes: '' }]);
  };

  const removeRow = (index: number) => {
    setModalRows(prev => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof DayLog, value: any) => {
    setModalRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const modalTotal = modalRows.reduce((sum, r) => sum + (parseFloat(String(r.hours)) || 0), 0);

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return toDateKey(d);
  };

  const getWeekEnd = (weekStartDate: string) => {
    const d = parseDateKey(weekStartDate);
    d.setDate(d.getDate() + 6);
    return toDateKey(d);
  };

  const parseDateKey = (value: string) => {
    const [dateYear, dateMonth, dateDay] = value.split('-').map(Number);
    return new Date(dateYear, dateMonth - 1, dateDay);
  };

  const handleSaveDay = async () => {
    if (!selectedDay || !user?.id) return;
    setIsSaving(true);
    setSaveMsg(null);

    try {
      const weekStart = getWeekStart(selectedDay.date);
      const workEntries = modalRows
        .filter(r => r.project_id && r.hours > 0)
        .map(r => ({
          project_id: r.project_id,
          date: selectedDay.dateStr,
          hours: r.hours,
          week_start_date: weekStart,
          notes: r.notes || '',
          activity_id: r.activity_id || null,
        }));

      if (dayMode !== 'work') {
        const markerProjectId = modalRows.find(r => r.project_id)?.project_id || projects[0]?.id;
        if (!markerProjectId) {
          setSaveMsg('Add a project before marking leave.');
          setIsSaving(false);
          return;
        }

        await api.saveDailyLogDay({
          date: selectedDay.dateStr,
          week_start_date: weekStart,
          leave_type: dayMode,
          entries: [{ project_id: markerProjectId }],
        });
      } else if (workEntries.length === 0) {
        setSaveMsg('Add at least one project with hours.');
        setIsSaving(false);
        return;
      } else {
        await api.saveDailyLogDay({
          date: selectedDay.dateStr,
          week_start_date: weekStart,
          entries: workEntries,
        });
      }

      // Reload month data
      await loadMonthLogs(year, month);
      setSaveMsg('Saved!');
      setTimeout(() => {
        setSelectedDay(null);
        setSaveMsg(null);
      }, 800);
    } catch (err: any) {
      setSaveMsg(err.message || 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitCurrentWeek = async () => {
    if (!user?.id || !selectedWeekStart) return;
    setIsSubmitting(true);
    setSubmitMsg(null);

    const weekStart = selectedWeekStart;
    const weekEnd = getWeekEnd(weekStart);

    try {
      const [summary, weekHolidays, timesheets] = await Promise.all([
        api.getWeeklySummary(user.id, weekStart),
        api.getHolidays(parseDateKey(weekStart).getFullYear()),
        api.getTimesheets({ user_id: user.id }),
      ]);

      const totals = new Map<string, { hours: number; leave: boolean }>();
      (summary.daily_totals || []).forEach((row: any) => {
        const dateKey = apiDateKey(row.date);
        if (dateKey) totals.set(dateKey, { hours: parseFloat(row.total_hours || 0), leave: false });
      });
      (summary.entries || []).forEach((entry: any) => {
        const dateKey = apiDateKey(entry.date);
        if (!dateKey) return;
        const current = totals.get(dateKey) || { hours: 0, leave: false };
        current.leave = current.leave || entry.notes === 'annual_leave' || entry.notes === 'sick_leave';
        totals.set(dateKey, current);
      });

      const holidaySet = new Set(
        (weekHolidays || [])
          .map((holiday: any) => apiDateKey(holiday.date))
          .filter(Boolean)
      );
      const shortDays: string[] = [];
      const cursor = parseDateKey(weekStart);
      for (let i = 0; i < 5; i++) {
        const dateKey = toDateKey(cursor);
        const entry = totals.get(dateKey);
        if (!holidaySet.has(dateKey) && !entry?.leave && (entry?.hours || 0) < 8) {
          shortDays.push(cursor.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }));
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      if (shortDays.length > 0) {
        setSubmitMsg({ type: 'error', text: `Submission blocked: ${shortDays.join(', ')} are below the 8 hour minimum. Add hours or mark leave before submitting.` });
        return;
      }

      const existing = (timesheets || []).find((ts: any) => apiDateKey(ts.week_start_date) === weekStart);
      const timesheet = existing || await api.createTimesheet({
        week_start_date: weekStart,
        week_end_date: weekEnd,
        accounting_period: weekStart.substring(0, 7),
      });

      await api.submitTimesheet(timesheet.id);
      const wStart = parseDateKey(weekStart);
      const wEnd = parseDateKey(weekEnd);
      setSubmitMsg({ type: 'success', text: `Week of ${wStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${wEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} submitted for review.` });
      await loadMonthLogs(year, month);
    } catch (err: any) {
      setSubmitMsg({ type: 'error', text: err.message || 'Failed to submit current week.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text_primary">Daily Logging</h1>
            <p className="text-sm text-text_secondary mt-1">Click on a day to view, edit, or mark leave while staying in the calendar.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedWeekStart}
              onChange={e => setSelectedWeekStart(e.target.value)}
              className="bg-surface border border-border text-text_primary text-sm font-semibold px-3 py-2.5 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            >
              {weeksInMonth.map(ws => {
                const s = parseDateKey(ws);
                const e = new Date(s); e.setDate(e.getDate() + 6);
                const isThisWeek = ws === getWeekStart(new Date());
                return (
                  <option key={ws} value={ws}>
                    {s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{isThisWeek ? ' (this week)' : ''}
                  </option>
                );
              })}
            </select>
            <button
              onClick={handleSubmitCurrentWeek}
              disabled={isSubmitting || !selectedWeekStart}
              className="bg-primary hover:bg-primary_dark text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 text-sm disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSubmitting ? 'Submitting...' : 'Submit Week'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {submitMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-5 p-4 rounded-xl flex items-start gap-3 border ${submitMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}
            >
              {submitMsg.type === 'success' ? <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />}
              <p className="text-sm font-semibold">{submitMsg.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Incomplete Hours Notification */}
        <AnimatePresence>
          {incompleteDays.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3"
            >
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  {incompleteDays.length} day{incompleteDays.length > 1 ? 's' : ''} with incomplete hours this month
                </p>
                <p className="text-xs text-orange-500/80 mt-0.5">
                  {incompleteDays.slice(0, 5).map(d => d.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })).join(', ')}
                  {incompleteDays.length > 5 ? ` and ${incompleteDays.length - 5} more` : ''}
                  {' - '}click on a flagged day to fill it in.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calendar Card */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Calendar Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-text_primary min-w-[180px]">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
                  <div className="flex items-center bg-background rounded-lg border border-border p-0.5">
                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-surface rounded-md text-text_secondary hover:text-text_primary transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  disabled={isLatestMonth}
                  className={`p-1.5 rounded-md transition-colors ${isLatestMonth ? 'text-text_secondary/40 cursor-not-allowed' : 'text-text_secondary hover:bg-surface hover:text-text_primary'}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-text_secondary">Logged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <span className="text-text_secondary">Incomplete</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                  <span className="text-text_secondary">Leave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <span className="text-text_secondary">Missing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-background border border-border"></div>
                <span className="text-text_secondary">Upcoming</span>
              </div>
            </div>
          </div>

          {/* Calendar Grid — compact */}
          <div className="p-4">
            <div className={`grid ${calendarGridCols} gap-1.5 mb-1.5`}>
              {visibleDayHeaders.map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-text_secondary uppercase tracking-widest py-1.5">
                  {day}
                </div>
              ))}
            </div>

            <div className={`grid ${calendarGridCols} gap-1.5`}>
              {visibleCalendarDays.map((dayObj, i) => {
                const status = getDayStatus(dayObj);
                const dateStr = toDateKey(dayObj.date);
                const logData = monthLogs[dateStr];
                const holidayName = getHolidayName(dateStr);

                let bgClass = '';
                let textClass = '';
                let borderClass = 'border-transparent';
                let isClickable = false;

                switch (status) {
                  case 'padding':
                    bgClass = 'bg-transparent';
                    textClass = 'text-text_secondary/20';
                    break;
                  case 'weekend':
                    bgClass = 'bg-surface';
                    textClass = 'text-text_secondary/40';
                    borderClass = 'border-border/30';
                    break;
                  case 'holiday':
                    bgClass = 'bg-purple-500/10';
                    textClass = 'text-purple-500';
                    borderClass = 'border-purple-500/20';
                    break;
                  case 'loading':
                    bgClass = 'bg-background';
                    textClass = 'text-text_secondary/60';
                    borderClass = 'border-border/50';
                    break;
                  case 'future':
                    bgClass = 'bg-background';
                    textClass = 'text-text_secondary/50';
                    borderClass = 'border-border/50';
                    break;
                  case 'missed':
                    bgClass = 'bg-red-500';
                    textClass = 'text-white';
                    borderClass = 'border-red-500';
                    isClickable = true;
                    break;
                  case 'logged':
                    bgClass = 'bg-emerald-500';
                    textClass = 'text-white';
                    borderClass = 'border-emerald-500';
                    isClickable = true;
                    break;
                  case 'incomplete':
                    bgClass = 'bg-amber-500';
                    textClass = 'text-white';
                    borderClass = 'border-amber-500';
                    isClickable = true;
                    break;
                  case 'leave':
                    bgClass = 'bg-orange-500';
                    textClass = 'text-white';
                    borderClass = 'border-orange-500';
                    isClickable = true;
                    break;
                  case 'not_logged':
                    bgClass = 'bg-background hover:bg-primary/5';
                    textClass = 'text-text_primary';
                    borderClass = 'border-border hover:border-primary/40';
                    isClickable = true;
                    break;
                }

                const isToday = dayObj.date.toDateString() === new Date().toDateString();

                return (
                  <motion.div
                    key={i}
                    whileHover={isClickable ? { scale: 0.97 } : {}}
                    whileTap={isClickable ? { scale: 0.95 } : {}}
                    onClick={() => isClickable && handleDayClick(dayObj)}
                    className={`min-h-[60px] rounded-lg border p-1.5 flex flex-col transition-all duration-150 ${bgClass} ${borderClass} ${isClickable ? 'cursor-pointer' : 'cursor-default'} ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold ${textClass} ${isToday && status === 'not_logged' ? '!text-primary' : ''}`}>
                        {dayObj.day}
                      </span>
                      {status === 'logged' && <CheckCircle className="h-3 w-3 opacity-80 text-white" />}
                    </div>

                    {status === 'logged' && logData && (
                      <span className="text-[10px] font-semibold opacity-90 mt-auto">{logData.totalHours}h</span>
                    )}
                    {status === 'incomplete' && logData && (
                      <span className="text-[10px] font-semibold opacity-90 mt-auto">{logData.totalHours}h</span>
                    )}
                    {status === 'leave' && (
                      <span className="text-[10px] font-semibold opacity-90 mt-auto">{getLeaveLabel(logData?.leaveType)}</span>
                    )}
                    {status === 'missed' && (
                      <span className="text-[10px] font-semibold opacity-90 mt-auto">Missing</span>
                    )}
                    {status === 'future' && (
                      <span className="text-[10px] font-semibold opacity-70 mt-auto">Upcoming</span>
                    )}
                    {status === 'loading' && (
                      <span className="text-[10px] opacity-70 mt-auto">Loading…</span>
                    )}
                    {status === 'holiday' && holidayName && (
                      <span className="text-[9px] font-medium opacity-80 mt-auto truncate">{holidayName}</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Day Logging Modal */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedDay(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50">
                <div>
                  <h2 className="text-lg font-bold text-text_primary">
                    {selectedDay.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h2>
                  <p className="text-xs text-text_secondary mt-0.5">Review saved entries, log project hours, or mark this day as leave.</p>
                </div>
                <button onClick={() => setSelectedDay(null)} className="p-2 rounded-xl text-text_secondary hover:bg-border_light hover:text-text_primary transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 pt-5">
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-background p-1">
                  {[
                    ['work', 'Work day'],
                    ['annual_leave', 'Annual leave'],
                    ['sick_leave', 'Sick leave'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDayMode(value as DayMode)}
                      className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${dayMode === value ? 'bg-primary text-white shadow-sm' : 'text-text_secondary hover:bg-surface hover:text-text_primary'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Rows */}
              <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
                {dayMode !== 'work' ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 text-center">
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-300 mb-1">{getLeaveLabel(dayMode)} recorded</p>
                    <p className="text-xs text-amber-600/70 dark:text-amber-300/70">This day will be marked as {getLeaveLabel(dayMode).toLowerCase()}. No hours entry is required.</p>
                  </div>
                ) : (
                  <>
                    {modalRows.map((row, idx) => (
                      <div key={idx} className="bg-background border border-border rounded-xl p-4 space-y-3 group relative">
                        {modalRows.length > 1 && (
                          <button
                            onClick={() => removeRow(idx)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-text_secondary hover:text-red-500 hover:bg-red-500/10 transition-all"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-text_secondary uppercase tracking-widest">Project</label>
                          <div className="relative">
                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                            <select
                              value={row.project_id}
                              onChange={(e) => updateRow(idx, 'project_id', e.target.value)}
                              className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text_primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-semibold appearance-none cursor-pointer"
                            >
                              <option value="">Select project...</option>
                              {projects.map(p => {
                                const isThisRow = row.project_id === p.id;
                                const usedElsewhere = modalRows.some((r, ri) => ri !== idx && r.project_id === p.id);
                                if (usedElsewhere && !isThisRow) return null;
                                return (
                                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                                );
                              })}
                            </select>
                          </div>
                        </div>

                        {row.project_id && activitiesByProject[row.project_id]?.length > 0 && (
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-text_secondary uppercase tracking-widest">Activity</label>
                            <select
                              value={row.activity_id || ''}
                              onChange={(e) => updateRow(idx, 'activity_id', e.target.value || undefined)}
                              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text_primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                            >
                              <option value="">Select activity (optional)…</option>
                              {activitiesByProject[row.project_id].map(a => (
                                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-text_secondary uppercase tracking-widest">Hours</label>
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={row.hours || ''}
                              onChange={(e) => updateRow(idx, 'hours', parseFloat(e.target.value) || 0)}
                              placeholder="0.0"
                              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text_primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-text_secondary uppercase tracking-widest">Notes</label>
                            <input
                              type="text"
                              value={row.notes}
                              onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                              placeholder="Optional..."
                              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text_primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addRow}
                      className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary_dark transition-colors w-full justify-center py-2 border border-dashed border-primary/30 rounded-xl hover:bg-primary/5"
                    >
                      <Plus className="h-4 w-4" /> Add Another Project
                    </button>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-border bg-background/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {dayMode === 'work' ? (
                    <>
                      <span className="text-sm font-bold text-text_primary">
                        Total: <span className={`${modalTotal >= 8 ? 'text-emerald-500' : modalTotal > 0 ? 'text-amber-500' : 'text-text_secondary'}`}>{modalTotal}h</span>
                      </span>
                      {modalTotal > 0 && modalTotal < 8 && (
                        <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Below 8h minimum
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-orange-500">{getLeaveLabel(dayMode)}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="text-sm font-semibold text-text_secondary hover:text-text_primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDay}
                    disabled={isSaving}
                    className="px-5 py-2 bg-primary hover:bg-primary_dark text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Save Day
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Save message */}
              <AnimatePresence>
                {saveMsg && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`px-6 py-2 text-center text-sm font-semibold ${saveMsg === 'Saved!' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
                  >
                    {saveMsg}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
