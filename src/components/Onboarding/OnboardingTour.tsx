import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { ChevronLeft, ChevronRight, Compass, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';

/* ── Types ──────────────────────────────────────────────────────────────── */
export interface TourStep {
  /** CSS selector for the element to spotlight. Null = centred card, no spotlight. */
  target: string | null;
  /** Route the tour should navigate to before spotlighting. Omit = stay put. */
  path?: string;
  /** Value written to sessionStorage before navigating, so the landing page can prepare itself (e.g. auto-run a report). */
  flag?: string;
  title: string;
  body: string;
}

/* ── Per-role scripts — detailed, in the voice of a colleague showing you round ── */
const COMMON_END: TourStep[] = [
  {
    target: '[data-tour="topbar-darkmode"]',
    title: 'Light and dark, your choice',
    body: 'The moon icon up here switches the whole platform between light and dark mode. Your eyes, your call — it remembers what you picked next time.',
  },
  {
    target: '[data-tour="topbar-bell"]',
    title: 'Your notifications live here',
    body: 'Approvals, reminders and broadcasts land here with a count of anything unread. When someone acts on your timesheet, you will know about it in here, not by chasing anyone.',
  },
  {
    target: null,
    title: 'You are ready',
    body: 'That is the whirlwind version. Your role guide covers the pages you will actually use, and you can replay this tour anytime from the compass icon in the top bar. Now go break it in.',
  },
];

const TOURS: Record<string, TourStep[]> = {
  user: [
    {
      target: null,
      title: 'Welcome to Oriental Energy TMS',
      body: 'This five-minute tour walks you through logging your time, week by week. No forms to print, nothing to email. Just you, this screen, and a few clicks a day.',
    },
    {
      target: '[data-tour="nav-daily-logging"]',
      title: 'Daily Logging is home base',
      body: 'Everything starts here. This is your personal calendar: each day is a tile you click to log hours against the projects you worked on. Green means logged, red means missing. Aim for green.',
    },
    {
      target: '[data-tour="nav-submissions"]',
      title: 'Submissions shows your week-by-week trail',
      body: 'Every week compiles into a timesheet that flows to your line manager. This page tracks each one: draft, submitted, approved, or returned. If something comes back, it lands here with the reason attached.',
    },
    {
      target: '[data-tour="nav-submissions"]',
      title: 'Planning time away? Book it ahead',
      body: 'Click any future weekday on the same calendar to pre-book annual or sick leave. It shows on your calendar straight away and your manager sees it when the week compiles, so nobody is surprised by an empty week.',
    },
    {
      target: '[data-tour="nav-dashboard"]',
      title: 'The dashboard is your morning glance',
      body: 'Hours logged this week, days still open, anything waiting on you. It updates as you log, so it is the fastest way to see where you stand.',
    },
    ...COMMON_END,
  ],
  line_manager: [
    {
      target: null,
      title: 'Welcome. Here is your manager flow',
      body: 'Your team logs time daily; weekly timesheets flow up to you for approval, then on to finance. Your whole job in this system is a two-minute daily glance and a weekly approval sweep. The tour shows you where.',
    },
    {
      target: '[data-tour="nav-approvals"]',
      title: 'The Review Queue is your worklist',
      body: 'Everything your team has submitted and is waiting on you sits here. Open one, check the hours and notes, then approve or return it with a reason. Returned timesheets go straight back to the person with your note attached.',
    },
    {
      target: '[data-tour="nav-team"]',
      title: 'Team Members shows the health of your team',
      body: 'One row per person: their logged hours, pending submissions, anything overdue. Use it to spot who needs a nudge before month-end, not after.',
    },
    {
      target: '[data-tour="util-filters"]',
      path: '/utilisation',
      flag: 'oe_tour_autorun_util',
      title: 'Utilisation: who is carrying what',
      body: 'This is the report that used to take a day in Excel. Pick the month and year, narrow to one department if you like, then Run. Capacity is working days times standard hours, less public holidays and recorded leave, so the percentages are real, not guesses.',
    },
    {
      target: '[data-tour="util-dept-table"]',
      title: 'The department rollup',
      body: 'One row per department: people, capacity, hours actually logged. The bar turns gold under 85 percent and red under 60, so a capacity gap jumps out before it becomes a delivery problem.',
    },
    {
      target: '[data-tour="util-person-table"]',
      title: 'Then straight down to a person',
      body: 'Search a name, sort by utilisation, and each row shows their top projects for the month. This is the level you plan from: who is loaded, who has room, who needs a nudge.',
    },
    {
      target: null,
      title: 'Chasing is one click',
      body: 'When timesheets sit unsubmitted, the broadcast reminder button on the Review Queue nudges everyone who owes you one, in-app and by email. No awkward messages required.',
    },
    ...COMMON_END,
  ],
  hod: [
    {
      target: null,
      title: 'Welcome. The department view',
      body: 'As head of department you see two layers: your own manager duties, and a money-level view of your department. You approve like any line manager, and you can see what your department burns in hours.',
    },
    {
      target: '[data-tour="nav-approvals"]',
      title: 'Review Queue: your team first',
      body: 'Timesheets from your department queue here for your approval. Approve, or return with a reason. Multi-level approval means what you clear moves up automatically.',
    },
    {
      target: '[data-tour="nav-finance"]',
      title: 'Finance Review, scoped to your department',
      body: 'You get a read-only finance view: every approved line, its cost value, and the rollup by department. What you see here is exactly what finance exports. Look for anything odd before it becomes an invoice.',
    },
    {
      target: '[data-tour="budget-dept-table"]',
      path: '/budgets',
      title: 'Budgets: your department burn',
      body: 'Budgeted hours against actual burn for the year. The bar turns gold at watch and red when a department is over, while the year can still be corrected. This table is your first warning, not the year-end surprise.',
    },
    {
      target: '[data-tour="budget-project-table"]',
      title: 'Then the projects underneath',
      body: 'Every project with budget, burned and remaining hours. Sort or search to find the hot one. The status badge says Healthy, Watch or Over at a glance.',
    },
    {
      target: '[data-tour="util-filters"]',
      path: '/utilisation',
      flag: 'oe_tour_autorun_util',
      title: 'Utilisation: the capacity side',
      body: 'Money is only half the story. Pick the month and Run: capacity is working days times 8 hours, less holidays and recorded leave, so what you see is genuinely available time.',
    },
    {
      target: '[data-tour="util-dept-table"]',
      title: 'Department rollup',
      body: 'Green is healthy at 85 percent and above, gold means monitor, red flags a capacity gap. Have this open when you commit the department to its next project.',
    },
    {
      target: '[data-tour="util-person-table"]',
      title: 'Down to the person',
      body: 'Search, sort, and see each person\u2019s top projects for the month. Planning, reviews, resourcing conversations: they all start from this table.',
    },
    ...COMMON_END,
  ],
  finance: [
    {
      target: null,
      title: 'Welcome. Finance is where it lands',
      body: 'Everything flows to you: approved timesheets, costed lines, and the export to SUN. The tour walks the review-to-export path and the money views.',
    },
    {
      target: '[data-tour="nav-finance"]',
      title: 'Finance Review: the control room',
      body: 'Approved time review, line by line. Mark rows OK, query them with a note, or reject. Cost and charge values are computed per line from the rate cards, so you are reviewing money, not just hours.',
    },
    {
      target: '[data-tour="finance-dept-filter"]',
      title: 'Focus on one department',
      body: 'The department filter narrows the whole queue, KPIs included, to a single department. The export honours it too, so you can clear and export department by department.',
    },
    {
      target: '[data-tour="finance-kpis"]',
      title: 'The money, always on screen',
      body: 'Approved hours, total cost and charge values, flags and the export-ready count. If cost shows a dash, a rate card is missing for that period. Add one under Rate Cards.',
    },
    {
      target: '[data-tour="finance-export-btn"]',
      title: 'Export to SUN, sequenced',
      body: 'Exporting OK rows writes a numbered export run, marks those rows exported, and downloads the CSV. If a download fails, the Export History tab re-runs the exact same sequence. Same numbers, new file.',
    },
    {
      target: '[data-tour="budget-dept-table"]',
      path: '/budgets',
      title: 'Budgets: the plan against the burn',
      body: 'Budgeted hours against actual burn, by department and by project. Gold means watch, red means over. This is where an overrun shows up in-week, not at year-end when the invoice lands.',
    },
    {
      target: '[data-tour="nav-reports"]',
      title: 'Reports for the wider picture',
      body: 'Not-posted reports show who has not submitted, filtered by your visibility. Hours summaries break the month down by person, project or department, with custom date ranges.',
    },
    ...COMMON_END,
  ],
  admin: [
    {
      target: null,
      title: 'Welcome. You run the platform',
      body: 'Admin owns the org structure, the calendar, the money configuration and the audit trail. Five minutes here saves you hours later.',
    },
    {
      target: '[data-tour="nav-admin"]',
      title: 'Administration: the org in one place',
      body: 'Users, departments, projects, activities, accounting periods, holidays, settings and the audit log. One tab each. Everything you set here shapes what everyone else sees.',
    },
    {
      target: '[data-tour="admin-periods"]',
      path: '/admin',
      title: 'Accounting periods: one open at a time',
      body: 'Opening a period automatically closes the previous one, so the system always has exactly one live period. Close them as you finish each month; reopen if you must, with a reason on the record.',
    },
    {
      target: '[data-tour="nav-rate-cards"]',
      title: 'Rate Cards: where hours become money',
      body: 'Cost and charge rates per grade and project, effective-dated. Finance review lines and exports price themselves from this table. When rates change, add a new card with a new effective date. History keeps its old prices.',
    },
    {
      target: '[data-tour="budget-dept-table"]',
      path: '/budgets',
      title: 'Budgets keep the year honest',
      body: 'Set budgeted hours per project per year, right here: click the pencil, type the number, save. The burn bars compare actual logged time against plan, so overruns surface in-week, not at year-end.',
    },
    {
      target: '[data-tour="admin-audit"]',
      title: 'The audit log never forgets',
      body: 'Every consequential action, who did it, and when. Unlocking a locked timesheet, changing a rate, exporting to SUN. If anyone ever asks what happened, the answer is in here.',
    },
    ...COMMON_END,
  ],
};

/* ── Storage keys ───────────────────────────────────────────────────────── */
const keyFor = (role: string) => `oe_tour_done_${role}`;
export const hasCompletedTour = (role?: string | null) =>
  !!role && typeof window !== 'undefined' && localStorage.getItem(keyFor(role)) === '1';
export const resetTour = (role?: string | null) => {
  if (role && typeof window !== 'undefined') localStorage.removeItem(keyFor(role));
};

/* ── The engine ─────────────────────────────────────────────────────────── */
export default function OnboardingTour() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const role = user?.role || 'user';
  const steps = TOURS[role] || TOURS.user;

  const [active, setActive] = useState(false);
  const [idx, setIdx] = useState(0);
  const [spot, setSpot] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const rafRef = useRef<number>(0);

  const step = steps[idx];
  const finished = idx >= steps.length;

  // Navigate when the step demands a different route. The spotlight measure
  // effect below re-runs on the location change and waits for the target.
  useEffect(() => {
    if (!active || finished || !step) return;
    if (step.path && location !== step.path) {
      if (step.flag) {
        try { sessionStorage.setItem(step.flag, '1'); } catch { /* private mode */ }
      }
      navigate(step.path);
    }
  }, [active, idx, finished, step, location]);

  const measure = useCallback(() => {
    if (!step?.target) { setSpot(null); return; }
    const el = document.querySelector(step.target);
    if (!el) { setSpot(null); return; }
    const r = el.getBoundingClientRect();
    setSpot({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step?.target]);

  // Advance: scroll target into view, then measure after the scroll settles.
  useEffect(() => {
    if (!active || finished) return;
    if (!step?.target) { setSpot(null); return; }
    const el = document.querySelector(step.target);
    if (!el) { setSpot(null); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setTimeout(measure, 380));
    const onRe = () => measure();
    window.addEventListener('resize', onRe);
    window.addEventListener('scroll', onRe, true);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onRe);
      window.removeEventListener('scroll', onRe, true);
    };
  }, [active, idx, finished, step?.target, measure]);

  // Sidebar items can be collapsed on narrow screens; retry briefly.
  useEffect(() => {
    if (!active || finished || !step?.target) return;
    let tries = 0;
    const t = setInterval(() => {
      if (document.querySelector(step.target!)) { measure(); clearInterval(t); }
      else if (++tries > 5) clearInterval(t);
    }, 400);
    return () => clearInterval(t);
  }, [active, idx, finished, step?.target, measure]);

  const start = useCallback(() => { setIdx(0); setActive(true); }, []);
  const stop = useCallback((markDone: boolean) => {
    setActive(false);
    if (markDone && typeof window !== 'undefined') localStorage.setItem(keyFor(role), '1');
  }, [role]);

  // Auto-start once per role, first login only. Wait for the shell to paint.
  useEffect(() => {
    if (!user || hasCompletedTour(role)) return;
    const t = setTimeout(() => start(), 1200);
    return () => clearTimeout(t);
  }, [user, role, start]);

  // External relaunch button (topbar compass) listens on this custom event.
  useEffect(() => {
    const on = () => { resetTour(role); start(); };
    window.addEventListener('oe:tour:start', on);
    return () => window.removeEventListener('oe:tour:start', on);
  }, [role, start]);

  if (!active || finished || typeof document === 'undefined') return null;

  const pad = 8;
  const tipWidth = 360;
  const tip: { top: number; left: number } | null = (() => {
    if (!spot) return { top: Math.max(80, window.innerHeight / 2 - 140), left: window.innerWidth / 2 - tipWidth / 2 };
    const below = spot.top + spot.height + pad + 220 < window.innerHeight;
    const top = below ? spot.top + spot.height + pad : Math.max(12, spot.top - 232);
    const left = Math.min(Math.max(12, spot.left + spot.width / 2 - tipWidth / 2), window.innerWidth - tipWidth - 12);
    return { top, left };
  })();

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-label="Guided tour">
      {/* Dimmer + spotlight cutout via box-shadow */}
      {spot && (
        <div
          className="fixed rounded-xl transition-all duration-300 ease-out pointer-events-none"
          style={{
            top: spot.top - pad, left: spot.left - pad,
            width: spot.width + pad * 2, height: spot.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(9, 26, 26, 0.72)',
            border: '2px solid rgba(212, 175, 55, 0.85)',
            borderRadius: 14,
          }}
        />
      )}
      {!spot && <div className="fixed inset-0 bg-[rgba(9,26,26,0.72)] transition-opacity duration-300" />}

      {/* Tooltip card */}
      <div
        className="fixed bg-surface border border-border rounded-2xl shadow-2xl p-5 transition-all duration-200"
        style={{ top: tip.top, left: tip.left, width: tipWidth }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
              {role === 'admin' ? 'Admin tour' : role === 'finance' ? 'Finance tour' : role === 'hod' ? 'HOD tour' : role === 'line_manager' ? 'Manager tour' : 'Your tour'}
            </p>
            <h3 className="text-base font-bold text-text_primary mt-0.5">{step.title}</h3>
          </div>
          <button onClick={() => stop(true)} className="p-1 rounded-lg text-text_secondary hover:bg-background" title="End tour">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-text_secondary mt-2 leading-relaxed">{step.body}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs font-semibold text-text_secondary">{idx + 1} of {steps.length}</span>
          <div className="flex items-center gap-2">
            {idx > 0 && (
              <button onClick={() => setIdx(i => i - 1)} className="btn-outline text-xs py-1.5 flex items-center gap-1">
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}
            <button onClick={() => stop(true)} className="text-xs font-semibold text-text_secondary hover:text-text_primary px-2">
              Skip
            </button>
            <button onClick={() => (idx === steps.length - 1 ? stop(true) : setIdx(i => i + 1))} className="btn-solid text-xs py-1.5 flex items-center gap-1">
              {idx === steps.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {/* progress dots */}
        <div className="flex items-center gap-1.5 mt-3">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === idx ? 'w-5 bg-gold-500' : i < idx ? 'w-2 bg-gold-500/50' : 'w-2 bg-border'}`} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* Topbar button that (re)launches the tour */
export function TourLauncher() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('oe:tour:start'))}
      className="p-2 rounded-lg text-text_secondary hover:text-text_primary hover:bg-background transition-colors"
      title="Take the guided tour"
      data-tour="topbar-tour"
    >
      <Compass className="h-[18px] w-[18px]" />
    </button>
  );
}
