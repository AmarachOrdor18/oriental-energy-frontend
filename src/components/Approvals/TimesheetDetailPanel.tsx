import { useEffect, useState } from 'react';
import {
  X, Clock, CheckCircle, XCircle, Loader2, CalendarDays, FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';

interface Props {
  timesheetId: string | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReturn: (id: string) => void;
  isProcessing: boolean;
}

export default function TimesheetDetailPanel({ timesheetId, onClose, onApprove, onReturn, isProcessing }: Props) {
  const [detail, setDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!timesheetId) { setDetail(null); return; }
    let cancelled = false;
    setIsLoading(true);
    api.getTimesheet(timesheetId)
      .then((d: any) => { if (!cancelled) setDetail(d); })
      .catch(() => { if (!cancelled) setDetail(null); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [timesheetId]);

  const ts = detail?.timesheet || detail;
  // The API returns timesheet entries under `entries`. Leave rows carry
  // entry_type annual_leave/sick_leave with hours 0 | render them as leave chips.
  const entries: any[] = detail?.entries || [];

  const totalHours = entries.reduce((s, e) => s + (parseFloat(e.hours || 0) || 0), 0);
  const leaveCount = entries.filter(e => e.entry_type === 'annual_leave' || e.entry_type === 'sick_leave').length;

  return (
    <AnimatePresence>
      {timesheetId && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-md bg-surface border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-border">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gold-600 mb-0.5">Timesheet Detail</p>
                <h2 className="text-lg font-bold text-text_primary truncate">
                  {ts?.user_name || 'Loading…'}
                </h2>
                <p className="text-xs text-text_secondary mt-0.5">{ts?.department_name || 'No department'}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-background text-text_secondary hover:text-text_primary transition-colors flex-shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !ts ? (
                <p className="text-sm text-text_secondary text-center py-10">Could not load this timesheet.</p>
              ) : (
                <div className="space-y-5">
                  {/* Summary facts */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text_secondary mb-1 flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3" /> Week
                      </p>
                      <p className="text-sm font-bold text-text_primary">
                        {ts.week_start_date && new Date(ts.week_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        {' '}&ndash;{' '}
                        {ts.week_end_date && new Date(ts.week_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text_secondary mb-1">Status</p>
                      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded bg-navy-100 text-navy-700">
                        {String(ts.status || '').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text_secondary mb-1 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> Submitted
                      </p>
                      <p className="text-sm font-semibold text-text_primary">
                        {ts.submitted_at
                          ? new Date(ts.submitted_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : 'Not yet submitted'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text_secondary mb-1">Totals</p>
                      <p className="text-sm font-semibold text-text_primary">
                        {totalHours.toFixed(1)}h{leaveCount > 0 && <span className="text-text_secondary"> + {leaveCount} leave</span>}
                      </p>
                    </div>
                  </div>

                  {/* Entry lines */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text_secondary mb-2 flex items-center gap-1.5">
                      <FileText className="h-3 w-3" /> Entries ({entries.length})
                    </p>
                    {entries.length > 0 ? (
                      <div className="space-y-1.5">
                        {entries.map((e, i) => {
                          const isAnnual = e.entry_type === 'annual_leave';
                          const isSick = e.entry_type === 'sick_leave';
                          const isLeave = isAnnual || isSick;
                          return (
                            <div key={e.id || i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-text_primary">
                                  {e.date && new Date(e.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </p>
                                <p className="text-[11px] text-text_secondary truncate">
                                  {e.project_name || e.project_code || 'N/A'}
                                </p>
                              </div>
                              {isLeave ? (
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${isSick ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                  {isSick ? 'Sick leave' : 'Annual leave'}
                                </span>
                              ) : (
                                <span className="text-xs font-bold font-mono text-text_primary flex-shrink-0">
                                  {parseFloat(e.hours || 0).toFixed(1)}h
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-text_secondary py-3">No entries on this timesheet.</p>
                    )}
                  </div>

                  {ts.return_reason && (
                    <div className="rounded-xl border border-warning/30 bg-warning-bg/50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-warning mb-1">Return reason</p>
                      <p className="text-xs text-text_primary">{ts.return_reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-border flex gap-3">
              <button
                onClick={() => onApprove(ts.id)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-success hover:bg-teal-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Approve
              </button>
              <button
                onClick={() => onReturn(ts.id)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-950 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Return
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
