import { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { useAuth } from '../lib/auth';
import { Target, Pencil, Check, X } from 'lucide-react';
import { api } from '../lib/api';
import { TableToolbar, TablePagination, SortableTh, useTableControls } from '../components/ui/TableControls';

export default function Budgets() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [deptOptions, setDeptOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editHours, setEditHours] = useState('');
  const [editCost, setEditCost] = useState('');

  const load = async () => {
    setIsLoading(true);
    try {
      // Unfiltered (server still scopes HODs): rollup + dropdown options stay stable.
      const base = await api.getBudgets({ year: String(year) });
      setDepts(base.departments || []);
      setDeptOptions(base.departments || []);
      if (deptFilter) {
        const f = await api.getBudgets({ year: String(year), department_id: deptFilter });
        setRows(f.rows || []);
      } else {
        setRows(base.rows || []);
      }
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load budgets.');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { load(); }, [year, deptFilter]);

  const table = useTableControls(rows as any, 10);

  const startEdit = (r: any) => {
    setEditing(r.project_id);
    setEditHours(r.budgeted_hours ? String(r.budgeted_hours) : '');
    setEditCost(r.budgeted_cost ? String(r.budgeted_cost) : '');
  };
  const saveEdit = async (projectId: string) => {
    try {
      await api.setBudget(projectId, {
        year,
        budgeted_hours: parseFloat(editHours) || 0,
        budgeted_cost: editCost ? parseFloat(editCost) : null,
      });
      setEditing(null);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to save budget.');
    }
  };

  const statusBadge = (status: string, burn: number | null) => {
    if (status === 'no_budget') return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-navy-100 text-navy-700">No budget</span>;
    if (status === 'over') return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-danger/10 text-danger">Over · {burn}%</span>;
    if (status === 'watch') return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-gold-100 text-gold-600">Watch · {burn}%</span>;
    return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-success_light text-success_text">Healthy · {burn}%</span>;
  };

  const deptBadge = (status: string, burn: number | null) => {
    if (status === 'no_budget') return <span className="text-xs font-bold text-text_secondary">No budget set</span>;
    if (status === 'over') return <span className="text-xs font-bold text-danger">Over · {burn}%</span>;
    if (status === 'watch') return <span className="text-xs font-bold text-gold-600">Watch · {burn}%</span>;
    return <span className="text-xs font-bold text-success_text">Healthy · {burn}%</span>;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text_primary flex items-center gap-2">
              <Target className="w-6 h-6 text-teal-600" /> Project Budgets
            </h1>
            <p className="text-sm text-text_secondary mt-1">
              Budgeted hours against actual burn | visible while the period is still open.
            </p>
          </div>
          <select className="input-base w-32" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[0, 1, 2].map((i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          {isAdmin && (
            <select className="input-base w-44" value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">All departments</option>
              {deptOptions.filter((d: any) => d.department_id).map((d: any) => (
                <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
              ))}
            </select>
          )}
        </div>

        {error && <p className="text-sm text-danger font-semibold mb-4">{error}</p>}

        {/* ── Department burn — compact table (scales with any number of departments) ── */}
        {depts.length > 0 && (
          <div className="section-card mb-6" data-tour="budget-dept-table">
            <div className="p-5 border-b border-border">
              <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider">Budget burn by department | {year}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text_secondary uppercase tracking-wider">
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3 text-right">Projects</th>
                    <th className="px-5 py-3 text-right">Budget (hrs)</th>
                    <th className="px-5 py-3 text-right">Burned (hrs)</th>
                    <th className="px-5 py-3">Burn</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {depts.map((d: any) => (
                    <tr key={d.department_name}
                      onClick={() => isAdmin && d.department_id && setDeptFilter(deptFilter === d.department_id ? '' : d.department_id)}
                      className={`border-b border-border transition-colors ${isAdmin && d.department_id ? 'cursor-pointer hover:bg-teal-50/50' : ''} ${isAdmin && deptFilter === d.department_id ? 'bg-teal-50/60' : ''}`}>
                      <td className="px-5 py-3 font-medium text-text_primary">{d.department_name}</td>
                      <td className="px-5 py-3 text-right text-text_secondary">{d.projects}</td>
                      <td className="px-5 py-3 text-right text-text_secondary">{d.budgeted_hours > 0 ? Math.round(d.budgeted_hours) : 'N/A'}</td>
                      <td className="px-5 py-3 text-right text-text_primary">{Math.round(d.logged_hours)}h</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-28 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-full rounded-full ${d.status === 'over' ? 'bg-danger' : d.status === 'watch' ? 'bg-gold-500' : 'bg-success'}`}
                              style={{ width: `${Math.min(100, d.burn_pct ?? 0)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-text_primary">{d.burn_pct != null ? `${d.burn_pct}%` : ''}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">{deptBadge(d.status, d.burn_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="section-card" data-tour="budget-project-table">
          <div className="p-5 border-b border-border">
            <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider">Budget vs Actual | {year}</h2>
          </div>
          <div className="px-5 pb-4">
            <TableToolbar searchValue={table.search} onSearchChange={table.setSearch} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text_secondary uppercase tracking-wider">
                  <SortableTh label="Project" k="project_name" sortKey={table.sortKey} onSort={table.toggleSort} />
                  <SortableTh label="Department" k="department_name" sortKey={table.sortKey} onSort={table.toggleSort} />
                  <th className="px-5 py-3 text-right">Budget (hrs)</th>
                  <SortableTh label="Burned (hrs)" k="logged_hours" sortKey={table.sortKey} onSort={table.toggleSort} className="text-right" />
                  <th className="px-5 py-3 text-right">Remaining</th>
                  <th className="px-5 py-3">Status</th>
                  {isAdmin && <th className="px-5 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {table.paged.map((r: any) => (
                  <tr key={r.project_id} className="border-b border-border hover:bg-teal-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-medium text-text_primary">{r.project_name}</span>
                      <span className="text-xs text-text_secondary ml-2">{r.project_code}</span>
                    </td>
                    <td className="px-5 py-3 text-text_secondary">{r.department_name || 'N/A'}</td>
                    {editing === r.project_id ? (
                      <>
                        <td className="px-5 py-3 text-right">
                          <input type="number" min="0" className="input-base w-24 text-right" value={editHours} onChange={(e) => setEditHours(e.target.value)} autoFocus />
                        </td>
                        <td className="px-5 py-3 text-right text-text_secondary">{Math.round(r.logged_hours)}h</td>
                        <td className="px-5 py-3 text-right text-text_secondary">{r.budgeted_hours ? `${Math.round(r.remaining_hours)}h` : 'N/A'}</td>
                        <td className="px-5 py-3">{statusBadge(r.status, r.burn_pct)}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <button onClick={() => saveEdit(r.project_id)} className="p-1.5 text-success-text hover:bg-success_light rounded-lg" title="Save"><Check className="h-4 w-4" /></button>
                          <button onClick={() => setEditing(null)} className="p-1.5 text-text_secondary hover:bg-surface rounded-lg" title="Cancel"><X className="h-4 w-4" /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3 text-right text-text_primary font-medium">{r.budgeted_hours ? Math.round(r.budgeted_hours) : 'N/A'}</td>
                        <td className="px-5 py-3 text-right text-text_primary">{Math.round(r.logged_hours)}h</td>
                        <td className="px-5 py-3 text-right text-text_secondary">{r.budgeted_hours ? `${Math.round(r.remaining_hours)}h` : 'N/A'}</td>
                        <td className="px-5 py-3">{statusBadge(r.status, r.burn_pct)}</td>
                        {isAdmin && (
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => startEdit(r)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg" title="Edit budget"><Pencil className="h-4 w-4" /></button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
                {!isLoading && table.paged.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-text_secondary">No active projects.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={table.page}
            totalPages={table.totalPages}
            totalItems={table.totalItems}
            pageSize={table.pageSize}
            onPage={table.setPage}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
