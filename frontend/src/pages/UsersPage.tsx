import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import DataTable from '../components/DataTable';
import { formatDate } from '../lib/utils';
import { Search, Plus, X, UserPlus } from 'lucide-react';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'analyst', phone: '', customer_ids: [] as string[] });

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => api.get(`/users?search=${search}&role=${roleFilter}`).then(r => r.data),
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then(r => r.data),
    enabled: showCreate,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false); },
  });

  const columns = [
    { key: 'name', header: 'Name', render: (u: any) => <span className="font-medium text-gray-900 dark:text-gray-100">{u.first_name} {u.last_name}</span> },
    { key: 'email', header: 'Email', render: (u: any) => <span className="text-gray-600">{u.email}</span> },
    { key: 'role', header: 'Role', render: (u: any) => (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : u.role === 'manager' ? 'bg-blue-100 text-blue-800' : u.role === 'analyst' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
        {u.role}
      </span>
    )},
    { key: 'status', header: 'Status', render: (u: any) => (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.status}</span>
    )},
    { key: 'mfa', header: 'MFA', render: (u: any) => u.mfa_enabled ? <span className="text-green-600 text-sm">Enabled</span> : <span className="text-gray-400 text-sm">Disabled</span> },
    { key: 'last_login', header: 'Last Login', render: (u: any) => u.last_login_at ? <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(u.last_login_at)}</span> : <span className="text-gray-400 text-xs">Never</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Users</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add User</button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search users..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option><option value="manager">Manager</option>
          <option value="analyst">Analyst</option><option value="customer">Customer</option>
        </select>
      </div>

      <DataTable columns={columns} data={data?.data || []} loading={isLoading} emptyMessage="No users found" />

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Add User</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(newUser); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label><input type="text" className="input-field" required value={newUser.first_name} onChange={e => setNewUser(u => ({ ...u, first_name: e.target.value }))} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label><input type="text" className="input-field" required value={newUser.last_name} onChange={e => setNewUser(u => ({ ...u, last_name: e.target.value }))} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label><input type="email" className="input-field" required value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label><input type="password" className="input-field" required minLength={8} value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                <select className="input-field" value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
                  <option value="analyst">Analyst</option><option value="manager">Manager</option>
                  <option value="admin">Admin</option><option value="customer">Customer</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
