import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import DataTable from '../components/DataTable';
import { formatDate } from '../lib/utils';
import { Search, Plus, X, UserPlus, Users, Shield, ShieldCheck, Activity } from 'lucide-react';

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

  const users = data?.data || [];
  const totalUsers = users.length;
  const activeUsers = users.filter((u: any) => u.status === 'active').length;
  const adminUsers = users.filter((u: any) => u.role === 'admin').length;
  const mfaEnabled = users.filter((u: any) => u.mfa_enabled).length;

  const columns = [
    { key: 'name', header: 'Name', render: (u: any) => <span className="font-medium text-gray-900 dark:text-gray-100">{u.first_name} {u.last_name}</span> },
    { key: 'email', header: 'Email', render: (u: any) => <span className="text-gray-600 dark:text-gray-400">{u.email}</span> },
    { key: 'role', header: 'Role', render: (u: any) => (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        u.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
        u.role === 'manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
        u.role === 'analyst' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      }`}>
        {u.role}
      </span>
    )},
    { key: 'status', header: 'Status', render: (u: any) => (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
        u.status === 'active'
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      }`}>{u.status}</span>
    )},
    { key: 'mfa', header: 'MFA', render: (u: any) => u.mfa_enabled ? <span className="text-green-600 dark:text-green-400 text-sm">Enabled</span> : <span className="text-gray-400 dark:text-gray-500 text-sm">Disabled</span> },
    { key: 'last_login', header: 'Last Login', render: (u: any) => u.last_login_at ? <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(u.last_login_at)}</span> : <span className="text-gray-400 text-xs">Never</span> },
  ];

  const statCards = [
    { label: 'Total Users', value: totalUsers, icon: Users, gradient: 'from-blue-500 to-blue-600' },
    { label: 'Active', value: activeUsers, icon: Activity, gradient: 'from-green-500 to-emerald-600' },
    { label: 'Admins', value: adminUsers, icon: Shield, gradient: 'from-purple-500 to-purple-600' },
    { label: 'MFA Enabled', value: mfaEnabled, icon: ShieldCheck, gradient: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gradient Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 p-6 shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Users</h1>
              <p className="text-sm text-blue-100">{totalUsers} user{totalUsers !== 1 ? 's' : ''} in the system</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/30">
            <UserPlus className="h-4 w-4" /> Add User
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.gradient} shadow-sm`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Role Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search users..."
            className="input-field pl-10 bg-white dark:bg-dark-800 border-gray-200 dark:border-gray-700"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-auto bg-white dark:bg-dark-800 border-gray-200 dark:border-gray-700"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option><option value="manager">Manager</option>
          <option value="analyst">Analyst</option><option value="customer">Customer</option>
        </select>
      </div>

      <DataTable columns={columns} data={users} loading={isLoading} emptyMessage="No users found" />

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add User</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(newUser); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                  <input type="text" className="input-field bg-white dark:bg-dark-900 border-gray-200 dark:border-gray-600" required value={newUser.first_name} onChange={e => setNewUser(u => ({ ...u, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
                  <input type="text" className="input-field bg-white dark:bg-dark-900 border-gray-200 dark:border-gray-600" required value={newUser.last_name} onChange={e => setNewUser(u => ({ ...u, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input type="email" className="input-field bg-white dark:bg-dark-900 border-gray-200 dark:border-gray-600" required value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                <input type="password" className="input-field bg-white dark:bg-dark-900 border-gray-200 dark:border-gray-600" required minLength={8} value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                <select className="input-field bg-white dark:bg-dark-900 border-gray-200 dark:border-gray-600" value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
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
