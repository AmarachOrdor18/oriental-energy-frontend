import { useState, useEffect } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { Banknote, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { TableToolbar, TablePagination, useTableControls } from '../components/ui/TableControls';

export default function RateCards() {
  const [cards, setCards] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const table = useTableControls(cards as any, 10);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // form state
  const [grade, setGrade] = useState('STAFF');
  const [projectId, setProjectId] = useState('');
  const [costRate, setCostRate] = useState('');
  const [chargeRate, setChargeRate] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState('');

  const load = async () => {
    setIsLoading(true);
    try {
      const [c, p] = await Promise.all([api.getRateCards(), api.getProjects()]);
      setCards(c); setProjects(p);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load rate cards.');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.createRateCard({
        grade,
        project_id: projectId || null,
        cost_rate: parseFloat(costRate),
        charge_rate: chargeRate ? parseFloat(chargeRate) : parseFloat(costRate),
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
      });
      setShowForm(false); setCostRate(''); setChargeRate('');
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to create rate card.');
    }
  };

  const deactivate = async (id: string) => {
    try { await api.deactivateRateCard(id); load(); }
    catch (err: any) { setError(err.message); }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text_primary flex items-center gap-2">
              <Banknote className="w-6 h-6 text-teal-600" /> Rate Cards
            </h1>
            <p className="text-sm text-text_secondary mt-1">
              Cost and charge rates per grade and project. Effective-dated: changes never rewrite history.
            </p>
          </div>
          <button className="btn-solid" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> Add Rate Card
          </button>
        </div>

        {error && <p className="text-sm text-danger font-semibold mb-4">{error}</p>}

        {showForm && (
          <form onSubmit={submit} className="section-card p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="field-label">Grade <span className="text-danger">*</span></label>
                <select className="input-base w-full" value={grade} onChange={(e) => setGrade(e.target.value)}>
                  <option value="STAFF">STAFF</option>
                  <option value="MANAGEMENT">MANAGEMENT</option>
                </select>
              </div>
              <div>
                <label className="field-label">Project</label>
                <select className="input-base w-full" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">All projects</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Cost rate (₦/hour) <span className="text-danger">*</span></label>
                <input type="number" step="0.01" min="0" className="input-base w-full" value={costRate} onChange={(e) => setCostRate(e.target.value)} required />
              </div>
              <div>
                <label className="field-label">Charge rate (₦/hour)</label>
                <input type="number" step="0.01" min="0" className="input-base w-full" value={chargeRate} onChange={(e) => setChargeRate(e.target.value)} placeholder="Defaults to cost rate" />
              </div>
              <div>
                <label className="field-label">Effective from <span className="text-danger">*</span></label>
                <input type="date" className="input-base w-full" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
              </div>
              <div>
                <label className="field-label">Effective to</label>
                <input type="date" className="input-base w-full" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-solid">Save Rate Card</button>
            </div>
          </form>
        )}

        <div className="section-card">
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider">All Rate Cards</h2>
              <button className="btn-outline text-xs py-2" onClick={load} disabled={isLoading}>
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            <TableToolbar searchValue={table.search} onSearchChange={table.setSearch} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text_secondary uppercase tracking-wider">
                  <th className="px-5 py-3">Grade</th>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3 text-right">Cost (₦/hr)</th>
                  <th className="px-5 py-3 text-right">Charge (₦/hr)</th>
                  <th className="px-5 py-3">Effective</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {table.paged.map((c: any) => (
                  <tr key={c.id} className="border-b border-border hover:bg-teal-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-text_primary">{c.grade}</td>
                    <td className="px-5 py-3 text-text_secondary">{c.project_name || 'All projects'}</td>
                    <td className="px-5 py-3 text-right">{Number(c.cost_rate).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right">{Number(c.charge_rate).toLocaleString()}</td>
                    <td className="px-5 py-3 text-text_secondary text-xs">{c.effective_from?.slice(0, 10)} → {c.effective_to?.slice(0, 10) || 'open'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${c.is_active ? 'bg-success_light text-success_text' : 'bg-danger/10 text-danger'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {c.is_active && (
                        <button onClick={() => deactivate(c.id)} title="Deactivate" className="p-1.5 text-danger hover:bg-danger/10 rounded-lg">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!isLoading && table.paged.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-text_secondary">
                    No rate cards yet | add one to turn hours into money values.
                  </td></tr>
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
