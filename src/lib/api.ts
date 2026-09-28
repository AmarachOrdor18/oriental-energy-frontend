const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    // A 401 on the login call itself is just bad credentials, not an expired
    // session — surface the server's message instead of bouncing to /login.
    if (endpoint.startsWith('/auth/login')) {
      let msg = 'Invalid email or password.';
      try { msg = (await res.json()).error || msg; } catch { /* keep default */ }
      throw new Error(msg);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  // Handle CSV/blob responses
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) return res.blob();

  if (!contentType.includes('application/json')) {
    throw new Error(
      res.ok
        ? 'Unexpected response from server (not JSON). Check that the backend is running.'
        : `Server error ${res.status}: backend may be down or the route does not exist.`
    );
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (email: string, password: string) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  forgotPassword: (email: string) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  // Users
  getUsers: (params?: Record<string, string>) => request(`/users?${new URLSearchParams(params || '')}`),
  getUser: (id: string) => request(`/users/${id}`),
  createUser: (data: any) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateUserStatus: (id: string, is_active: boolean) => request(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
  getDirectReports: (id: string) => request(`/users/${id}/direct-reports`),
  getUserTimesheetSummary: (id: string, period?: string) => request(`/users/${id}/timesheet-summary${period ? `?period=${period}` : ''}`),

  // Departments
  getDepartments: () => request('/departments'),
  getDepartment: (id: string) => request(`/departments/${id}`),
  createDepartment: (data: any) => request('/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id: string, data: any) => request(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Projects
  getProjects: (deptId?: string) => request(`/projects${deptId ? `?department_id=${deptId}` : ''}`),
  createProject: (data: any) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: any) => request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Daily Logs
  getDailyLogs: (params?: Record<string, string>) => request(`/daily-logs?${new URLSearchParams(params || '')}`),
  getWeeklySummary: (userId: string, weekStart: string) => request(`/daily-logs/weekly-summary?user_id=${userId}&week_start=${weekStart}`),
  saveDailyLog: (data: any) => request('/daily-logs', { method: 'POST', body: JSON.stringify(data) }),
  saveDailyLogBatch: (entries: any[]) => request('/daily-logs/batch', { method: 'POST', body: JSON.stringify({ entries }) }),
  saveDailyLogDay: (data: any) => request('/daily-logs/day', { method: 'POST', body: JSON.stringify(data) }),

  // Timesheets
  getTimesheets: (params?: Record<string, string>) => request(`/timesheets?${new URLSearchParams(params || '')}`),
  getTimesheet: (id: string) => request(`/timesheets/${id}`),
  createTimesheet: (data: any) => request('/timesheets', { method: 'POST', body: JSON.stringify(data) }),
  submitTimesheet: (id: string) => request(`/timesheets/${id}/submit`, { method: 'PATCH' }),

  // Approvals
  getPendingApprovals: () => request('/approvals/pending'),
  approveTimesheet: (id: string) => request(`/approvals/${id}/approve`, { method: 'PATCH' }),
  rejectTimesheet: (id: string, reason: string) => request(`/approvals/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  bulkApprove: (ids: string[]) => request('/approvals/bulk-approve', { method: 'POST', body: JSON.stringify({ ids }) }),
  broadcastReminder: (message: string, defaulters_only = false) => request('/approvals/broadcast-reminder', { method: 'POST', body: JSON.stringify({ message, defaulters_only }) }),
  createBroadcast: (message: string, defaulters_only: boolean, scheduled_for?: string) =>
    request('/approvals/broadcasts', { method: 'POST', body: JSON.stringify({ message, defaulters_only, scheduled_for }) }),
  getBroadcasts: () => request('/approvals/broadcasts'),
  cancelBroadcast: (id: string) => request(`/approvals/broadcasts/${id}`, { method: 'DELETE' }),

  // Finance
  getFinanceReviewQueue: (params?: Record<string, string>) => request(`/finance/review-queue?${new URLSearchParams(params || '')}`),
  exportFinanceReviewQueue: (period?: string, departmentId?: string) => request(`/finance/review-queue/export?${new URLSearchParams({ ...(period ? { period } : {}), ...(departmentId ? { department_id: departmentId } : {}) })}`),
  getFinanceDecisions: (period: string) => request(`/finance/decisions?period=${period}`),
  saveFinanceDecisions: (data: { decisions: any[]; period: string }) => request('/finance/decisions', { method: 'POST', body: JSON.stringify(data) }),
  getFinanceDecisionHistory: (params?: Record<string, string>) => request(`/finance/decisions/history?${new URLSearchParams(params || '')}`),
  getFinanceReviewLines: (params?: Record<string, string>) => request(`/finance/review-queue/lines?${new URLSearchParams(params || '')}`),
  getFinanceExports: () => request('/finance/exports'),
  rerunFinanceExport: (sequenceNumber: string) => request(`/finance/exports/${sequenceNumber}/rerun`, { method: 'POST' }),

  // Holidays
  getHolidays: (year?: number) => request(`/holidays${year ? `?year=${year}` : ''}`),
  createHoliday: (data: any) => request('/holidays', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (id: string) => request(`/holidays/${id}`, { method: 'DELETE' }),

  // Accounting Periods
  getAccountingPeriods: () => request('/accounting-periods'),
  createAccountingPeriod: (data: any) => request('/accounting-periods', { method: 'POST', body: JSON.stringify(data) }),
  closePeriod: (id: string) => request(`/accounting-periods/${id}/close`, { method: 'PATCH' }),
  openPeriod: (id: string) => request(`/accounting-periods/${id}/open`, { method: 'PATCH' }),

  // Admin — new v5 methods
  getAdminHealth: () => request('/admin/health'),
  getAdminSettings: () => request('/admin/settings'),
  getSystemSettings: () => request('/settings/system'),
  updateAdminSettings: (data: any) => request('/admin/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  getAuditLog: (params?: Record<string, string>) => request(`/admin/audit-log?${new URLSearchParams(params || '')}`),
  reassignManager: (data: any) => request('/admin/reassign-manager', { method: 'POST', body: JSON.stringify(data) }),

  // Timesheets — new v5 methods
  withdrawTimesheet: (id: string) => request(`/timesheets/${id}/withdraw`, { method: 'PATCH' }),
  unlockTimesheet: (id: string, reason: string) => request(`/timesheets/${id}/unlock`, { method: 'POST', body: JSON.stringify({ reason }) }),
  relockTimesheet: (id: string) => request(`/timesheets/${id}/relock`, { method: 'POST' }),
  getTimesheetMonthlySummary: (userId: string, period: string) => request(`/timesheets/monthly-summary/view?user_id=${userId}&period=${period}`),

  // Approvals — new v5 methods
  approveMonth: (userId: string, periodCode: string) => request('/approvals/approve-month', { method: 'POST', body: JSON.stringify({ user_id: userId, period_code: periodCode }) }),

  // Reports — new v5 methods
  getNotPostedReport: (periodCode: string, params?: Record<string, string>) => request(`/reports/not-posted?period_code=${periodCode}&${new URLSearchParams(params || '')}`),
  getHoursSummary: (params: Record<string, string>) => request(`/reports/hours-summary?${new URLSearchParams(params)}`),

  // Utilisation & rate cards (v7)
  getUtilisation: (params: Record<string, string>) => request(`/utilisation?${new URLSearchParams(params)}`),
  getRateCards: () => request('/rate-cards'),
  createRateCard: (data: any) => request('/rate-cards', { method: 'POST', body: JSON.stringify(data) }),
  updateRateCard: (id: string, data: any) => request(`/rate-cards/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deactivateRateCard: (id: string) => request(`/rate-cards/${id}`, { method: 'DELETE' }),

  // Budgets (v7)
  getBudgets: (params: Record<string, string>) => request(`/budgets?${new URLSearchParams(params)}`),
  // budgets returns { year, rows, departments } — departments is the per-department burn rollup
  setBudget: (projectId: string, data: { year: number; budgeted_hours: number; budgeted_cost?: number | null }) =>
    request(`/budgets/${projectId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Activities
  getActivities: (projectId?: string) => request(`/activities${projectId ? `?project_id=${projectId}` : ''}`),
  createActivity: (data: any) => request('/activities', { method: 'POST', body: JSON.stringify(data) }),
  updateActivity: (id: string, data: any) => request(`/activities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteActivity: (id: string) => request(`/activities/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request('/notifications/mark-all-read', { method: 'POST' }),

  // Access control (admin)
  getPermissionCatalog: () => request('/permissions/pages'),
  getUserPermissions: (userId: string) => request(`/permissions/users/${userId}`),
  setUserPagePermission: (userId: string, pageKey: string, effect: 'allow' | 'deny' | 'inherit') =>
    request(`/permissions/users/${userId}/${pageKey}`, { method: 'PUT', body: JSON.stringify({ effect }) }),
};
