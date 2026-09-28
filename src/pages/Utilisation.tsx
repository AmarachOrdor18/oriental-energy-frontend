import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { Activity, RefreshCw, Search } from 'lucide-react';
import { api } from '../lib/api';
import { TableToolbar, TablePagination, SortableTh, useTableControls } from '../components/ui/TableControls';

interface UtilRow {
  user_id: string;
  name: string;
  role: string;
  department_name: string | null;
  capacity_hours: number;
  logged_hours: number;
  utilisation_pct: number;
  projects: { project_id: string; project_name: string; project_code: string; hours: number }[];
}

export default function Utilisation() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dept, setDept] = useState('');
  const [rows, setRows] = useState<UtilRow[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    api.getDepartments().then((d) => setDepts(d)).catch(() => {});
  }, []);

  // Guided tour lands on this page with the flag set: run the report once so
  // the tables are on screen when the tour spotlights them.
  useEffect(() => {
    if (sessionStorage.getItem('oe_tour_autorun_util') === '1') {
      sessionStorage.removeItem('oe_tour_autorun_util');
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setIsLoading(true); setError(''); setHasRun(false);
    try {
      const params: Record<string, string> = { year: String(year), month: String(month) };
      if (dept) params.department_id = dept;
      const data = await api.getUtilisation(params);
      setRows(data.rows || []);
      setHasRun(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load utilisation.');
    } finally {
      setIsLoading(false);
    }
  };

  // run once on mount
  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, []);

  const table = useTableControls(rows as any as Record<string, any>[], 10);

  const deptSummary = useMemo(() => {
    const map = new Map<string, { name: string; capacity: number; logged: number; n: number }>();
    rows.forEach((r) => {
      const key = r.department_name || 'N/A';
      const d = map.get(key) || { name: key, capacity: 0, logged: 0, n: 0 };
      d.capacity += r.capacity_hours; d.logged += r.logged_hours; d.n += 1;
      map.set(key, d);
    });
    return Array.from(map.values()).map((d) => ({
      ...d,
      pct: d.capacity > 0 ? Math.round((d.logged / d.capacity) * 1000) / 10 : 0,
    }));
  }, [rows]);

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });

  const band = (pct: number) => {
    if (pct >= 85) return { cls: 'bg-success-light text-success-text border border-success/30', label: 'Healthy' };
    if (pct >= 60) return { cls: 'bg-gold-100 text-gold-600 border border-gold-400/40', label: 'Monitor' };
    return { cls: 'bg-danger/10 text-danger border border-danger/30', label: 'Capacity gap' };
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text_primary flex items-center gap-2">
            <Activity className="w-6 h-6 text-teal-600" /> Utilisation
          </h1>
          <p className="text-sm text-text_secondary mt-1">
            Hours logged against available capacity | working days × standard hours, less public holidays and recorded leave.
          </p>
        </div>

        {/* Filters */}
        <div className="section-card p-5 mb-6" data-tour="util-filters">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="field-label">Month</label>
              <select className="input-base w-full" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString('en-GB', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Year</label>
              <select className="input-base w-full" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Department</label>
              <select className="input-base w-full" value={dept} onChange={(e) => setDept(e.target.value)}>
                <option value="">All departments</option>
                {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <button className="btn-solid" onClick={fetchData} disabled={isLoading}>
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Run
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-danger font-semibold mb-4">{error}</p>}

        {/* Department summary — compact strip (scales with any number of departments) */}
        {hasRun && deptSummary.length > 0 && (
          <div className="section-card mb-6" data-tour="util-dept-table">
            <div className="p-5 border-b border-border">
              <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider">By Department | {monthName}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text_secondary uppercase tracking-wider">
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3 text-right">People</th>
                    <th className="px-5 py-3 text-right">Capacity</th>
                    <th className="px-5 py-3 text-right">Logged</th>
                    <th className="px-5 py-3">Utilisation</th>
                  </tr>
                </thead>
                <tbody>
                  {deptSummary.map((d) => (
                    <tr key={d.name} className="border-b border-border hover:bg-teal-50/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-text_primary">{d.name}</td>
                      <td className="px-5 py-3 text-right text-text_secondary">{d.n}</td>
                      <td className="px-5 py-3 text-right text-text_secondary">{Math.round(d.capacity)}h</td>
                      <td className="px-5 py-3 text-right text-text_primary">{Math.round(d.logged)}h</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-28 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-full rounded-full ${d.pct >= 85 ? 'bg-success' : d.pct >= 60 ? 'bg-gold-500' : 'bg-danger'}`}
                              style={{ width: `${Math.min(100, d.pct)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-text_primary">{d.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Person rows */}
        {hasRun && (
          <div className="section-card" data-tour="util-person-table">
            <div className="p-5 border-b border-border">
              <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider">By Person | {monthName}</h2>
              <p className="text-xs text-text_secondary mt-1">Capacity uses an 8-hour standard day. Leave and holidays already removed.</p>
            </div>
            <div className="px-5 pb-4">
              <TableToolbar
                searchValue={table.search}
                onSearchChange={table.setSearch}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text_secondary uppercase tracking-wider">
                    <SortableTh label="Name" k="name" sortKey={table.sortKey} onSort={table.toggleSort} />
                    <SortableTh label="Department" k="department_name" sortKey={table.sortKey} onSort={table.toggleSort} />
                    <th className="px-5 py-3 text-right">Capacity</th>
                    <SortableTh label="Logged" k="logged_hours" sortKey={table.sortKey} onSort={table.toggleSort} className="text-right" />
                    <SortableTh label="Utilisation" k="utilisation_pct" sortKey={table.sortKey} onSort={table.toggleSort} className="text-right" />
                    <th className="px-5 py-3">Top projects</th>
                  </tr>
                </thead>
                <tbody>
                  {table.paged.map((r: any) => {
                    const b = band(r.utilisation_pct);
                    return (
                      <tr key={r.user_id} className="border-b border-border hover:bg-teal-50/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-text_primary">{r.name}</td>
                        <td className="px-5 py-3 text-text_secondary">{r.department_name || 'N/A'}</td>
                        <td className="px-5 py-3 text-right text-text_secondary">{Math.round(r.capacity_hours)}h</td>
                        <td className="px-5 py-3 text-right text-text_primary font-medium">{Math.round(r.logged_hours)}h</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${b.cls}`}>
                            {r.utilisation_pct}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-text_secondary text-xs">
                          {r.projects.slice(0, 3).map((p: any) => `${p.project_name} (${Math.round(p.hours)}h)`).join(' · ') || 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                  {table.paged.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-text_secondary">No data for this month.</td></tr>
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
        )}
      </div>
    </DashboardLayout>
  );
}
