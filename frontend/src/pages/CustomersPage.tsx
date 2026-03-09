import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import DataTable from '../components/DataTable';
import { Search, Plus, Building2, X } from 'lucide-react';

const INDUSTRY_BADGE_COLORS: Record<string, string> = {
  BFSI: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Manufacturing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Healthcare: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Government: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'Critical Infrastructure': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'IT/ITES': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  Other: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-400',
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-400',
};

export default function CustomersPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', code: '', industry: '', contact_name: '', contact_email: '', contact_phone: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => api.get(`/customers?search=${search}`).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/customers', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setShowCreate(false); setNewCustomer({ name: '', code: '', industry: '', contact_name: '', contact_email: '', contact_phone: '' }); },
  });

  const customers = data?.data || [];

  const columns = [
    { key: 'code', header: 'Code', render: (c: any) => <span className="font-mono font-medium text-primary-600 dark:text-primary-400">{c.code}</span> },
    { key: 'name', header: 'Name', render: (c: any) => <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span> },
    { key: 'industry', header: 'Industry', render: (c: any) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${INDUSTRY_BADGE_COLORS[c.industry] || INDUSTRY_BADGE_COLORS.Other}`}>
        {c.industry || 'N/A'}
      </span>
    )},
    { key: 'contact_name', header: 'Contact', render: (c: any) => (
      <div><p className="text-sm text-gray-900 dark:text-gray-100">{c.contact_name || 'N/A'}</p><p className="text-xs text-gray-500 dark:text-gray-400">{c.contact_email}</p></div>
    )},
    { key: 'status', header: 'Status', render: (c: any) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_COLORS[c.status] || STATUS_BADGE_COLORS.inactive}`}>
        {c.status}
      </span>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gradient Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 dark:from-primary-700 dark:to-primary-900 p-6 text-white shadow-lg">
        <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
              <p className="text-sm text-white/70">
                {isLoading ? 'Loading...' : `${customers.length} customer${customers.length !== 1 ? 's' : ''} registered`}
              </p>
            </div>
          </div>
          {user?.role === 'admin' && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30">
              <Plus className="h-4 w-4" /> Add Customer
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          placeholder="Search customers by name or code..."
          className="input-field pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table or Empty State */}
      {!isLoading && customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-800 py-16 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700/50 mb-4">
            <Building2 className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No customers found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            {search ? `No results for "${search}". Try adjusting your search.` : 'Get started by adding your first customer.'}
          </p>
        </div>
      ) : (
        <DataTable columns={columns} data={customers} loading={isLoading} emptyMessage="No customers found" />
      )}

      {/* Create Customer Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg overflow-hidden">
            {/* Gradient accent bar */}
            <div className="h-1 bg-gradient-to-r from-primary-500 to-primary-700" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add Customer</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={e => { e.preventDefault(); createMutation.mutate(newCustomer); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label><input type="text" className="input-field" required value={newCustomer.name} onChange={e => setNewCustomer(c => ({ ...c, name: e.target.value }))} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code *</label><input type="text" className="input-field" required value={newCustomer.code} onChange={e => setNewCustomer(c => ({ ...c, code: e.target.value.toUpperCase() }))} placeholder="e.g., ACME001" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
                  <select className="input-field" value={newCustomer.industry} onChange={e => setNewCustomer(c => ({ ...c, industry: e.target.value }))}>
                    <option value="">Select...</option><option value="BFSI">BFSI</option><option value="Manufacturing">Manufacturing</option>
                    <option value="Critical Infrastructure">Critical Infrastructure</option><option value="Government">Government</option>
                    <option value="Healthcare">Healthcare</option><option value="IT/ITES">IT/ITES</option><option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Name</label><input type="text" className="input-field" value={newCustomer.contact_name} onChange={e => setNewCustomer(c => ({ ...c, contact_name: e.target.value }))} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Email</label><input type="email" className="input-field" value={newCustomer.contact_email} onChange={e => setNewCustomer(c => ({ ...c, contact_email: e.target.value }))} /></div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Customer'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
