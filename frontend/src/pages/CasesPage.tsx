import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import DataTable from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatRelativeTime } from '../lib/utils';
import { Search, Plus, X, FolderOpen, AlertTriangle, ShieldCheck, Clock, Filter, TrendingUp } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_customer', label: 'Pending Customer' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function CasesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', severity: '', priority: '', search: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCase, setNewCase] = useState({ customer_id: '', title: '', description: '', severity: 'medium', priority: 'P3', case_type: 'incident' });

  const queryParams = new URLSearchParams({ page: String(page), limit: '50', ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)) });

  const { data, isLoading } = useQuery({
    queryKey: ['cases', page, filters],
    queryFn: () => api.get(`/cases?${queryParams}`).then(r => r.data),
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then(r => r.data),
    enabled: showCreateModal,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/cases', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setShowCreateModal(false);
      navigate(`/cases/${res.data.case_id}`);
    },
  });

  const columns = [
    { key: 'case_number', header: 'Case #', render: (c: any) => <span className="font-mono font-medium text-primary-600 dark:text-primary-400">{c.case_number}</span> },
    { key: 'severity', header: 'Severity', render: (c: any) => <SeverityBadge severity={c.severity} /> },
    { key: 'priority', header: 'Priority', render: (c: any) => <span className={`font-medium ${c.priority === 'P1' ? 'text-red-600 dark:text-red-400' : c.priority === 'P2' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>{c.priority}</span> },
    { key: 'title', header: 'Title', render: (c: any) => (
      <div className="max-w-sm">
        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{c.customer_name}</p>
      </div>
    )},
    { key: 'status', header: 'Status', render: (c: any) => <StatusBadge status={c.status} /> },
    { key: 'assigned', header: 'Analyst', render: (c: any) => c.analyst_first_name ? <span className="dark:text-gray-300">{`${c.analyst_first_name} ${c.analyst_last_name}`}</span> : <span className="text-gray-400 dark:text-gray-500">Unassigned</span> },
    { key: 'sla', header: 'SLA', render: (c: any) => (
      (c.sla_response_breached || c.sla_resolution_breached)
        ? <span className="text-xs font-medium text-red-600 dark:text-red-400">Breached</span>
        : <span className="text-xs text-green-600 dark:text-green-400">On Track</span>
    )},
    { key: 'updated_at', header: 'Updated', render: (c: any) => <span className="text-xs text-gray-500 dark:text-gray-400">{formatRelativeTime(c.updated_at)}</span> },
  ];

  const canCreate = user && ['analyst', 'manager', 'admin'].includes(user.role);

  // Compute summary stats from loaded data
  const stats = useMemo(() => {
    const cases = data?.data || [];
    const total = data?.pagination?.total || cases.length;
    const openCount = cases.filter((c: any) => !['resolved', 'closed'].includes(c.status)).length;
    const criticalCount = cases.filter((c: any) => c.severity === 'critical').length;
    const slaBreached = cases.filter((c: any) => c.sla_response_breached || c.sla_resolution_breached).length;
    return { total, openCount, criticalCount, slaBreached };
  }, [data]);

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(v => v).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gradient Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-6 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <FolderOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Cases</h1>
              <p className="text-sm text-primary-100">
                {data?.pagination?.total != null
                  ? `${data.pagination.total} total cases`
                  : 'Loading cases...'}
              </p>
            </div>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30 hover:shadow-lg"
            >
              <Plus className="h-4 w-4" /> New Case
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Cases"
          value={stats.total}
          icon={FolderOpen}
          gradient="from-blue-500 to-blue-600"
          bgLight="bg-blue-50"
          bgDark="dark:bg-blue-950/30"
          textColor="text-blue-700 dark:text-blue-300"
        />
        <StatCard
          title="Open"
          value={stats.openCount}
          icon={TrendingUp}
          gradient="from-emerald-500 to-emerald-600"
          bgLight="bg-emerald-50"
          bgDark="dark:bg-emerald-950/30"
          textColor="text-emerald-700 dark:text-emerald-300"
        />
        <StatCard
          title="Critical"
          value={stats.criticalCount}
          icon={AlertTriangle}
          gradient="from-red-500 to-red-600"
          bgLight="bg-red-50"
          bgDark="dark:bg-red-950/30"
          textColor="text-red-700 dark:text-red-300"
          pulse={stats.criticalCount > 0}
        />
        <StatCard
          title="SLA Breached"
          value={stats.slaBreached}
          icon={Clock}
          gradient="from-amber-500 to-orange-600"
          bgLight="bg-amber-50"
          bgDark="dark:bg-amber-950/30"
          textColor="text-amber-700 dark:text-amber-300"
          pulse={stats.slaBreached > 0}
        />
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800">
        {/* Filter header with badge */}
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600">
            <Filter className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setFilters({ status: '', severity: '', priority: '', search: '' }); setPage(1); }}
              className="ml-auto text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Search and dropdown filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-primary-400 to-primary-600">
              <Search className="h-3 w-3 text-white" />
            </div>
            <input
              type="text"
              placeholder="Search cases..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-primary-500 dark:focus:bg-dark-800"
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
            />
          </div>
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 transition-all focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-gray-300 dark:focus:border-primary-500 dark:focus:bg-dark-800"
            value={filters.status}
            onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="new">New</option><option value="assigned">Assigned</option><option value="in_progress">In Progress</option>
            <option value="pending_customer">Pending Customer</option><option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option><option value="closed">Closed</option>
          </select>
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 transition-all focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-gray-300 dark:focus:border-primary-500 dark:focus:bg-dark-800"
            value={filters.severity}
            onChange={e => { setFilters(f => ({ ...f, severity: e.target.value })); setPage(1); }}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option><option value="high">High</option>
            <option value="medium">Medium</option><option value="low">Low</option>
          </select>
          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 transition-all focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-gray-300 dark:focus:border-primary-500 dark:focus:bg-dark-800"
            value={filters.priority}
            onChange={e => { setFilters(f => ({ ...f, priority: e.target.value })); setPage(1); }}
          >
            <option value="">All Priorities</option>
            <option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option>
          </select>
        </div>

        {/* Status Quick-Filter Pills */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => { setFilters(f => ({ ...f, status: '' })); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              filters.status === ''
                ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-400 dark:bg-primary-900/40 dark:text-primary-300 dark:ring-primary-500'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-700 dark:text-gray-400 dark:hover:bg-dark-600'
            }`}
          >
            All
          </button>
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setFilters(f => ({ ...f, status: f.status === opt.value ? '' : opt.value })); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                filters.status === opt.value
                  ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-400 dark:bg-primary-900/40 dark:text-primary-300 dark:ring-primary-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-700 dark:text-gray-400 dark:hover:bg-dark-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={data?.data || []} pagination={data?.pagination} onPageChange={setPage}
        onRowClick={(c: any) => navigate(`/cases/${c.case_id}`)} loading={isLoading} emptyMessage="No cases found" />

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60 dark:bg-black/80">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-dark-700 dark:bg-dark-800">
            {/* Gradient Modal Header */}
            <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-primary-600 to-primary-700 p-6">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Create New Case</h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(newCase); }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer</label>
                <select className="input-field" required value={newCase.customer_id} onChange={e => setNewCase(c => ({ ...c, customer_id: e.target.value }))}>
                  <option value="">Select customer...</option>
                  {customers?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input type="text" className="input-field" required value={newCase.title} onChange={e => setNewCase(c => ({ ...c, title: e.target.value }))} placeholder="Case title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea className="input-field" rows={3} value={newCase.description} onChange={e => setNewCase(c => ({ ...c, description: e.target.value }))} placeholder="Describe the incident..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
                  <select className="input-field" value={newCase.severity} onChange={e => setNewCase(c => ({ ...c, severity: e.target.value }))}>
                    <option value="critical">Critical</option><option value="high">High</option>
                    <option value="medium">Medium</option><option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select className="input-field" value={newCase.priority} onChange={e => setNewCase(c => ({ ...c, priority: e.target.value }))}>
                    <option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select className="input-field" value={newCase.case_type} onChange={e => setNewCase(c => ({ ...c, case_type: e.target.value }))}>
                    <option value="incident">Incident</option><option value="investigation">Investigation</option>
                    <option value="service_request">Service Request</option><option value="false_positive">False Positive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Stat Card Component ---------- */
function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  bgLight,
  bgDark,
  textColor,
  pulse,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  bgLight: string;
  bgDark: string;
  textColor: string;
  pulse?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-gray-200 ${bgLight} ${bgDark} p-4 shadow-sm transition-all hover:shadow-md dark:border-dark-700`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className={`mt-1 text-2xl font-bold ${textColor}`}>{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg ${pulse ? 'animate-pulse-glow' : ''}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}
