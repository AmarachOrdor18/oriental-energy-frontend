import { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { Users, Eye, Send, Check, Clock, History, Trash2, CalendarClock, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TimesheetDetailPanel from '../components/Approvals/TimesheetDetailPanel';
import { useLocation } from 'wouter';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const DEFAULT_BROADCAST = 'Please remember to submit your timesheet for this week by end of day.';
const PAGE_SIZE = 10;

export default function Team() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [broadcastMsg, setBroadcastMsg] = useState(DEFAULT_BROADCAST);
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'defaulters'>('all');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [page, setPage] = useState(1);
  // Slide-over detail (same panel the Review Queue uses)
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Return-with-reason modal (same flow the Review Queue uses)
  const [returnId, setReturnId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');

  useEffect(() => { loadTeam(); }, []);

  const loadTeam = async () => {
    try {
      if (user?.id) {
        // One scoped endpoint, same rule as the Review Queue: direct reports for
        // line managers, whole department for HODs — so the two pages agree.
        const overview = await api.getTeamOverview();
        setTeamMembers(overview);
      }
    } catch (err) {
      console.error('Load team error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBroadcast = async () => {
    setIsBroadcasting(true);
    try {
      await api.createBroadcast(broadcastMsg, broadcastTarget === 'defaulters', scheduleAt || undefined);
      setBroadcastSuccess(true);
      setScheduleAt('');
      loadBroadcasts();
      setTimeout(() => { setShowBroadcast(false); setBroadcastSuccess(false); setBroadcastMsg(DEFAULT_BROADCAST); setBroadcastTarget('all'); }, 2000);
    } catch (err: any) {
      alert(err?.message || 'Failed to send broadcast');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const loadBroadcasts = async () => {
    try { setBroadcasts(await api.getBroadcasts()); } catch { /* non-fatal */ }
  };

  const statusColor = (status: string) => {
    const c: Record<string, string> = {
      approved: 'text-success bg-success-bg',
      submitted: 'bg-navy-100 text-navy-700',
      under_review: 'text-warning bg-warning-bg',
      draft: 'text-gray-500 bg-gray-100',
      rejected: 'text-danger bg-danger-bg',
      overdue: 'text-danger bg-danger-bg',
    };
    return c[status] || c.draft;
  };

  const totalPages = Math.ceil(teamMembers.length / PAGE_SIZE);
  const pagedMembers = teamMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <DashboardLayout><div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"/></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="page-header-title">Team Management</h1>
            <p className="page-header-sub">Overview of your direct reports and their timesheet status.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadBroadcasts(); }} className="btn-outline">
              <History className="h-4 w-4" /> Past Broadcasts
            </button>
            <button onClick={() => setShowBroadcast(!showBroadcast)} className="btn-solid">
              <Send className="h-4 w-4" /> Broadcast Reminder
            </button>
          </div>
        </div>

        {/* Broadcast Panel */}
        {showBroadcast && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-8 bg-surface border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-navy-900 mb-2">Send Broadcast Reminder</h2>
            <p className="text-xs text-text_secondary mb-4">This will send an in-app notification to your direct reports.</p>
            {broadcastSuccess ? (
              <div className="p-4 bg-success-bg border border-success/20 rounded-lg flex items-center gap-2 text-success text-sm font-semibold">
                <Check className="h-5 w-5" /> Reminder sent successfully!
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <p className="text-xs font-semibold text-text_secondary">Send to:</p>
                  {(['all', 'defaulters'] as const).map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="broadcastTarget" value={t} checked={broadcastTarget === t} onChange={() => setBroadcastTarget(t)} className="accent-primary" />
                      <span className="text-sm font-semibold text-text_primary capitalize">
                        {t === 'all' ? 'All team members' : `Defaulters only (${teamMembers.filter(m => !m.recentTs || m.recentTs.status === 'draft' || m.recentTs.status === 'overdue').length})`}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <textarea
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                        rows={2}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                      <p className="text-[10px] text-text_secondary mt-1">Default message pre-filled. Edit as needed.</p>
                    </div>
                    <button onClick={handleBroadcast} disabled={isBroadcasting || !broadcastMsg.trim()} className="btn-solid !px-6">
                      {isBroadcasting ? 'Working…' : scheduleAt ? 'Schedule' : 'Send'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-text_secondary" />
                    <label className="text-xs font-semibold text-text_secondary">Schedule for later (optional):</label>
                    <input
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className="input-base w-auto text-sm"
                    />
                    {scheduleAt && (
                      <button onClick={() => setScheduleAt('')} className="text-xs font-semibold text-danger hover:underline">Clear</button>
                    )}
                  </div>
                  {scheduleAt && (
                    <p className="text-[11px] text-text_secondary">
                      This reminder will be delivered automatically at the chosen time. Recipients are worked out at delivery, so late defaulters are still caught.
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Broadcast History */}
        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-8 bg-surface border border-border rounded-xl p-6 shadow-sm overflow-hidden">
              <h2 className="text-sm font-bold text-navy-900 mb-4 flex items-center gap-2">
                <History className="h-4 w-4" /> Broadcast History
              </h2>
              {broadcasts.length === 0 ? (
                <p className="text-xs text-text_secondary py-4 text-center">No broadcasts yet.</p>
              ) : (
                <div className="space-y-2">
                  {broadcasts.map((b: any) => (
                    <div key={b.id} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text_primary truncate">{b.message}</p>
                        <p className="text-[11px] text-text_secondary mt-0.5 flex items-center gap-2 flex-wrap">
                          {b.status === 'sent' ? (
                            <>
                              <Check className="h-3 w-3 text-success" />
                              <span className="text-success font-bold">Sent</span>
                              {b.sent_at && <span>{new Date(b.sent_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                              {b.recipient_count != null && <span>to {b.recipient_count} recipient{b.recipient_count === 1 ? '' : 's'}</span>}
                            </>
                          ) : b.status === 'scheduled' ? (
                            <>
                              <Clock className="h-3 w-3 text-warning" />
                              <span className="text-warning font-bold">Scheduled</span>
                              {b.scheduled_for && <span>for {new Date(b.scheduled_for).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                            </>
                          ) : (
                            <><span className="text-text_secondary font-bold">Cancelled</span></>
                          )}
                          {b.defaulters_only && <span className="px-1.5 py-0.5 rounded bg-warning-bg text-warning text-[10px] font-bold">Defaulters only</span>}
                        </p>
                      </div>
                      {b.status === 'scheduled' && (
                        <button
                          onClick={async () => { try { await api.cancelBroadcast(b.id); loadBroadcasts(); } catch { alert('Failed to cancel.'); } }}
                          title="Cancel this scheduled broadcast"
                          className="p-2 rounded-lg text-text_secondary hover:text-danger hover:bg-danger-bg transition-colors flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Team Table */}
        <div className="table-datagrid-container">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider">Team Members</h2>
            <span className="text-xs text-gray-400 font-medium">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</span>
          </div>
          {teamMembers.length === 0 ? (
            <div className="p-12 text-center text-text_secondary">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">You have no direct reports.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table-datagrid min-w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Recent Timesheet</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {pagedMembers.map((member, i) => (
                      <motion.tr key={member.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="hover:bg-background/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-navy-50 flex items-center justify-center font-bold text-navy-700 text-sm flex-shrink-0">
                              {member.name.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-text_primary">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-semibold text-text_secondary capitalize">{member.role?.replace('_', ' ')}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-text_secondary">{member.email}</span>
                        </td>
                        <td className="px-5 py-4">
                          {member.recentTs ? (
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${statusColor(member.recentTs.status)}`}>
                              {member.recentTs.status.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="text-xs text-text_secondary italic">No submissions</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => setDetailId(member.recentTs?.id || null)}
                              disabled={!member.recentTs}
                              title={member.recentTs ? 'View latest timesheet' : 'No timesheet yet'}
                              className="p-2 rounded-lg text-text_secondary hover:text-navy-700 hover:bg-navy-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button onClick={() => setLocation(`/team/${member.id}`)}
                              title="Full history and drilldown"
                              className="p-2 rounded-lg text-text_secondary hover:text-navy-700 hover:bg-navy-50 transition-colors">
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-background/30">
                  <p className="text-xs text-text_secondary">Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, teamMembers.length)} of {teamMembers.length}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs font-semibold border border-border rounded-lg disabled:opacity-40 hover:bg-background transition-colors">Prev</button>
                    <span className="text-xs text-text_secondary">{page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs font-semibold border border-border rounded-lg disabled:opacity-40 hover:bg-background transition-colors">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Slide-over timesheet detail — the exact panel the Review Queue uses,
            with a read-only approve/return for draft/submitted sheets. */}
        <TimesheetDetailPanel
          timesheetId={detailId}
          onClose={() => setDetailId(null)}
          onApprove={async (id) => {
            setIsProcessing(true);
            try { await api.approveTimesheet(id); setDetailId(null); } finally { setIsProcessing(false); }
          }}
          onReturn={(id) => { setReturnId(id); }}
          isProcessing={isProcessing}
        />

        {/* Return-with-reason modal (mirrors the Review Queue flow) */}
        <AnimatePresence>
          {returnId && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-text_primary">Return timesheet</h3>
                    <p className="text-xs text-text_secondary mt-0.5">It goes back to the person as a draft with your reason attached.</p>
                  </div>
                  <button onClick={() => setReturnId(null)} className="p-2 rounded-lg hover:bg-background text-text_secondary">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={3}
                  placeholder="Why is this being returned?"
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none mb-4"
                />
                <div className="flex gap-3">
                  <button onClick={() => setReturnId(null)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-text_secondary hover:bg-background">Cancel</button>
                  <button
                    onClick={async () => {
                      if (!returnReason.trim()) return;
                      setIsProcessing(true);
                      try {
                        await api.rejectTimesheet(returnId, returnReason.trim());
                        setReturnId(null); setReturnReason(''); setDetailId(null); loadTeam();
                      } catch (err: any) { alert(err?.message || 'Failed to return.'); } finally { setIsProcessing(false); }
                    }}
                    disabled={isProcessing || !returnReason.trim()}
                    className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-950 rounded-xl text-sm font-semibold disabled:opacity-50"
                  >
                    {isProcessing ? 'Working…' : 'Return timesheet'}
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
