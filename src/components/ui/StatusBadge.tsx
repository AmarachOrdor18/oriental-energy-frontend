export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/* Keyword-driven badge | one component across the whole platform.
   Mirrors the reference's semantic mapping: success / warning / danger / muted. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  let colorClass = 'bg-gray-100 text-gray-600';

  const s = status.toLowerCase();
  if (
    s.includes('approved') || s.includes('success') || s.includes('resolved') ||
    s.includes('matched') || s.includes('verified') || s.includes('processed') ||
    s.includes('logged') || s.includes('active') || s.includes('posted') ||
    s.includes('completed') || s.includes('paid')
  ) {
    colorClass = 'bg-success-bg text-success';
  } else if (
    s.includes('pending') || s.includes('submitted') || s.includes('review') ||
    s.includes('progress') || s.includes('warning') || s.includes('awaiting') ||
    s.includes('calculated') || s.includes('under') || s.includes('incomplete')
  ) {
    colorClass = 'bg-warning-bg text-warning';
  } else if (
    s.includes('fail') || s.includes('reject') || s.includes('returned') ||
    s.includes('breach') || s.includes('danger') || s.includes('high') ||
    s.includes('escalated') || s.includes('overdue')
  ) {
    colorClass = 'bg-danger-bg text-danger';
  } else if (
    s.includes('not started') || s.includes('archived') || s.includes('disabled') ||
    s.includes('low') || s.includes('closed') || s.includes('draft') || s.includes('missing')
  ) {
    colorClass = 'bg-gray-100 text-gray-500';
  } else if (s.includes('medium')) {
    colorClass = 'bg-warning-bg text-warning';
  }

  return (
    <span className={cn('status-pill', colorClass, className)}>
      {status}
    </span>
  );
}
