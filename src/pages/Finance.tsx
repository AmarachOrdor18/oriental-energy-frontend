import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, BarChart3, Check, CheckCircle, ChevronDown, ChevronUp,
  Download, FileCheck2, FileText, History, RefreshCw, Search, Users, X,
} from 'lucide-react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

type ReviewMode = 'employee' | 'project';
type ReviewDecision = 'pending_review' | 'ok_for_export' | 'queried' | 'rejected' | 'exported';
type ActiveTab = 'review' | 'history' | 'exports';

interface SelectedEmployee { user_id: string; user_name: string }

const decisionStyles: Record<ReviewDecision, string> = {
  pending_review: 'bg-gray-100 text-gray-600',
  ok_for_export:  'bg-success-bg text-success',
  queried:        'bg-warning-bg text-warning',
  rejected:       'bg-danger-bg text-danger',
  exported:       'bg-navy-100 text-navy-700',
};

const decisionLabel: Record<ReviewDecision, string> = {
  pending_review: 'Pending',
  ok_for_export:  'OK for Export',
  queried:        'Queried',
  rejected:       'Rejected',
  exported:       'Exported',
};

const issueLabel = (row: any) => {
  const issues: string[] = [];
  const hours = parseFloat(row.total_hours || 0);
  if (hours < 8)  issues.push('Below minimum');
  if (hours > 60) issues.push('High hours');
  if (Number(row.leave_days || 0) > 0)          issues.push('Leave flagged');
  if (Number(row.public_holiday_days || 0) > 0) issues.push('Holiday flagged');
  return issues;
};

