import { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import {
  Users, Briefcase, Calendar, Plus, Search, Building2, CalendarDays,
  Check, Loader2, Settings, Activity, FileText, Lock, Unlock,
  AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Edit2, X
} from 'lucide-react';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'users' | 'departments' | 'projects' | 'activities' | 'periods' | 'holidays' | 'settings' | 'audit' | 'reports';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [settings, setSettings] = useState<any>({ min_daily_hours: '8', hour_enforcement_mode: 'block' });
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [auditFilters, setAuditFilters] = useState({ date_from: '', date_to: '', action: '' });
  const [notPosted, setNotPosted] = useState<any[]>([]);
  const [reportPeriod, setReportPeriod] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Forms — new items
  const [showNewUser, setShowNewUser] = useState(false);
  const [showNewDept, setShowNewDept] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [showNewHoliday, setShowNewHoliday] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user', department_id: '', manager_id: '', can_create_projects: false });
  const [newDept, setNewDept] = useState({ name: '', code: '', hod_id: '' });
  const [newProject, setNewProject] = useState({ name: '', code: '', afe_code: '', max_hours_per_week: 40, department_id: '' });
  const [newPeriod, setNewPeriod] = useState({ period_code: '', start_date: '', end_date: '' });
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', year: new Date().getFullYear() });

  // Edit states
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editingDept, setEditingDept] = useState<any>(null);

  // Activities
  const [activities, setActivities] = useState<any[]>([]);
  const [activityProjectFilter, setActivityProjectFilter] = useState('');
  const [showNewActivity, setShowNewActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({ project_id: '', name: '', code: '' });
  const [activitySearch, setActivitySearch] = useState('');

  // Unlock timesheet
  const [unlockModal, setUnlockModal] = useState<{ timesheetId: string; open: boolean } | null>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [periodTimesheets, setPeriodTimesheets] = useState<Record<string, any[]>>({});
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (activeTab === 'audit') loadAuditLog(); }, [activeTab, auditOffset, auditFilters]);
  useEffect(() => { if (activeTab === 'settings') loadSettings(); }, [activeTab]);

  const loadAll = async () => {
    try {
      const [u, d, p, ap, h, healthData, acts] = await Promise.all([
        api.getUsers(), api.getDepartments(), api.getProjects(),
        api.getAccountingPeriods(), api.getHolidays(new Date().getFullYear()),
        api.getAdminHealth().catch(() => null),
        api.getActivities().catch(() => []),
      ]);
      setUsers(u); setDepartments(d); setProjects(p); setPeriods(ap); setHolidays(h); setActivities(acts);
      if (healthData) setHealth(healthData);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const loadSettings = async () => {
    try { setSettings(await api.getAdminSettings()); } catch { }
  };

  const loadAuditLog = async () => {
    try {
      const data = await api.getAuditLog({ ...auditFilters, offset: String(auditOffset) });
      setAuditLog(data.rows); setAuditTotal(data.total);
    } catch { }
  };

  const loadNotPosted = async () => {
    if (!reportPeriod) return;
    try { setNotPosted((await api.getNotPostedReport(reportPeriod)).not_posted); } catch { }
  };

  const loadPeriodTimesheets = async (periodId: string) => {
    const p = periods.find((p: any) => p.id === periodId);
    if (!p || periodTimesheets[periodId]) return;
    try {
      const ts = await api.getTimesheets({ period: p.period_code });
      setPeriodTimesheets(prev => ({ ...prev, [periodId]: ts }));
    } catch { }
  };

  const handleCreateUser = async () => {
    setSaving(true);
    try { await api.createUser(newUser); setShowNewUser(false); setNewUser({ name: '', email: '', role: 'user', department_id: '', manager_id: '', can_create_projects: false }); loadAll(); }
    catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try { await api.updateUser(editingUser.id, editingUser); setEditingUser(null); loadAll(); }
    catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleSaveEditProject = async () => {
    if (!editingProject) return;
    setSaving(true);
    try { await api.updateProject(editingProject.id, editingProject); setEditingProject(null); loadAll(); }
    catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleSaveEditDept = async () => {
    if (!editingDept) return;
    setSaving(true);
    try { await api.updateDepartment(editingDept.id, editingDept); setEditingDept(null); loadAll(); }
    catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleCreateDept = async () => {
    setSaving(true);
    try { await api.createDepartment(newDept); setShowNewDept(false); setNewDept({ name: '', code: '', hod_id: '' }); loadAll(); }
    catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleCreateProject = async () => {
    setSaving(true);
    try { await api.createProject(newProject); setShowNewProject(false); setNewProject({ name: '', code: '', afe_code: '', max_hours_per_week: 40, department_id: '' }); loadAll(); }
    catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleCreatePeriod = async () => {
    setSaving(true);
    try { await api.createAccountingPeriod(newPeriod); setShowNewPeriod(false); setNewPeriod({ period_code: '', start_date: '', end_date: '' }); loadAll(); }
    catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleCreateHoliday = async () => {
    setSaving(true);
    try { await api.createHoliday(newHoliday); setShowNewHoliday(false); setNewHoliday({ name: '', date: '', year: new Date().getFullYear() }); loadAll(); }
    catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const toggleUserStatus = async (id: string, current: boolean) => {
    await api.updateUserStatus(id, !current); loadAll();
  };

  const togglePeriod = async (id: string, isClosed: boolean) => {
    if (isClosed) await api.openPeriod(id); else await api.closePeriod(id);
    loadAll();
  };

  const saveSettings = async () => {
    setSaving(true);
    try { await api.updateAdminSettings(settings); alert('Settings saved.'); }
    catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleUnlock = async () => {
    if (!unlockModal || !unlockReason.trim()) return;
    setUnlockingId(unlockModal.timesheetId);
    try {
      await api.unlockTimesheet(unlockModal.timesheetId, unlockReason);
      setUnlockModal(null); setUnlockReason('');
      // Reload period timesheets
      const p = periods.find((p: any) => p.is_closed);
      if (p) { setPeriodTimesheets({}); await loadPeriodTimesheets(p.id); }
    } catch (err: any) { alert(err.message); }
    finally { setUnlockingId(null); }
  };

  const inputCls = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text_primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const selectCls = inputCls;
  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'users', label: 'Users', icon: Users },
    { key: 'departments', label: 'Departments', icon: Building2 },
    { key: 'projects', label: 'Projects', icon: Briefcase },
    { key: 'activities', label: 'Activities', icon: Activity },
    { key: 'periods', label: 'Periods', icon: Calendar },
    { key: 'holidays', label: 'Holidays', icon: CalendarDays },
    { key: 'settings', label: 'Settings', icon: Settings },
    { key: 'audit', label: 'Audit Log', icon: Activity },
    { key: 'reports', label: 'Reports', icon: FileText },
  ];

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text_primary">Administration</h1>
            <p className="text-sm text-text_secondary mt-1">System configuration, oversight, and controls.</p>
          </div>
        </div>

        {/* System Health Panel */}
        {health && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Active users', value: health.total_active_users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Open periods', value: health.open_periods, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Pending approvals', value: health.pending_approvals_org, color: health.pending_approvals_org > 0 ? 'text-amber-500' : 'text-text_secondary', bg: health.pending_approvals_org > 0 ? 'bg-amber-500/10' : 'bg-background' },
              { label: 'Finance queue depth', value: health.finance_review_queue_depth, color: health.finance_review_queue_depth > 0 ? 'text-red-500' : 'text-text_secondary', bg: health.finance_review_queue_depth > 0 ? 'bg-red-500/10' : 'bg-background' },
            ].map(item => (
              <div key={item.label} className={`rounded-xl border border-border p-4 ${item.bg}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text_secondary">{item.label}</p>
                <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-background/50 p-1 rounded-2xl border border-border w-fit mb-6 overflow-x-auto flex-wrap">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap
                ${activeTab === t.key ? 'bg-surface text-primary shadow-sm' : 'text-text_secondary hover:text-text_primary'}`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <>
              <div className="p-5 border-b border-border bg-background/30 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text_secondary" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
                    className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-text_primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                </div>
                <button onClick={() => setShowNewUser(true)} className="bg-primary text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" /> Add User
                </button>
              </div>
              {showNewUser && (
                <div className="p-5 border-b border-border bg-primary/5 space-y-4">
                  <h3 className="text-sm font-bold text-text_primary">New User</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input placeholder="Full Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className={inputCls} />
                    <input placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className={inputCls} />
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className={selectCls}>
                      <option value="user">User</option><option value="line_manager">Line Manager</option>
                      <option value="hod">Head of Department</option><option value="finance">Finance</option><option value="admin">Admin</option>
                    </select>
                    <select value={newUser.department_id} onChange={e => setNewUser({ ...newUser, department_id: e.target.value })} className={selectCls}>
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <select value={newUser.manager_id} onChange={e => setNewUser({ ...newUser, manager_id: e.target.value })} className={selectCls}>
                      <option value="">Select Manager</option>
                      {users.filter(u => ['line_manager', 'hod', 'admin'].includes(u.role)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-text_primary">
                      <input type="checkbox" checked={newUser.can_create_projects} onChange={e => setNewUser({ ...newUser, can_create_projects: e.target.checked })} className="accent-primary" />
                      Can create projects
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateUser} disabled={saving} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Create
                    </button>
                    <button onClick={() => setShowNewUser(false)} className="px-4 py-2 text-sm text-text_secondary hover:text-text_primary">Cancel</button>
                  </div>
                </div>
              )}
              {/* Edit User Modal */}
              <AnimatePresence>
                {editingUser && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-text_primary">Edit User — {editingUser.name}</h3>
                        <button onClick={() => setEditingUser(null)}><X className="h-5 w-5 text-text_secondary" /></button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                        <div><label className="text-xs font-bold text-text_secondary mb-1 block">Name</label>
                          <input value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} className={inputCls} /></div>
                        <div><label className="text-xs font-bold text-text_secondary mb-1 block">Email</label>
                          <input value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className={inputCls} /></div>
                        <div><label className="text-xs font-bold text-text_secondary mb-1 block">Role</label>
                          <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })} className={selectCls}>
                            <option value="user">User</option><option value="line_manager">Line Manager</option>
                            <option value="hod">Head of Department</option><option value="finance">Finance</option><option value="admin">Admin</option>
                          </select></div>
                        <div><label className="text-xs font-bold text-text_secondary mb-1 block">Department</label>
                          <select value={editingUser.department_id || ''} onChange={e => setEditingUser({ ...editingUser, department_id: e.target.value })} className={selectCls}>
                            <option value="">None</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select></div>
                        <div><label className="text-xs font-bold text-text_secondary mb-1 block">Manager</label>
                          <select value={editingUser.manager_id || ''} onChange={e => setEditingUser({ ...editingUser, manager_id: e.target.value })} className={selectCls}>
                            <option value="">None</option>
                            {users.filter(u => ['line_manager', 'hod', 'admin'].includes(u.role) && u.id !== editingUser.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select></div>
                        <div className="flex items-center gap-2 mt-1">
                          <input type="checkbox" id="can_create" checked={!!editingUser.can_create_projects} onChange={e => setEditingUser({ ...editingUser, can_create_projects: e.target.checked })} className="accent-primary" />
                          <label htmlFor="can_create" className="text-sm text-text_primary">Can create projects</label>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handleSaveEditUser} disabled={saving} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save Changes
                        </button>
                        <button onClick={() => setEditingUser(null)} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold text-text_secondary hover:bg-background">Cancel</button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-background/20 text-[10px] uppercase tracking-widest text-text_secondary font-bold border-b border-border">
                      <th className="px-5 py-4">Name</th><th className="px-5 py-4">Email</th><th className="px-5 py-4">Role</th>
                      <th className="px-5 py-4">Department</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredUsers.slice(0, 50).map(u => (
                      <tr key={u.id} className="hover:bg-background/30 transition-colors">
                        <td className="px-5 py-3 text-sm font-semibold text-text_primary">{u.name}</td>
                        <td className="px-5 py-3 text-xs text-text_secondary">{u.email}</td>
                        <td className="px-5 py-3"><span className="text-[10px] font-bold uppercase tracking-wider bg-background border border-border px-2 py-0.5 rounded">{u.role?.replace('_', ' ')}</span></td>
                        <td className="px-5 py-3 text-xs text-text_secondary">{u.department_name || '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${u.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right flex items-center justify-end gap-3">
                          <button onClick={() => setEditingUser({ ...u })} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                          <button onClick={() => toggleUserStatus(u.id, u.is_active)} className="text-xs font-semibold text-text_secondary hover:text-primary">
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 text-xs text-text_secondary text-center border-t border-border">
                  Showing {Math.min(filteredUsers.length, 50)} of {filteredUsers.length} users
                </div>
              </div>
            </>
          )}

          {/* DEPARTMENTS TAB */}
          {activeTab === 'departments' && (
            <>
              <div className="p-5 border-b border-border bg-background/30 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text_primary">Departments</h2>
                <button onClick={() => setShowNewDept(true)} className="bg-primary text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" /> New Department
                </button>
              </div>
              {showNewDept && (
                <div className="p-5 border-b border-border bg-primary/5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input placeholder="Department Name" value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })} className={inputCls} />
                    <input placeholder="Code (e.g. ENG)" value={newDept.code} onChange={e => setNewDept({ ...newDept, code: e.target.value.toUpperCase() })} className={inputCls} />
                    <select value={newDept.hod_id} onChange={e => setNewDept({ ...newDept, hod_id: e.target.value })} className={selectCls}>
                      <option value="">Select HoD</option>
                      {users.filter(u => u.role === 'hod' || u.role === 'line_manager').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateDept} disabled={saving} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold">Create</button>
                    <button onClick={() => setShowNewDept(false)} className="px-4 py-2 text-sm text-text_secondary">Cancel</button>
                  </div>
                </div>
              )}
              <AnimatePresence>
                {editingDept && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-text_primary">Edit Department</h3>
                        <button onClick={() => setEditingDept(null)}><X className="h-5 w-5 text-text_secondary" /></button>
                      </div>
                      <div className="space-y-3 mb-5">
                        <input placeholder="Name" value={editingDept.name} onChange={e => setEditingDept({ ...editingDept, name: e.target.value })} className={inputCls} />
                        <input placeholder="Code" value={editingDept.code} onChange={e => setEditingDept({ ...editingDept, code: e.target.value.toUpperCase() })} className={inputCls} />
                        <select value={editingDept.hod_id || ''} onChange={e => setEditingDept({ ...editingDept, hod_id: e.target.value })} className={selectCls}>
                          <option value="">Select HoD</option>
                          {users.filter(u => u.role === 'hod' || u.role === 'line_manager').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handleSaveEditDept} disabled={saving} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold">Save</button>
                        <button onClick={() => setEditingDept(null)} className="flex-1 border border-border rounded-xl py-2.5 text-sm text-text_secondary">Cancel</button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {departments.map((d, i) => (
                  <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="border border-border rounded-xl p-5 space-y-3 hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-text_primary">{d.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-background border border-border px-2 py-0.5 rounded uppercase">{d.code}</span>
                        <button onClick={() => setEditingDept({ ...d })} className="p-1 text-text_secondary hover:text-primary transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <p className="text-xs text-text_secondary">HoD: <span className="text-text_primary font-semibold">{d.hod_name || 'Not assigned'}</span></p>
                    <p className="text-xs text-text_secondary">{d.user_count} team members</p>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {/* PROJECTS TAB */}
          {activeTab === 'projects' && (
            <>
              <div className="p-5 border-b border-border bg-background/30 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text_primary">Projects</h2>
                <button onClick={() => setShowNewProject(true)} className="bg-primary text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" /> New Project
                </button>
              </div>
              {showNewProject && (
                <div className="p-5 border-b border-border bg-primary/5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <input placeholder="Project Name" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} className={inputCls} />
                    <input placeholder="Code" value={newProject.code} onChange={e => setNewProject({ ...newProject, code: e.target.value.toUpperCase() })} className={inputCls} />
                    <input placeholder="AFE Code (optional)" value={newProject.afe_code} onChange={e => setNewProject({ ...newProject, afe_code: e.target.value.toUpperCase() })} className={inputCls} />
                    <input type="number" placeholder="Max Hours/Week" value={newProject.max_hours_per_week} onChange={e => setNewProject({ ...newProject, max_hours_per_week: parseInt(e.target.value) })} className={inputCls} />
                    <select value={newProject.department_id} onChange={e => setNewProject({ ...newProject, department_id: e.target.value })} className={selectCls}>
                      <option value="">Department (optional)</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateProject} disabled={saving} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold">Create</button>
                    <button onClick={() => setShowNewProject(false)} className="px-4 py-2 text-sm text-text_secondary">Cancel</button>
                  </div>
                </div>
              )}
              <AnimatePresence>
                {editingProject && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-text_primary">Edit Project</h3>
                        <button onClick={() => setEditingProject(null)}><X className="h-5 w-5 text-text_secondary" /></button>
                      </div>
                      <div className="space-y-3 mb-5">
                        <input placeholder="Name" value={editingProject.name} onChange={e => setEditingProject({ ...editingProject, name: e.target.value })} className={inputCls} />
                        <input placeholder="Code" value={editingProject.code} onChange={e => setEditingProject({ ...editingProject, code: e.target.value.toUpperCase() })} className={inputCls} />
                        <input placeholder="AFE Code (optional)" value={editingProject.afe_code || ''} onChange={e => setEditingProject({ ...editingProject, afe_code: e.target.value.toUpperCase() })} className={inputCls} />
                        <input type="number" placeholder="Max hours/week" value={editingProject.max_hours_per_week} onChange={e => setEditingProject({ ...editingProject, max_hours_per_week: parseFloat(e.target.value) })} className={inputCls} />
                        <select value={editingProject.department_id || ''} onChange={e => setEditingProject({ ...editingProject, department_id: e.target.value })} className={selectCls}>
                          <option value="">No department</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <label className="flex items-center gap-2 text-sm text-text_primary">
                          <input type="checkbox" checked={!!editingProject.is_active} onChange={e => setEditingProject({ ...editingProject, is_active: e.target.checked })} className="accent-primary" />
                          Active
                        </label>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handleSaveEditProject} disabled={saving} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold">Save</button>
                        <button onClick={() => setEditingProject(null)} className="flex-1 border border-border rounded-xl py-2.5 text-sm text-text_secondary">Cancel</button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background/20 text-[10px] uppercase tracking-widest text-text_secondary font-bold border-b border-border">
                    <th className="px-5 py-4">Project</th><th className="px-5 py-4">Code</th><th className="px-5 py-4">Department</th>
                    <th className="px-5 py-4 text-center">Max Hours</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {projects.map(p => (
                    <tr key={p.id} className="hover:bg-background/30 transition-colors">
                      <td className="px-5 py-4 font-semibold text-sm text-text_primary">{p.name}</td>
                      <td className="px-5 py-4 text-xs text-text_secondary">{p.code}</td>
                      <td className="px-5 py-4 text-xs text-text_secondary">{p.department_name || '—'}</td>
                      <td className="px-5 py-4 text-center"><span className="font-bold text-text_primary bg-primary/5 px-3 py-1 rounded-lg border border-primary/10">{p.max_hours_per_week}h</span></td>
                      <td className="px-5 py-4"><span className={`${p.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500'} text-[10px] font-bold px-2 py-1 rounded uppercase`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => setEditingProject({ ...p })} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 ml-auto">
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* ACTIVITIES TAB */}
          {activeTab === 'activities' && (
            <>
              <div className="p-5 border-b border-border bg-background/30 flex items-center justify-between gap-4">
                <div className="flex gap-3 flex-wrap">
                  <select
                    value={activityProjectFilter}
                    onChange={e => {
                      setActivityProjectFilter(e.target.value);
                      api.getActivities(e.target.value || undefined).then(setActivities).catch(() => {});
                    }}
                    className={selectCls + ' w-auto'}
                  >
                    <option value="">All projects</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text_secondary" />
                    <input
                      value={activitySearch}
                      onChange={e => setActivitySearch(e.target.value)}
                      placeholder="Search activities…"
                      className={inputCls + ' pl-9 w-56'}
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowNewActivity(true)}
                  className="bg-primary text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-primary/20 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" /> New Activity
                </button>
              </div>
              {showNewActivity && (
                <div className="p-5 border-b border-border bg-primary/5 space-y-4">
                  <h3 className="text-sm font-bold text-text_primary">New Activity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={newActivity.project_id}
                      onChange={e => setNewActivity(a => ({ ...a, project_id: e.target.value }))}
                      className={selectCls}
                    >
                      <option value="">Select project…</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input
                      placeholder="Activity Name (e.g. Ebok Operations)"
                      value={newActivity.name}
                      onChange={e => setNewActivity(a => ({ ...a, name: e.target.value }))}
                      className={inputCls}
                    />
                    <input
                      placeholder="Code (e.g. EBOKOPS)"
                      value={newActivity.code}
                      onChange={e => setNewActivity(a => ({ ...a, code: e.target.value.toUpperCase() }))}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!newActivity.project_id || !newActivity.name || !newActivity.code) {
                          alert('Project, name, and code are required.');
                          return;
                        }
                        setSaving(true);
                        try {
                          await api.createActivity(newActivity);
                          const updated = await api.getActivities(activityProjectFilter || undefined);
                          setActivities(updated);
                          setNewActivity({ project_id: '', name: '', code: '' });
                          setShowNewActivity(false);
                        } catch (err: any) { alert(err.message); }
                        finally { setSaving(false); }
                      }}
                      disabled={saving}
                      className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Create
                    </button>
                    <button onClick={() => setShowNewActivity(false)} className="px-4 py-2 text-sm text-text_secondary hover:text-text_primary">Cancel</button>
                  </div>
                </div>
              )}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background/20 text-[10px] uppercase tracking-widest text-text_secondary font-bold border-b border-border">
                    <th className="px-5 py-4">Activity</th>
                    <th className="px-5 py-4">Code</th>
                    <th className="px-5 py-4">Project</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {activities
                    .filter(a =>
                      `${a.name} ${a.code} ${a.project_name}`.toLowerCase().includes(activitySearch.toLowerCase())
                    )
                    .map(act => (
                      <tr key={act.id} className="hover:bg-background/30 transition-colors">
                        <td className="px-5 py-3 font-semibold text-sm text-text_primary">{act.name}</td>
                        <td className="px-5 py-3 text-xs font-mono text-text_secondary">{act.code}</td>
                        <td className="px-5 py-3 text-xs text-text_secondary">{act.project_name}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${act.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500'}`}>
                            {act.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={async () => {
                              if (!confirm(`Deactivate "${act.name}"?`)) return;
                              await api.deleteActivity(act.id);
                              setActivities(prev => prev.filter(a => a.id !== act.id));
                            }}
                            className="text-xs font-semibold text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  {activities.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-text_secondary">
                        No activities yet. Create one above to allow employees to tag hours against specific work types.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {/* PERIODS TAB */}
          {activeTab === 'periods' && (
            <>
              <div className="p-5 border-b border-border bg-background/30 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text_primary">Accounting Periods</h2>
                <button onClick={() => setShowNewPeriod(true)} className="bg-primary text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" /> New Period
                </button>
              </div>
              {showNewPeriod && (
                <div className="p-5 border-b border-border bg-primary/5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input placeholder="Period Code (e.g. 2026-06)" value={newPeriod.period_code} onChange={e => setNewPeriod({ ...newPeriod, period_code: e.target.value })} className={inputCls} />
                    <input type="date" value={newPeriod.start_date} onChange={e => setNewPeriod({ ...newPeriod, start_date: e.target.value })} className={inputCls} />
                    <input type="date" value={newPeriod.end_date} onChange={e => setNewPeriod({ ...newPeriod, end_date: e.target.value })} className={inputCls} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreatePeriod} disabled={saving} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold">Create</button>
                    <button onClick={() => setShowNewPeriod(false)} className="px-4 py-2 text-sm text-text_secondary">Cancel</button>
                  </div>
                </div>
              )}
              {/* Unlock timesheet modal */}
              <AnimatePresence>
                {unlockModal?.open && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <Unlock className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-text_primary">Unlock Timesheet</h3>
                          <p className="text-xs text-text_secondary">This will allow the employee to edit and resubmit.</p>
                        </div>
                      </div>
                      <p className="text-xs text-text_secondary mb-3">Timesheet ID: <span className="font-mono font-semibold text-text_primary">{unlockModal.timesheetId}</span></p>
                      <textarea
                        value={unlockReason}
                        onChange={e => setUnlockReason(e.target.value)}
                        placeholder="Reason for unlock (required — this is logged in the audit trail)"
                        rows={3}
                        className={`w-full border rounded-xl p-3 text-sm text-text_primary resize-none focus:outline-none focus:ring-2 mb-5 ${!unlockReason.trim() ? 'border-amber-500 focus:ring-amber-500/50' : 'border-border focus:ring-primary/20'} bg-background`}
                      />
                      <div className="flex gap-3">
                        <button onClick={handleUnlock} disabled={!unlockReason.trim() || !!unlockingId}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                          {unlockingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />} Unlock
                        </button>
                        <button onClick={() => { setUnlockModal(null); setUnlockReason(''); }} className="flex-1 border border-border rounded-xl py-2.5 text-sm text-text_secondary">Cancel</button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-background/20 text-[10px] uppercase tracking-widest text-text_secondary font-bold border-b border-border">
                  <th className="px-5 py-4">Period</th><th className="px-5 py-4">Start</th><th className="px-5 py-4">End</th>
                  <th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-border/50">
                  {periods.map(p => (
                    <>
                      <tr key={p.id} className="hover:bg-background/30">
                        <td className="px-5 py-4 font-semibold text-sm text-text_primary">{p.period_code}</td>
                        <td className="px-5 py-4 text-xs text-text_secondary">{new Date(p.start_date).toLocaleDateString('en-GB')}</td>
                        <td className="px-5 py-4 text-xs text-text_secondary">{new Date(p.end_date).toLocaleDateString('en-GB')}</td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${p.is_closed ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {p.is_closed ? 'Closed' : 'Open'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right flex items-center justify-end gap-3">
                          {p.is_closed && (
                            <button onClick={async () => {
                              if (expandedPeriod === p.id) { setExpandedPeriod(null); return; }
                              setExpandedPeriod(p.id);
                              await loadPeriodTimesheets(p.id);
                            }} className="text-xs text-text_secondary hover:text-primary flex items-center gap-1">
                              {expandedPeriod === p.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} Timesheets
                            </button>
                          )}
                          <button onClick={() => togglePeriod(p.id, p.is_closed)} className="text-xs font-semibold text-primary hover:underline">
                            {p.is_closed ? 'Re-open' : 'Close'}
                          </button>
                        </td>
                      </tr>
                      {expandedPeriod === p.id && p.is_closed && (
                        <tr key={`${p.id}-ts`}>
                          <td colSpan={5} className="px-5 pb-4 bg-background/30">
                            <div className="border border-border rounded-xl overflow-hidden mt-2">
                              <div className="p-3 border-b border-border bg-background/50 flex items-center justify-between">
                                <p className="text-xs font-bold text-text_primary">Timesheets in {p.period_code}</p>
                                <span className="text-xs text-text_secondary">{(periodTimesheets[p.id] || []).length} timesheets</span>
                              </div>
                              {(periodTimesheets[p.id] || []).length === 0 ? (
                                <p className="p-4 text-xs text-text_secondary">No timesheets found.</p>
                              ) : (
                                <table className="w-full text-left text-xs">
                                  <thead><tr className="text-[10px] uppercase tracking-widest text-text_secondary bg-background/30 border-b border-border">
                                    <th className="px-4 py-2">Employee</th><th className="px-4 py-2">Week</th>
                                    <th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Unlock</th>
                                  </tr></thead>
                                  <tbody className="divide-y divide-border/30">
                                    {(periodTimesheets[p.id] || []).map((ts: any) => (
                                      <tr key={ts.id} className="hover:bg-background/20">
                                        <td className="px-4 py-2 font-semibold text-text_primary">{ts.user_name}</td>
                                        <td className="px-4 py-2 text-text_secondary">{new Date(ts.week_start_date).toLocaleDateString('en-GB')} – {new Date(ts.week_end_date).toLocaleDateString('en-GB')}</td>
                                        <td className="px-4 py-2">
                                          <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${ts.is_admin_unlocked ? 'bg-amber-500/10 text-amber-500' : ts.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500'}`}>
                                            {ts.is_admin_unlocked ? 'Unlocked' : ts.status}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                          {!ts.is_admin_unlocked ? (
                                            <button onClick={() => setUnlockModal({ timesheetId: ts.id, open: true })}
                                              className="text-[10px] font-semibold text-amber-500 hover:underline flex items-center gap-1 ml-auto">
                                              <Lock className="h-3 w-3" /> Unlock
                                            </button>
                                          ) : (
                                            <span className="text-[10px] text-emerald-500 font-semibold">Unlocked</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* HOLIDAYS TAB */}
          {activeTab === 'holidays' && (
            <>
              <div className="p-5 border-b border-border bg-background/30 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text_primary">Public Holidays</h2>
                <button onClick={() => setShowNewHoliday(true)} className="bg-primary text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" /> Add Holiday
                </button>
              </div>
              {showNewHoliday && (
                <div className="p-5 border-b border-border bg-primary/5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input placeholder="Holiday Name" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} className={inputCls} />
                    <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} className={inputCls} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateHoliday} disabled={saving} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold">Create</button>
                    <button onClick={() => setShowNewHoliday(false)} className="px-4 py-2 text-sm text-text_secondary">Cancel</button>
                  </div>
                </div>
              )}
              <div className="divide-y divide-border/50">
                {holidays.map(h => (
                  <div key={h.id} className="flex items-center justify-between px-5 py-4 hover:bg-background/30">
                    <div>
                      <p className="text-sm font-semibold text-text_primary">{h.name}</p>
                      <p className="text-xs text-text_secondary">{new Date(h.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <button onClick={async () => { await api.deleteHoliday(h.id); loadAll(); }} className="text-xs font-semibold text-red-500 hover:underline">Remove</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="p-6 space-y-8 max-w-2xl">
              <div>
                <h2 className="text-base font-bold text-text_primary mb-1">Hour Enforcement Rules</h2>
                <p className="text-xs text-text_secondary mb-5">Controls how the system responds when a user submits a timesheet with daily hours below the minimum.</p>
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-bold text-text_primary block mb-2">Minimum daily hours</label>
                    <input
                      type="number" min={1} max={24}
                      value={settings.min_daily_hours}
                      onChange={e => setSettings({ ...settings, min_daily_hours: e.target.value })}
                      className="w-32 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text_primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-xs text-text_secondary mt-1.5">Currently {settings.min_daily_hours} hours per working day.</p>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-text_primary block mb-3">Enforcement mode</label>
                    <div className="space-y-3">
                      {[
                        { value: 'block', label: 'Block', description: 'Submission is prevented until hours meet the minimum. Employee cannot submit.' },
                        { value: 'flag', label: 'Flag (require explanation)', description: 'Employee can submit but must provide a written explanation. Finance sees the flag.' },
                        { value: 'warn', label: 'Warn only', description: 'Employee sees a warning but can submit freely. No block or flag applied.' },
                      ].map(option => (
                        <label key={option.value} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${settings.hour_enforcement_mode === option.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-background/50'}`}>
                          <input
                            type="radio"
                            name="enforcement_mode"
                            value={option.value}
                            checked={settings.hour_enforcement_mode === option.value}
                            onChange={() => setSettings({ ...settings, hour_enforcement_mode: option.value })}
                            className="mt-0.5 accent-primary"
                          />
                          <div>
                            <p className={`text-sm font-bold ${settings.hour_enforcement_mode === option.value ? 'text-primary' : 'text-text_primary'}`}>{option.label}</p>
                            <p className="text-xs text-text_secondary mt-0.5">{option.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button onClick={saveSettings} disabled={saving}
                    className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 flex items-center gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AUDIT LOG TAB */}
          {activeTab === 'audit' && (
            <>
              <div className="p-5 border-b border-border bg-background/30 flex flex-wrap items-center gap-3">
                <h2 className="text-base font-bold text-text_primary mr-2">Audit Trail</h2>
                <input type="date" value={auditFilters.date_from} onChange={e => setAuditFilters(p => ({ ...p, date_from: e.target.value }))}
                  placeholder="From" className="input-base w-auto text-sm" />
                <input type="date" value={auditFilters.date_to} onChange={e => setAuditFilters(p => ({ ...p, date_to: e.target.value }))}
                  placeholder="To" className="input-base w-auto text-sm" />
                <input placeholder="Action filter…" value={auditFilters.action} onChange={e => setAuditFilters(p => ({ ...p, action: e.target.value }))}
                  className="input-base w-auto text-sm" />
                <button onClick={() => { setAuditOffset(0); loadAuditLog(); }} className="btn-outline text-sm py-2 flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
                <span className="ml-auto text-xs text-text_secondary">{auditTotal} total entries</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead><tr className="text-[10px] uppercase tracking-widest text-text_secondary border-b border-border bg-background/40">
                    <th className="px-5 py-4">Timestamp</th><th className="px-5 py-4">Actor</th>
                    <th className="px-5 py-4">Action</th><th className="px-5 py-4">Entity</th>
                    <th className="px-5 py-4">Description</th><th className="px-5 py-4">Reason</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {auditLog.map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-background/50 text-xs">
                        <td className="px-5 py-3 text-text_secondary whitespace-nowrap">{new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-5 py-3 font-semibold text-text_primary">{entry.actor_name}</td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-[10px] bg-background border border-border px-1.5 py-0.5 rounded">{entry.action}</span>
                        </td>
                        <td className="px-5 py-3 text-text_secondary">{entry.entity_type}{entry.entity_id ? `: ${entry.entity_id.slice(-8)}` : ''}</td>
                        <td className="px-5 py-3 text-text_secondary max-w-[200px] truncate">{entry.description}</td>
                        <td className="px-5 py-3 text-text_secondary max-w-[150px] truncate">{entry.reason || '—'}</td>
                      </tr>
                    ))}
                    {auditLog.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-text_secondary">No audit entries found.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-border flex items-center justify-between">
                <button onClick={() => setAuditOffset(Math.max(0, auditOffset - 50))} disabled={auditOffset === 0}
                  className="btn-outline text-xs py-1.5 disabled:opacity-40">Previous</button>
                <span className="text-xs text-text_secondary">Showing {auditOffset + 1}–{Math.min(auditOffset + 50, auditTotal)} of {auditTotal}</span>
                <button onClick={() => setAuditOffset(auditOffset + 50)} disabled={auditOffset + 50 >= auditTotal}
                  className="btn-outline text-xs py-1.5 disabled:opacity-40">Next</button>
              </div>
            </>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="p-6">
              <h2 className="text-base font-bold text-text_primary mb-1">Timesheets Not Posted</h2>
              <p className="text-xs text-text_secondary mb-5">Employees who have no submitted or approved timesheets within a given accounting period.</p>
              <div className="flex items-center gap-3 mb-5">
                <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value)} className="input-base w-auto">
                  <option value="">Select period</option>
                  {periods.map(p => <option key={p.id} value={p.period_code}>{p.period_code} ({p.is_closed ? 'Closed' : 'Open'})</option>)}
                </select>
                <button onClick={loadNotPosted} disabled={!reportPeriod} className="btn-solid text-sm py-2">Run Report</button>
              </div>
              {notPosted.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead><tr className="text-[10px] uppercase tracking-widest text-text_secondary border-b border-border bg-background/40">
                    <th className="px-5 py-3">Employee</th><th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Manager</th><th className="px-5 py-3">Last Submitted</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {notPosted.map((u: any) => (
                      <tr key={u.id} className="hover:bg-background/50">
                        <td className="px-5 py-3 font-semibold text-sm text-text_primary">{u.name}</td>
                        <td className="px-5 py-3 text-xs text-text_secondary">{u.department_name || '—'}</td>
                        <td className="px-5 py-3 text-xs text-text_secondary">{u.manager_name || '—'}</td>
                        <td className="px-5 py-3 text-xs text-text_secondary">{u.last_submitted ? new Date(u.last_submitted).toLocaleDateString('en-GB') : 'Never'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : reportPeriod ? (
                <div className="flex items-center gap-3 p-5 rounded-xl border border-border bg-background/50">
                  <AlertTriangle className="h-5 w-5 text-text_secondary" />
                  <p className="text-sm text-text_secondary">No non-submitters found for this period, or report not yet run.</p>
                </div>
              ) : null}
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
