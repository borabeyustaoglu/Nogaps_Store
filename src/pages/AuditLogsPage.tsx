import { useMemo, useState } from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { readAuditLogs } from '../utils/auditLog';
import type { AuditLog } from '../types/audit';
import { STORAGE_KEYS } from '../constants/storage';

const STORAGE_KEY = STORAGE_KEYS.auditLogs;

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>(readAuditLogs);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const moduleMatch = moduleFilter === 'all' || log.module === moduleFilter;
      const q = query.trim().toLowerCase();
      const queryMatch =
        q.length === 0 ||
        log.action.toLowerCase().includes(q) ||
        log.detail.toLowerCase().includes(q);
      return moduleMatch && queryMatch;
    });
  }, [logs, moduleFilter, query]);

  const clearLogs = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLogs([]);
  };

  return (
    <AppShell title="Audit Logs" subtitle="Urun ve sepet islem gecmisini izle">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 mb-6 animate-fade-up" style={{ opacity: 0 }}>
        <div className="flex flex-col md:flex-row gap-3">
          <select
            id="audit-module-filter"
            name="moduleFilter"
            value={moduleFilter}
            onChange={(event) => setModuleFilter(event.target.value)}
            className="rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
          >
            <option value="all">All modules</option>
            <option value="products">Products</option>
            <option value="cart">Cart</option>
            <option value="auth">Auth</option>
            <option value="system">System</option>
          </select>
          <input
            id="audit-search-query"
            name="query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search action or detail"
            className="flex-1 rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
          />
          <button
            onClick={clearLogs}
            disabled={logs.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 hover:border-red-500/30 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-slate-200 transition-all duration-150"
          >
            <Trash2 size={14} />
            Clear logs
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden animate-fade-up" style={{ animationDelay: '0.06s', opacity: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-black/50">
              <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Detail</th>
                <th className="px-4 py-3">Icon</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No logs found.
                  </td>
                </tr>
              )}
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-t border-slate-800/70 hover:bg-slate-800/20 transition-colors duration-150">
                  <td className="px-4 py-3 text-slate-300">
                    {new Date(log.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-brand-500/20 bg-brand-500/10 px-2.5 py-1 text-xs text-brand-300">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-medium">{log.action}</td>
                  <td className="px-4 py-3 text-slate-400">{log.detail}</td>
                  <td className="px-4 py-3 text-brand-300">
                    <ShieldCheck size={15} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
};
