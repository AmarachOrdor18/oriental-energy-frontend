import { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { Users, ArrowRight, Send, Check } from 'lucide-react';
import { useLocation } from 'wouter';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { motion } from 'framer-motion';

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
  const [page, setPage] = useState(1);

  useEffect(() => { loadTeam(); }, []);

  const loadTeam = async () => {
    try {
      if (user?.id) {
        const reports = await api.getDirectReports(user.id);
        const enriched = await Promise.all(reports.map(async (m: any) => {
          try {
            const summary = await api.getUserTimesheetSummary(m.id);
            const recentTs = summary.timesheets?.[0];
            return { ...m, recentTs };
          } catch { return m; }
        }));
        setTeamMembers(enriched);
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
      const targets = broadcastTarget === 'defaulters'
        ? teamMembers.filter(m => !m.recentTs || m.recentTs.status === 'draft' || m.recentTs.status === 'overdue')
        : teamMembers;
      if (targets.length === 0) { alert('No defaulters found this week.'); setIsBroadcasting(false); return; }
      await api.broadcastReminder(broadcastMsg, broadcastTarget === 'defaulters');
      setBroadcastSuccess(true);
      setTimeout(() => { setShowBroadcast(false); setBroadcastSuccess(false); setBroadcastMsg(DEFAULT_BROADCAST); setBroadcastTarget('all'); }, 2000);
    } catch (err) {
      alert('Failed to send broadcast');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const statusColor = (status: string) => {
    const c: Record<string, string> = {
      approved: 'text-emerald-500 bg-emerald-500/10',
      submitted: 'text-blue-500 bg-blue-500/10',
      under_review: 'text-amber-500 bg-amber-500/10',
      draft: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800',
      rejected: 'text-red-500 bg-red-500/10',
      overdue: 'text-red-500 bg-red-500/10',
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
            <h1 className="text-2xl font-bold text-text_primary">Team Management</h1>
            <p className="text-sm text-text_secondary mt-1">Overview of your direct reports and their timesheet status.</p>
          </div>
          <button onClick={() => setShowBroadcast(!showBroadcast)} className="bg-primary text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all hover:bg-primary_dark">
            <Send className="h-4 w-4" /> Broadcast Reminder
          </button>
        </div>

        {/* Broadcast Panel */}
        {showBroadcast && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-8 bg-surface border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-text_primary mb-2">Send Broadcast Reminder</h3>
            <p className="text-xs text-text_secondary mb-4">This will send an in-app notification to your direct reports.</p>
            {broadcastSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-500 text-sm font-semibold">
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
                  <button onClick={handleBroadcast} disabled={isBroadcasting || !broadcastMsg.trim()} className="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm disabled:opacity-50">
                    {isBroadcasting ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Team Table */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-background/30 flex items-center justify-between">
            <h2 className="text-base font-bold text-text_primary">Team Members</h2>
            <span className="text-xs text-text_secondary">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</span>
          </div>
          {teamMembers.length === 0 ? (
            <div className="p-12 text-center text-text_secondary">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">You have no direct reports.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-background/40 text-[10px] font-bold uppercase tracking-widest text-text_secondary border-b border-border">
                      <th className="px-5 py-4 text-left">Name</th>
                      <th className="px-5 py-4 text-left">Role</th>
                      <th className="px-5 py-4 text-left">Email</th>
                      <th className="px-5 py-4 text-left">Recent Timesheet</th>
                      <th className="px-5 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {pagedMembers.map((member, i) => (
                      <motion.tr key={member.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="hover:bg-background/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
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
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => setLocation(`/team/${member.id}`)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary_dark transition-colors">
                            View <ArrowRight className="h-3.5 w-3.5" />
                          </button>
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
      </div>
    </DashboardLayout>
  );
}