export default function Finance() {
  const [activeTab,   setActiveTab]   = useState<ActiveTab>('review');
  const [period,      setPeriod]      = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [mode,        setMode]        = useState<ReviewMode>('employee');
  const [reviewData,  setReviewData]  = useState<any>({ rows: [], summary: { total_hours: 0 } });
  const [reviewState, setReviewState] = useState<Record<string, ReviewDecision>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [query,       setQuery]       = useState('');
  const [isLoading,   setIsLoading]   = useState(true);
  const [isSaving,    setIsSaving]    = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState({ decision: '', user_id: '' });
  const [exportsData, setExportsData] = useState<any[]>([]);
  const [isRerunning, setIsRerunning] = useState<string | null>(null);

  // Drill-down state
  const [selectedEmployee,   setSelectedEmployee]   = useState<SelectedEmployee | null>(null);
  const [drilldownLines,     setDrilldownLines]     = useState<any[]>([]);
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false);
  const [drilldownQuery,     setDrilldownQuery]     = useState('');

  useEffect(() => { loadData(); }, [period]);
  useEffect(() => { if (activeTab === 'history') loadHistory(); }, [activeTab, period]);
  useEffect(() => { if (activeTab === 'exports') loadExports(); }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    setSelectedEmployee(null);
    setDrilldownLines([]);
    try {
      const [rows, decisions] = await Promise.all([
        api.getFinanceReviewQueue({ period }),
        api.getFinanceDecisions(period),
      ]);
      setReviewData(rows);
      const stateFromDb: Record<string, ReviewDecision> = {};
      const notesFromDb: Record<string, string> = {};
      decisions.forEach((d: any) => {
        const key = `${d.timesheet_id}-${d.user_id}-${d.project_id}`;
        stateFromDb[key] = d.decision as ReviewDecision;
        if (d.review_notes) notesFromDb[key] = d.review_notes;
      });
      setReviewState(stateFromDb);
      setReviewNotes(notesFromDb);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await api.getFinanceDecisionHistory({ period, ...historyFilter });
      setHistoryData(data);
    } catch (err) { console.error(err); }
  };

  const loadExports = async () => {
    try {
      const data = await api.getFinanceExports();
      setExportsData(data);
    } catch (err) { console.error(err); }
  };

  const openDrilldown = async (emp: SelectedEmployee) => {
    setSelectedEmployee(emp);
    setDrilldownQuery('');
    setIsDrilldownLoading(true);
    try {
      const lines = await api.getFinanceReviewLines({ period, user_id: emp.user_id });
      setDrilldownLines(lines);
    } catch (err) {
      console.error(err);
      setDrilldownLines([]);
    } finally {
      setIsDrilldownLoading(false);
    }
  };

  // ── Aggregated review rows (list view) ────────────────────────────────────
  const reviewRows = useMemo(() => {
    const rows = reviewData.rows.map((row: any, index: number) => ({
      ...row,
      rowKey: `${row.timesheet_id}-${row.user_id}-${row.project_id}-${index}`,
      dbKey:  `${row.timesheet_id}-${row.user_id}-${row.project_id}`,
      issues: issueLabel(row),
    }));
    const filtered = rows.filter((row: any) => {
      const haystack = `${row.user_name} ${row.project_name} ${row.department_name || ''}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
    if (mode === 'employee') return filtered.sort((a: any, b: any) => a.user_name.localeCompare(b.user_name));
    return filtered.sort((a: any, b: any) => a.project_name.localeCompare(b.project_name));
  }, [reviewData.rows, mode, query]);

  // Group by employee for the employee-list view
  const employeeGroups = useMemo(() => {
    const map: Record<string, { user_id: string; user_name: string; lines: any[]; total_hours: number; ok: number; flagged: number }> = {};
    reviewRows.forEach((row: any) => {
      if (!map[row.user_id]) {
        map[row.user_id] = { user_id: row.user_id, user_name: row.user_name, lines: [], total_hours: 0, ok: 0, flagged: 0 };
      }
      map[row.user_id].lines.push(row);
      map[row.user_id].total_hours += parseFloat(row.total_hours || 0);
      const dec = reviewState[row.dbKey];
      if (dec === 'ok_for_export' || dec === 'exported') map[row.user_id].ok++;
      if (dec === 'queried' || dec === 'rejected')        map[row.user_id].flagged++;
    });
    return Object.values(map).sort((a, b) => a.user_name.localeCompare(b.user_name));
  }, [reviewRows, reviewState]);

  // Filtered drill-down lines
  const filteredDrilldownLines = useMemo(() => {
    if (!drilldownQuery) return drilldownLines;
    const q = drilldownQuery.toLowerCase();
    return drilldownLines.filter((l: any) =>
      `${l.project_name} ${l.project_code} ${l.activity_name} ${l.asset_name || ''} ${l.afe_code || ''}`.toLowerCase().includes(q)
    );
  }, [drilldownLines, drilldownQuery]);

  // ── Decision helpers ───────────────────────────────────────────────────────
  const setDecision = (dbKey: string, decision: ReviewDecision) => {
    setReviewState(prev => ({ ...prev, [dbKey]: decision }));
    if (decision !== 'queried' && decision !== 'rejected') {
      setExpandedNotes(prev => { const n = new Set(prev); n.delete(dbKey); return n; });
    } else {
      setExpandedNotes(prev => new Set([...prev, dbKey]));
    }
  };

  const toggleNotes = (dbKey: string) => {
    setExpandedNotes(prev => {
      const n = new Set(prev);
      if (n.has(dbKey)) n.delete(dbKey); else n.add(dbKey);
      return n;
    });
  };

  // Apply decision to all rows in the current context (list or drill-down)
  const applyToAll = (decision: ReviewDecision) => {
    const next: Record<string, ReviewDecision> = { ...reviewState };
    const target = selectedEmployee
      ? filteredDrilldownLines.map((l: any) => `${l.timesheet_id}-${l.user_id}-${l.project_id}`)
      : reviewRows.map((r: any) => r.dbKey);
    target.forEach((key: string) => { next[key] = decision; });
    setReviewState(next);
  };

  const cancelApprovals = () => {
    const next: Record<string, ReviewDecision> = { ...reviewState };
    const target = selectedEmployee
      ? filteredDrilldownLines.map((l: any) => `${l.timesheet_id}-${l.user_id}-${l.project_id}`)
      : reviewRows.map((r: any) => r.dbKey);
    target.forEach((key: string) => { next[key] = 'pending_review'; });
    setReviewState(next);
  };

  const clearAll = () => { setReviewState({}); setReviewNotes({}); setSaveMessage(null); };

  const commitApprovals = async () => {
    const allRows = reviewData.rows.map((row: any) => ({
      ...row,
      dbKey: `${row.timesheet_id}-${row.user_id}-${row.project_id}`,
    }));
    const decisions = allRows
      .filter((row: any) => reviewState[row.dbKey] && reviewState[row.dbKey] !== 'pending_review')
      .map((row: any) => ({
        timesheet_id: row.timesheet_id,
        user_id:      row.user_id,
        project_id:   row.project_id,
        decision:     reviewState[row.dbKey],
        review_notes: reviewNotes[row.dbKey] || null,
      }));
    if (decisions.length === 0) {
      setSaveMessage({ type: 'error', text: 'No decisions to commit. Mark at least one row before committing.' });
      return;
    }
    const missingNotes = decisions.filter(
      (d: any) => (d.decision === 'queried' || d.decision === 'rejected') && !d.review_notes?.trim()
    );
    if (missingNotes.length > 0) {
      setSaveMessage({ type: 'error', text: `${missingNotes.length} queried/rejected row(s) require review notes before committing.` });
      return;
    }
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const result = await api.saveFinanceDecisions({ decisions, period });
      setSaveMessage({ type: 'success', text: `${result.saved} decisions saved successfully.` });
      await loadData();
      if (selectedEmployee) await openDrilldown(selectedEmployee);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save decisions.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportFinanceReviewQueue(period);
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = `approved-time-${period}.csv`; a.click();
      URL.revokeObjectURL(url);
      await loadExports();
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Export failed.' });
    }
  };

  const handleRerun = async (sequenceNumber: string) => {
    setIsRerunning(sequenceNumber);
    try {
      const blob = await api.rerunFinanceExport(sequenceNumber);
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = `rerun-${sequenceNumber}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Re-run failed.' });
    } finally {
      setIsRerunning(null);
    }
  };

  const okCount      = Object.values(reviewState).filter(d => d === 'ok_for_export').length;
  const queriedCount = Object.values(reviewState).filter(d => d === 'queried' || d === 'rejected').length;
  const issueCount   = reviewRows.reduce((sum: number, row: any) => sum + row.issues.length, 0);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { key: 'review'  as ActiveTab, label: 'Review Queue',    icon: FileCheck2 },
    { key: 'history' as ActiveTab, label: 'Decision History', icon: History },
    { key: 'exports' as ActiveTab, label: 'Export History',   icon: Download },
  ];

  // ── Shared bulk-action bar ─────────────────────────────────────────────────
  const BulkActions = () => (
    <div className="p-4 border-b border-border bg-background/50 flex flex-wrap gap-2 items-center">
      <button onClick={() => applyToAll('ok_for_export')} className="btn-outline text-xs py-1.5 flex items-center gap-1.5">
        <Check className="h-3.5 w-3.5 text-success" /> Apply OK to All
      </button>
      <button onClick={cancelApprovals} className="btn-outline text-xs py-1.5 flex items-center gap-1.5">
        <X className="h-3.5 w-3.5 text-danger" /> Cancel Approvals
      </button>
      <button onClick={() => applyToAll('queried')} className="btn-outline text-xs py-1.5">Query All</button>
      <button onClick={clearAll} className="btn-outline text-xs py-1.5">Clear All</button>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-text_secondary">{okCount} staged for export</span>
        <button onClick={commitApprovals} disabled={isSaving} className="btn-solid text-xs py-2 flex items-center gap-2">
          {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FileCheck2 className="h-3.5 w-3.5" />}
          {isSaving ? 'Saving…' : 'Commit Approvals'}
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-6 pb-12">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gold-600 mb-1.5">Finance Review</p>
            <h1 className="page-header-title">Approved time review &amp; export</h1>
            <p className="page-header-sub">Review approved timesheets, flag issues, and export to SUN.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input type="month" value={period}
              onChange={e => { setPeriod(e.target.value); setReviewState({}); setSelectedEmployee(null); }}
              className="input-base w-auto" />
            <button onClick={handleExport} className="btn-solid">
              <Download className="h-4 w-4" /> Export OK Rows
            </button>
          </div>
        </div>

        {/* ── KPI row ─────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Approved hours', value: reviewData.summary.total_hours.toFixed(1), icon: BarChart3 },
            { label: 'Review rows',    value: reviewRows.length,                          icon: FileText },
            { label: 'Issue flags',    value: issueCount,                                 icon: AlertTriangle },
            { label: 'OK for export',  value: okCount,                                    icon: CheckCircle },
          ].map(stat => (
            <div key={stat.label} className="kpi-card">
              <stat.icon className="h-5 w-5 text-navy-700 mb-5" />
              <p className="kpi-label">{stat.label}</p>
              <p className="kpi-value font-mono mt-1">{stat.value}</p>
            </div>
          ))}
        </section>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-background/50 p-1 rounded-2xl border border-border w-fit overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setSelectedEmployee(null); }}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap
                ${activeTab === t.key ? 'bg-surface text-navy-800 shadow-sm' : 'text-text_secondary hover:text-text_primary'}`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Save message ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {saveMessage && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold
                ${saveMessage.type === 'success'
                  ? 'bg-success-bg border-success/20 text-success'
                  : 'bg-danger-bg border-danger/20 text-danger'}`}>
              {saveMessage.type === 'success'
                ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
                : <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
              {saveMessage.text}
              <button onClick={() => setSaveMessage(null)} className="ml-auto"><X className="h-4 w-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* REVIEW QUEUE TAB                                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'review' && (
          <section className="section-card">

            {/* ── Drill-down view (employee detail lines) ─────────────────── */}
            {selectedEmployee ? (
              <>
                {/* Drill-down header */}
                <div className="p-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setSelectedEmployee(null); setDrilldownLines([]); }}
                      className="p-2 rounded-lg border border-border hover:bg-border_light transition-colors">
                      <ArrowLeft className="h-4 w-4 text-text_secondary" />
                    </button>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">Time Review — Line Detail</p>
                      <h2 className="text-base font-display font-bold text-text_primary">{selectedEmployee.user_name}</h2>
                      <p className="text-xs text-text_secondary mt-0.5">{filteredDrilldownLines.length} lines · {period}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text_secondary" />
                    <input value={drilldownQuery} onChange={e => setDrilldownQuery(e.target.value)}
                      placeholder="Search project, activity…" className="input-base pl-9 w-56" />
                  </div>
                </div>

                <BulkActions />

                {/* Drill-down detail table */}
                {isDrilldownLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1100px]">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-text_secondary border-b border-border bg-background/40">
                          <th className="px-4 py-3">Review</th>
                          <th className="px-4 py-3">AFE Code</th>
                          <th className="px-4 py-3">Month</th>
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Asset (ID)</th>
                          <th className="px-4 py-3">Project (ID)</th>
                          <th className="px-4 py-3">Project Name</th>
                          <th className="px-4 py-3">Activity</th>
                          <th className="px-4 py-3 text-right">Hours</th>
                          <th className="px-4 py-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredDrilldownLines.map((line: any, idx: number) => {
                          const dbKey    = `${line.timesheet_id}-${line.user_id}-${line.project_id}`;
                          const decision = reviewState[dbKey] || (line.decision as ReviewDecision) || 'pending_review';
                          const noteRequired = (decision === 'queried' || decision === 'rejected') && !reviewNotes[dbKey]?.trim();
                          const notesOpen    = expandedNotes.has(dbKey);
                          const dateObj      = new Date(line.date);
                          const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                          return (
                            <motion.tr key={`${line.log_id}-${idx}`}
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className={`hover:bg-gray-50/70 transition-colors ${noteRequired ? 'bg-warning-bg/60' : ''}`}>

                              {/* Review decision */}
                              <td className="px-4 py-3">
                                <div>
                                  <span className={`status-pill text-[9px] ${decisionStyles[decision]}`}>
                                    {decisionLabel[decision]}
                                  </span>
                                  {noteRequired && <p className="text-[10px] text-warning mt-1 font-semibold">Notes required ↓</p>}
                                </div>
                                <div className="flex items-center gap-1 mt-1.5">
                                  <button onClick={() => setDecision(dbKey, 'ok_for_export')}
                                    title="OK for Export"
                                    className={`p-1 rounded transition-colors ${decision === 'ok_for_export' ? 'bg-success text-white' : 'text-text_secondary hover:bg-success-bg hover:text-success'}`}>
                                    <Check className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => setDecision(dbKey, 'queried')}
                                    title="Query"
                                    className={`p-1 rounded transition-colors ${decision === 'queried' ? 'bg-warning text-white' : 'text-text_secondary hover:bg-warning-bg hover:text-warning'}`}>
                                    <AlertTriangle className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => setDecision(dbKey, 'rejected')}
                                    title="Reject"
                                    className={`p-1 rounded transition-colors ${decision === 'rejected' ? 'bg-danger text-white' : 'text-text_secondary hover:bg-danger-bg hover:text-danger'}`}>
                                    <X className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => toggleNotes(dbKey)}
                                    title="Review notes"
                                    className="p-1 rounded text-text_secondary hover:bg-background transition-colors">
                                    {notesOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </button>
                                </div>
                                <AnimatePresence>
                                  {notesOpen && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                      <textarea
                                        value={reviewNotes[dbKey] || ''}
                                        onChange={e => setReviewNotes(prev => ({ ...prev, [dbKey]: e.target.value }))}
                                        placeholder={`${decision === 'queried' || decision === 'rejected' ? 'Required: ' : ''}Review notes…`}
                                        rows={2}
                                        className={`mt-1.5 w-36 text-xs bg-background border rounded-lg p-1.5 text-text_primary focus:outline-none focus:ring-1 resize-none ${noteRequired ? 'border-warning focus:ring-warning/30' : 'border-border focus:ring-primary/20'}`}
                                      />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </td>

                              {/* AFE Code */}
                              <td className="px-4 py-3">
                                {line.afe_code
                                  ? <span className="text-xs font-bold font-mono text-navy-700">{line.afe_code}</span>
                                  : <span className="text-xs text-text_secondary/50">—</span>}
                              </td>

                              {/* Month */}
                              <td className="px-4 py-3 text-xs text-text_secondary whitespace-nowrap">{(line.month || '').trim()}</td>

                              {/* Employee */}
                              <td className="px-4 py-3">
                                <p className="text-xs font-semibold text-text_primary">{line.user_name}</p>
                                <p className="text-[10px] text-text_secondary">{line.user_id}</p>
                              </td>

                              {/* Date */}
                              <td className="px-4 py-3 text-xs font-semibold text-text_primary whitespace-nowrap">{formattedDate}</td>

                              {/* Asset (ID) */}
                              <td className="px-4 py-3">
                                {line.asset_name
                                  ? <>
                                      <p className="text-xs font-semibold text-text_primary">{line.asset_name}</p>
                                      {line.asset_code && <p className="text-[10px] font-mono text-text_secondary">{line.asset_code}</p>}
                                    </>
                                  : <span className="text-xs text-text_secondary/50">—</span>}
                              </td>

                              {/* Project (ID) */}
                              <td className="px-4 py-3">
                                <p className="text-xs font-bold font-mono text-text_primary">{line.project_code}</p>
                                <p className="text-[10px] text-text_secondary">{line.project_id}</p>
                              </td>

                              {/* Project Name */}
                              <td className="px-4 py-3 text-xs font-semibold text-text_primary">{line.project_name}</td>

                              {/* Activity */}
                              <td className="px-4 py-3">
                                <p className="text-xs text-text_primary">{line.activity_name}</p>
                                {line.activity_code && line.activity_code !== '—' &&
                                  <p className="text-[10px] font-mono text-text_secondary">{line.activity_code}</p>}
                              </td>

                              {/* Hours */}
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm font-bold text-text_primary">
                                  {parseFloat(line.hours || 0).toFixed(1)}h
                                </span>
                              </td>

                              {/* Notes (entry notes from daily log) */}
                              <td className="px-4 py-3 text-xs text-text_secondary max-w-[140px]">
                                {line.entry_notes && line.entry_notes !== 'annual_leave' && line.entry_notes !== 'sick_leave'
                                  ? <span className="truncate block" title={line.entry_notes}>{line.entry_notes}</span>
                                  : <span className="text-text_secondary/40">—</span>}
                              </td>
                            </motion.tr>
                          );
                        })}
                        {filteredDrilldownLines.length === 0 && (
                          <tr>
                            <td colSpan={11} className="px-5 py-12 text-center text-text_secondary">
                              No approved time lines for this employee in {period}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* ── Aggregated list view ─────────────────────────────────── */}
                <div className="p-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-display font-bold text-text_primary">
                      Finance review queue — {period}
                    </h2>
                    <p className="text-xs text-text_secondary mt-1">
                      {reviewRows.length} rows · {okCount} OK · {queriedCount} flagged
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Group by toggle */}
                    <div className="flex rounded-lg border border-border bg-background p-1">
                      {(['employee', 'project'] as ReviewMode[]).map(item => (
                        <button key={item} onClick={() => setMode(item)}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-colors
                            ${mode === item ? 'bg-surface text-navy-800 shadow-sm' : 'text-text_secondary hover:text-text_primary'}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text_secondary" />
                      <input value={query} onChange={e => setQuery(e.target.value)}
                        placeholder="Search rows…" className="input-base pl-9 w-52" />
                    </div>
                  </div>
                </div>

                <BulkActions />

                {/* ── Employee mode: grouped clickable list ──────────────── */}
                {mode === 'employee' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-text_secondary border-b border-border bg-background/40">
                          <th className="px-5 py-4">Employee</th>
                          <th className="px-5 py-4 text-right">Lines</th>
                          <th className="px-5 py-4 text-right">Total Hours</th>
                          <th className="px-5 py-4 text-right">OK</th>
                          <th className="px-5 py-4 text-right">Flagged</th>
                          <th className="px-5 py-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {employeeGroups.map(emp => {
                          const allOk      = emp.lines.length > 0 && emp.ok === emp.lines.length;
                          const hasFlags   = emp.flagged > 0;
                          const pending    = emp.lines.length - emp.ok - emp.flagged;

                          return (
                            <tr key={emp.user_id}
                              onClick={() => openDrilldown({ user_id: emp.user_id, user_name: emp.user_name })}
                              className="hover:bg-background/70 transition-colors cursor-pointer group">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-navy-50 flex items-center justify-center flex-shrink-0">
                                    <Users className="h-4 w-4 text-navy-700" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-text_primary group-hover:text-navy-700 transition-colors">
                                      {emp.user_name}
                                    </p>
                                    <p className="text-[10px] text-text_secondary">{emp.user_id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right text-sm font-semibold text-text_primary">{emp.lines.length}</td>
                              <td className="px-5 py-4 text-right text-sm font-bold text-text_primary">{emp.total_hours.toFixed(1)}h</td>
                              <td className="px-5 py-4 text-right">
                                <span className={`text-sm font-bold ${emp.ok > 0 ? 'text-success' : 'text-text_secondary/40'}`}>{emp.ok}</span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span className={`text-sm font-bold ${emp.flagged > 0 ? 'text-warning' : 'text-text_secondary/40'}`}>{emp.flagged}</span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                {allOk
                                  ? <span className="status-pill bg-success-bg text-success text-[9px]">All OK</span>
                                  : hasFlags
                                  ? <span className="status-pill bg-warning-bg text-warning text-[9px]">Flagged</span>
                                  : pending > 0
                                  ? <span className="status-pill bg-gray-100 text-gray-600 text-[9px]">Pending</span>
                                  : null}
                              </td>
                            </tr>
                          );
                        })}
                        {employeeGroups.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-12 text-center text-text_secondary">
                              No approved time rows for this period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* ── Project mode: flat table ──────────────────────────── */
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[900px]">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-text_secondary border-b border-border bg-background/40">
                          <th className="px-5 py-4">Project</th>
                          <th className="px-5 py-4">Employee</th>
                          <th className="px-5 py-4">AFE / Dept</th>
                          <th className="px-5 py-4">Hours</th>
                          <th className="px-5 py-4">Leave / Holiday</th>
                          <th className="px-5 py-4">Issues</th>
                          <th className="px-5 py-4">Decision</th>
                          <th className="px-5 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {reviewRows.map((row: any) => {
                          const decision    = reviewState[row.dbKey] || 'pending_review';
                          const noteRequired = (decision === 'queried' || decision === 'rejected') && !reviewNotes[row.dbKey]?.trim();
                          const notesOpen   = expandedNotes.has(row.dbKey);
                          return (
                            <motion.tr key={row.rowKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className={`hover:bg-gray-50/70 transition-colors ${noteRequired ? 'bg-warning-bg/60' : ''}`}>
                              <td className="px-5 py-3">
                                <p className="text-sm font-bold text-text_primary">{row.project_name}</p>
                                <p className="text-[10px] font-mono text-text_secondary">{row.project_code}</p>
                              </td>
                              <td className="px-5 py-3">
                                <p className="text-sm font-semibold text-text_primary">{row.user_name}</p>
                                <p className="text-[10px] text-text_secondary">{row.user_id}</p>
                              </td>
                              <td className="px-5 py-3">
                                {row.afe_code && <p className="text-xs font-bold text-navy-700 font-mono">{row.afe_code}</p>}
                                <p className="text-xs text-text_secondary">{row.department_name || '—'}</p>
                              </td>
                              <td className="px-5 py-3 text-sm font-bold text-text_primary">{parseFloat(row.total_hours || 0).toFixed(1)}h</td>
                              <td className="px-5 py-3 text-xs text-text_secondary">
                                {Number(row.leave_days || 0)} leave / {Number(row.public_holiday_days || 0)} holiday
                              </td>
                              <td className="px-5 py-3">
                                {row.issues.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {row.issues.map((issue: string) => (
                                      <span key={issue} className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-warning-bg text-warning border border-warning/20">{issue}</span>
                                    ))}
                                  </div>
                                ) : <span className="text-xs text-text_secondary/60">No flags</span>}
                              </td>
                              <td className="px-5 py-3">
                                <span className={`status-pill ${decisionStyles[decision]}`}>{decisionLabel[decision]}</span>
                                {noteRequired && <p className="text-[10px] text-warning mt-1 font-semibold">Notes required ↓</p>}
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => setDecision(row.dbKey, 'ok_for_export')}
                                    className={`p-1.5 rounded-lg transition-colors ${decision === 'ok_for_export' ? 'bg-success text-white' : 'text-text_secondary hover:bg-success-bg hover:text-success'}`}
                                    title="OK for export"><Check className="h-4 w-4" /></button>
                                  <button onClick={() => setDecision(row.dbKey, 'queried')}
                                    className={`p-1.5 rounded-lg transition-colors ${decision === 'queried' ? 'bg-warning text-white' : 'text-text_secondary hover:bg-warning-bg hover:text-warning'}`}
                                    title="Query"><AlertTriangle className="h-4 w-4" /></button>
                                  <button onClick={() => setDecision(row.dbKey, 'rejected')}
                                    className={`p-1.5 rounded-lg transition-colors ${decision === 'rejected' ? 'bg-danger text-white' : 'text-text_secondary hover:bg-danger-bg hover:text-danger'}`}
                                    title="Reject"><X className="h-4 w-4" /></button>
                                  <button onClick={() => toggleNotes(row.dbKey)}
                                    className="p-1.5 rounded-lg text-text_secondary hover:bg-background transition-colors" title="Notes">
                                    {notesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </button>
                                </div>
                                <AnimatePresence>
                                  {notesOpen && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                      <textarea
                                        value={reviewNotes[row.dbKey] || ''}
                                        onChange={e => setReviewNotes(prev => ({ ...prev, [row.dbKey]: e.target.value }))}
                                        placeholder={`${decision === 'queried' || decision === 'rejected' ? 'Required: ' : ''}Add review notes…`}
                                        rows={2}
                                        className={`mt-2 w-full text-xs bg-background border rounded-lg p-2 text-text_primary focus:outline-none focus:ring-1 resize-none ${noteRequired ? 'border-warning focus:ring-warning/30' : 'border-border focus:ring-primary/20'}`}
                                      />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </td>
                            </motion.tr>
                          );
                        })}
                        {reviewRows.length === 0 && (
                          <tr><td colSpan={8} className="px-5 py-12 text-center text-text_secondary">No approved time rows for this period.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* DECISION HISTORY TAB                                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <section className="section-card">
            <div className="p-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <h2 className="text-base font-display font-bold text-text_primary">Finance decision history</h2>
              <div className="flex flex-wrap gap-3">
                <select value={historyFilter.decision}
                  onChange={e => setHistoryFilter(p => ({ ...p, decision: e.target.value }))}
                  className="input-base w-auto text-sm">
                  <option value="">All decisions</option>
                  {(['ok_for_export','queried','rejected','exported'] as ReviewDecision[]).map(d => (
                    <option key={d} value={d}>{decisionLabel[d]}</option>
                  ))}
                </select>
                <button onClick={loadHistory} className="btn-outline text-sm py-2 flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-text_secondary border-b border-border bg-background/40">
                    <th className="px-5 py-4">Period</th>
                    <th className="px-5 py-4">Employee</th>
                    <th className="px-5 py-4">Project</th>
                    <th className="px-5 py-4">Decision</th>
                    <th className="px-5 py-4">Review Notes</th>
                    <th className="px-5 py-4">Reviewed By</th>
                    <th className="px-5 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyData.map((d: any) => (
                    <tr key={d.id} className="hover:bg-background/50">
                      <td className="px-5 py-3 text-xs font-semibold text-text_primary">{d.period}</td>
                      <td className="px-5 py-3 text-sm text-text_primary">{d.employee_name}</td>
                      <td className="px-5 py-3 text-sm text-text_secondary">{d.project_name}</td>
                      <td className="px-5 py-3">
                        <span className={`status-pill text-[10px] ${decisionStyles[d.decision as ReviewDecision] || ''}`}>
                          {decisionLabel[d.decision as ReviewDecision] || d.decision}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-text_secondary max-w-[200px] truncate">{d.review_notes || '—'}</td>
                      <td className="px-5 py-3 text-xs text-text_secondary">{d.reviewer_name || '—'}</td>
                      <td className="px-5 py-3 text-xs text-text_secondary">
                        {d.reviewed_at ? new Date(d.reviewed_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                    </tr>
                  ))}
                  {historyData.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-text_secondary">No decision history for this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* EXPORT HISTORY TAB                                                */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'exports' && (
          <section className="section-card">
            <div className="p-5 border-b border-border">
              <h2 className="text-base font-display font-bold text-text_primary">Export history</h2>
              <p className="text-xs text-text_secondary mt-1">All export runs with sequence numbers. Re-run any export.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[650px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-text_secondary border-b border-border bg-background/40">
                    <th className="px-5 py-4">Sequence</th>
                    <th className="px-5 py-4">Period</th>
                    <th className="px-5 py-4">Rows</th>
                    <th className="px-5 py-4">Exported By</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Re-run</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {exportsData.map((run: any) => (
                    <tr key={run.id} className="hover:bg-background/50">
                      <td className="px-5 py-3 text-xs font-mono text-text_primary">{run.sequence_number}</td>
                      <td className="px-5 py-3 text-sm text-text_primary">{run.period}</td>
                      <td className="px-5 py-3 text-sm font-bold text-text_primary">{run.record_count}</td>
                      <td className="px-5 py-3 text-xs text-text_secondary">{run.exported_by_name}</td>
                      <td className="px-5 py-3 text-xs text-text_secondary">
                        {new Date(run.exported_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`status-pill text-[10px] ${run.status === 'completed' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => handleRerun(run.sequence_number)}
                          disabled={isRerunning === run.sequence_number}
                          className="btn-outline text-xs py-1.5 flex items-center gap-1.5 ml-auto">
                          {isRerunning === run.sequence_number
                            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            : <Download className="h-3.5 w-3.5" />}
                          Re-run
                        </button>
                      </td>
                    </tr>
                  ))}
                  {exportsData.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-text_secondary">No exports yet for this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
