import { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import {
  CheckCircle, XCircle, Clock, ArrowRight, MessageSquare, X,
  LayoutList, Calendar, Send, Loader2, ChevronDown, ChevronUp, Users
} from 'lucide-react';
import { useLocation } from 'wouter';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

type ViewMode = 'weekly' | 'monthly';

interface MonthlyGroup {
  user_id: string;
  user_name: string;
  department_name: string;
  period_code: string;
  weeks: any[];
  total_hours: number;
  pending_count: number;
}

export default function Approvals() {
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [approvals, setApprovals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Return Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnId, setReturnId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Month approve confirmation
  const [monthApproveModal, setMonthApproveModal] = useState<{ userId: string; userName: string; periodCode: string; count: number } | null>(null);

  useEffect(() => { loadApprovals(); }, []);

  const loadApprovals = async () => {
    try {
      const data = await api.getPendingApprovals();
      setApprovals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Group approvals by employee + period for monthly view
  const monthlyGroups: MonthlyGroup[] = (() => {
    const map = new Map<string, MonthlyGroup>();
    for (const ts of approvals) {
      const key = `${ts.user_id}::${ts.accounting_period || 'unknown'}`;
      if (!map.has(key)) {
        map.set(key, {
          user_id: ts.user_id,
          user_name: ts.user_name,
          department_name: ts.department_name,
          period_code: ts.accounting_period || 'unknown',
          weeks: [],
          total_hours: 0,
          pending_count: 0,
        });
      }
      const group = map.get(key)!;
      group.weeks.push(ts);
      group.pending_count++;
    }
    return Array.from(map.values()).sort((a, b) => a.user_name.localeCompare(b.user_name));
  })();

  const toggleSelect = (id: string) => {
    const s = new Set(selectedIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelectedIds(s);
  };

  const handleApprove = async (id: string) => {
    setIsProcessing(true);
    try { await api.approveTimesheet(id); loadApprovals(); }
    catch { alert('Failed to approve.'); }
    finally { setIsProcessing(false); }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try { await api.bulkApprove(Array.from(selectedIds)); setSelectedIds(new Set()); loadApprovals(); }
    catch { alert('Failed to bulk approve.'); }
    finally { setIsProcessing(false); }
  };

  const handleApproveMonth = async () => {
    if (!monthApproveModal) return;
    setIsProcessing(true);
    try {
      await api.approveMonth(monthApproveModal.userId, monthApproveModal.periodCode);
      setMonthApproveModal(null);
      loadApprovals();
    } catch (err: any) { alert(err.message || 'Failed to approve month.'); }
    finally { setIsProcessing(false); }
  };

  const openReturnModal = (id: string) => { setReturnId(id); setReturnReason(''); setReturnModalOpen(true); };

  const handleReturn = async () => {
    if (!returnId || !returnReason.trim()) return;
    setIsProcessing(true);
    try { await api.rejectTimesheet(returnId, returnReason); setReturnModalOpen(false); loadApprovals(); }
    catch { alert('Failed to return.'); }
    finally { setIsProcessing(false); }
  };

  const statusColor = (s: string) => s === 'submitted'
    ? 'bg-blue-500/10 text-blue-500'
    : 'bg-amber-500/10 text-amber-500';

  const toggleGroup = (key: string) => {
    const s = new Set(expandedGroups);
    if (s.has(key)) s.delete(key); else s.add(key);
    setExpandedGroups(s);
  };

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-12 relative">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text_primary">Pending Approvals</h1>
            <p className="text-sm text-text_secondary mt-1">Review and approve team timesheets. {approvals.length} pending.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* View toggle */}
            <div className="flex rounded-lg border border-border bg-background p-1">
              <button onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${viewMode === 'weekly' ? 'bg-surface text-primary shadow-sm' : 'text-text_secondary hover:text-text_primary'}`}>
                <LayoutList className="h-3.5 w-3.5" /> Weekly
              </button>
              <button onClick={() => setViewMode('monthly')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${viewMode === 'monthly' ? 'bg-surface text-primary shadow-sm' : 'text-text_secondary hover:text-text_primary'}`}>
                <Calendar className="h-3.5 w-3.5" /> Monthly
              </button>
            </div>
            {selectedIds.size > 0 && viewMode === 'weekly' && (
              <button onClick={handleBulkApprove} disabled={isProcessing}
                className="bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50 text-sm">
                <CheckCircle className="h-4 w-4" /> Approve Selected ({selectedIds.size})
              </button>
            )}
          </div>
        </div>

        {/* ── WEEKLY VIEW ── */}
        {viewMode === 'weekly' && (
          <div className="section-card">
            <div className="p-5 border-b border-border bg-background/30 flex items-center justify-between">
              <h2 className="text-base font-bold text-text_primary">Requires Action</h2>
              <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">{approvals.length} Pending</span>
            </div>
            {approvals.length === 0 ? (
              <div className="p-16 text-center text-text_secondary">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500 opacity-50" />
                <p className="font-bold text-lg text-text_primary mb-1">All caught up!</p>
                <p className="text-sm">No pending approvals at the moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-background/20 text-[10px] uppercase tracking-widest text-text_secondary font-bold border-b border-border">
                      <th className="px-5 py-4 w-12 text-center">
                        <input type="checkbox"
                          onChange={e => { if (e.target.checked) setSelectedIds(new Set(approvals.map(a => a.id))); else setSelectedIds(new Set()); }}
                          checked={selectedIds.size === approvals.length && approvals.length > 0}
                          className="accent-primary" />
                      </th>
                      <th className="px-5 py-4">Employee</th>
                      <th className="px-5 py-4">Week / Period</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {approvals.map((ts, i) => (
                      <motion.tr key={ts.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="hover:bg-background/30 transition-colors">
                        <td className="px-5 py-4 text-center">
                          <input type="checkbox" checked={selectedIds.has(ts.id)} onChange={() => toggleSelect(ts.id)} className="accent-primary" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">{ts.user_name?.charAt(0)}</div>
                            <div>
                              <p className="text-sm font-bold text-text_primary cursor-pointer hover:text-primary" onClick={() => setLocation(`/team/${ts.user_id}`)}>{ts.user_name}</p>
                              <p className="text-[10px] text-text_secondary">{ts.department_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 cursor-pointer" onClick={() => setLocation(`/timesheets/${ts.id}`)}>
                          <p className="text-sm font-semibold text-text_primary">
                            {new Date(ts.week_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(ts.week_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-[10px] text-text_secondary flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" /> Submitted {new Date(ts.submitted_at).toLocaleDateString('en-GB')}
                            {ts.accounting_period && <span className="ml-1">· Period {ts.accounting_period}</span>}
                          </p>
                          {ts.has_shortfall_flag && (
                            <p className="text-[10px] text-amber-500 font-semibold mt-0.5">⚠ Shortfall explained</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border border-transparent ${statusColor(ts.status)}`}>
                            {ts.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openReturnModal(ts.id)} disabled={isProcessing}
                              className="p-2 text-text_secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Return">
                              <XCircle className="h-5 w-5" />
                            </button>
                            <button onClick={() => handleApprove(ts.id)} disabled={isProcessing}
                              className="p-2 text-text_secondary hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Approve">
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button onClick={() => setLocation(`/timesheets/${ts.id}`)}
                              className="p-2 text-text_secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View">
                              <ArrowRight className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── MONTHLY VIEW ── */}
        {viewMode === 'monthly' && (
          <div className="space-y-4">
            {monthlyGroups.length === 0 ? (
              <div className="section-card p-16 text-center text-text_secondary">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500 opacity-50" />
                <p className="font-bold text-lg text-text_primary mb-1">All caught up!</p>
                <p className="text-sm">No pending approvals in monthly view.</p>
              </div>
            ) : monthlyGroups.map((group, i) => {
              const groupKey = `${group.user_id}::${group.period_code}`;
              const isExpanded = expandedGroups.has(groupKey);
              return (
                <motion.div key={groupKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="section-card overflow-hidden">
                  <div className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                        {group.user_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text_primary cursor-pointer hover:text-primary truncate" onClick={() => setLocation(`/team/${group.user_id}`)}>
                          {group.user_name}
                        </p>
                        <p className="text-xs text-text_secondary mt-0.5">{group.department_name} · Period {group.period_code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-text_primary">{group.pending_count} week{group.pending_count > 1 ? 's' : ''}</p>
                        <p className="text-xs text-text_secondary">pending approval</p>
                      </div>
                      <button
                        onClick={() => setMonthApproveModal({ userId: group.user_id, userName: group.user_name, periodCode: group.period_code, count: group.pending_count })}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 transition-colors">
                        <CheckCircle className="h-3.5 w-3.5" /> Approve All Weeks
                      </button>
                      <button onClick={() => toggleGroup(groupKey)} className="p-2 text-text_secondary hover:text-text_primary hover:bg-background rounded-lg transition-colors">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border">
                        <table className="w-full text-left">
                          <thead><tr className="text-[10px] uppercase tracking-widest text-text_secondary bg-background/40 border-b border-border">
                            <th className="px-5 py-3">Week</th>
                            <th className="px-5 py-3">Submitted</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr></thead>
                          <tbody className="divide-y divide-border/30">
                            {group.weeks.map((ts: any) => (
                              <tr key={ts.id} className="hover:bg-background/30">
                                <td className="px-5 py-3 text-sm font-semibold text-text_primary">
                                  {new Date(ts.week_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(ts.week_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  {ts.has_shortfall_flag && <span className="ml-2 text-[10px] text-amber-500 font-semibold">⚠ Flagged</span>}
                                </td>
                                <td className="px-5 py-3 text-xs text-text_secondary">{new Date(ts.submitted_at).toLocaleDateString('en-GB')}</td>
                                <td className="px-5 py-3">
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${statusColor(ts.status)}`}>{ts.status.replace('_',' ')}</span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button onClick={() => openReturnModal(ts.id)} className="p-1.5 text-text_secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><XCircle className="h-4 w-4" /></button>
                                    <button onClick={() => handleApprove(ts.id)} className="p-1.5 text-text_secondary hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"><CheckCircle className="h-4 w-4" /></button>
                                    <button onClick={() => setLocation(`/timesheets/${ts.id}`)} className="p-1.5 text-text_secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><ArrowRight className="h-4 w-4" /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Month Approve Confirmation Modal */}
        <AnimatePresence>
          {monthApproveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text_primary">Approve All Weeks</h3>
                    <p className="text-xs text-text_secondary">Full month approval for {monthApproveModal.userName}</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border mb-5">
                  <p className="text-sm text-text_secondary">This will approve <span className="font-bold text-text_primary">{monthApproveModal.count} pending timesheet{monthApproveModal.count > 1 ? 's' : ''}</span> for <span className="font-bold text-text_primary">{monthApproveModal.userName}</span> in period <span className="font-bold text-text_primary">{monthApproveModal.periodCode}</span>.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setMonthApproveModal(null)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-text_secondary hover:bg-background">Cancel</button>
                  <button onClick={handleApproveMonth} disabled={isProcessing}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/20">
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {isProcessing ? 'Approving…' : `Approve ${monthApproveModal.count} Week${monthApproveModal.count > 1 ? 's' : ''}`}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Return Modal */}
        <AnimatePresence>
          {returnModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-text_primary flex items-center gap-2"><MessageSquare className="h-5 w-5 text-amber-500" /> Return Timesheet</h3>
                  <button onClick={() => setReturnModalOpen(false)} className="text-text_secondary hover:text-text_primary"><X className="h-5 w-5" /></button>
                </div>
                <p className="text-sm text-text_secondary mb-4">Provide a reason for returning this timesheet. The employee will be notified.</p>
                <textarea
                  value={returnReason} onChange={e => setReturnReason(e.target.value)}
                  placeholder="e.g. Please check hours on Tuesday — Rig Maintenance project."
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm text-text_primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[100px] resize-none mb-6"
                />
                <div className="flex gap-3">
                  <button onClick={() => setReturnModalOpen(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-text_secondary">Cancel</button>
                  <button onClick={handleReturn} disabled={!returnReason.trim() || isProcessing}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isProcessing ? 'Returning…' : 'Return Timesheet'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
