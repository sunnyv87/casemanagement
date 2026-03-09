import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import DataTable from '../components/DataTable';
import { Search, Plus, Building2, X } from 'lucide-react';

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

  const columns = [
    { key: 'code', header: 'Code', render: (c: any) => <span className="font-mono font-medium text-primary-600">{c.code}</span> },
    { key: 'name', header: 'Name', render: (c: any) => <span className="font-medium text-gray-900">{c.name}</span> },
    { key: 'industry', header: 'Industry' },
    { key: 'contact_name', header: 'Contact', render: (c: any) => (
      <div><p className="text-sm">{c.contact_name || 'N/A'}</p><p className="text-xs text-gray-500">{c.contact_email}</p></div>
    )},
    { key: 'status', header: 'Status', render: (c: any) => (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-green-100 text-green-800' : c.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
        {c.status}
      </span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        {user?.role === 'admin' && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> Add Customer</button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type="text" placeholder="Search customers..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <DataTable columns={columns} data={data?.data || []} loading={isLoading} emptyMessage="No customers found" />

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Add Customer</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(newCustomer); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input type="text" className="input-field" required value={newCustomer.name} onChange={e => setNewCustomer(c => ({ ...c, name: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Code *</label><input type="text" className="input-field" required value={newCustomer.code} onChange={e => setNewCustomer(c => ({ ...c, code: e.target.value.toUpperCase() }))} placeholder="e.g., ACME001" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <select className="input-field" value={newCustomer.industry} onChange={e => setNewCustomer(c => ({ ...c, industry: e.target.value }))}>
                  <option value="">Select...</option><option value="BFSI">BFSI</option><option value="Manufacturing">Manufacturing</option>
                  <option value="Critical Infrastructure">Critical Infrastructure</option><option value="Government">Government</option>
                  <option value="Healthcare">Healthcare</option><option value="IT/ITES">IT/ITES</option><option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label><input type="text" className="input-field" value={newCustomer.contact_name} onChange={e => setNewCustomer(c => ({ ...c, contact_name: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label><input type="email" className="input-field" value={newCustomer.contact_email} onChange={e => setNewCustomer(c => ({ ...c, contact_email: e.target.value }))} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
