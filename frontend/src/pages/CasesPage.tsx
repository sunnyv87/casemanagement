import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import DataTable from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatRelativeTime } from '../lib/utils';
import { Search, Plus, X } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cases</h1>
        {canCreate && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Case
          </button>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Search cases..." className="input-field pl-10" value={filters.search}
                onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} />
            </div>
          </div>
          <select className="input-field w-auto" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="new">New</option><option value="assigned">Assigned</option><option value="in_progress">In Progress</option>
            <option value="pending_customer">Pending Customer</option><option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option><option value="closed">Closed</option>
          </select>
          <select className="input-field w-auto" value={filters.severity} onChange={e => { setFilters(f => ({ ...f, severity: e.target.value })); setPage(1); }}>
            <option value="">All Severities</option>
            <option value="critical">Critical</option><option value="high">High</option>
            <option value="medium">Medium</option><option value="low">Low</option>
          </select>
          <select className="input-field w-auto" value={filters.priority} onChange={e => { setFilters(f => ({ ...f, priority: e.target.value })); setPage(1); }}>
            <option value="">All Priorities</option>
            <option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option>
          </select>
        </div>
      </div>

      <DataTable columns={columns} data={data?.data || []} pagination={data?.pagination} onPageChange={setPage}
        onRowClick={(c: any) => navigate(`/cases/${c.case_id}`)} loading={isLoading} emptyMessage="No cases found" />

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl dark:border dark:border-dark-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-dark-700">
              <h2 className="text-xl font-semibold dark:text-gray-100">Create New Case</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="h-5 w-5" /></button>
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
