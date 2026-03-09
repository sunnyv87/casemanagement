import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import DataTable from '../components/DataTable';
import { formatDate } from '../lib/utils';
import { ScrollText, Filter } from 'lucide-react';

const eventTypeColors: Record<string, string> = {
  USER_LOGIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  CASE_CREATED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  CASE_UPDATED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  CASE_ESCALATED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  CASE_CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300',
  ALERT_ASSIGNED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  ALERT_STATUS_UPDATED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  CUSTOMER_CREATED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  USER_CREATED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  ROLE_CHANGED: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  SLA_RESPONSE_BREACHED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  SLA_RESOLUTION_BREACHED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ event_type: '', from_date: '', to_date: '' });

  const queryParams = new URLSearchParams({ page: String(page), limit: '50', ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)) });

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, filters],
    queryFn: () => api.get(`/audit/logs?${queryParams}`).then(r => r.data),
  });

  const columns = [
    { key: 'timestamp', header: 'Timestamp', render: (a: any) => <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{formatDate(a.timestamp)}</span> },
    { key: 'event_type', header: 'Event', render: (a: any) => (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${eventTypeColors[a.event_type] || 'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300'}`}>
        {a.event_type?.replace(/_/g, ' ')}
      </span>
    )},
    { key: 'actor', header: 'Actor', render: (a: any) => (
      <div className="group relative">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-300">{a.actor_user_id?.substring(0, 8) || 'System'}...</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{a.actor_role || 'N/A'}</p>
        {a.actor_user_id && (
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
            <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
              {a.actor_user_id}
            </div>
          </div>
        )}
      </div>
    )},
    { key: 'target', header: 'Target', render: (a: any) => (
      <div>
        <p className="text-sm capitalize font-medium text-gray-800 dark:text-gray-300">{a.target_entity_type || 'N/A'}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{a.target_entity_id?.substring(0, 8) || ''}...</p>
      </div>
    )},
    { key: 'ip', header: 'IP Address', render: (a: any) => <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{a.ip_address || 'N/A'}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gradient Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-900 dark:to-gray-900 p-6 shadow-lg">
        <div className="absolute inset-0 bg-grid-white/[0.03]" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
            <ScrollText className="h-6 w-6 text-slate-200" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
            <p className="text-sm text-slate-300">Track all system events and user activity</p>
          </div>
        </div>
      </div>

      {/* Filter Row with Glassmorphism */}
      <div className="rounded-xl border border-gray-200/60 dark:border-dark-700/60 bg-white/70 dark:bg-dark-800/70 backdrop-blur-md shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <select className="input-field w-auto" value={filters.event_type} onChange={e => { setFilters(f => ({ ...f, event_type: e.target.value })); setPage(1); }}>
            <option value="">All Events</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="CASE_CREATED">Case Created</option>
            <option value="CASE_UPDATED">Case Updated</option>
            <option value="CASE_ESCALATED">Case Escalated</option>
            <option value="CASE_CLOSED">Case Closed</option>
            <option value="ALERT_ASSIGNED">Alert Assigned</option>
            <option value="ALERT_STATUS_UPDATED">Alert Status Updated</option>
            <option value="CUSTOMER_CREATED">Customer Created</option>
            <option value="USER_CREATED">User Created</option>
            <option value="ROLE_CHANGED">Role Changed</option>
            <option value="SLA_RESPONSE_BREACHED">SLA Response Breached</option>
            <option value="SLA_RESOLUTION_BREACHED">SLA Resolution Breached</option>
          </select>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Date</label>
            <input type="date" className="input-field w-auto" value={filters.from_date} onChange={e => { setFilters(f => ({ ...f, from_date: e.target.value })); setPage(1); }} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To Date</label>
            <input type="date" className="input-field w-auto" value={filters.to_date} onChange={e => { setFilters(f => ({ ...f, to_date: e.target.value })); setPage(1); }} />
          </div>
        </div>
      </div>

      {/* Summary */}
      {data?.pagination && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{data.data?.length || 0}</span> of{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-300">{data.pagination.total || 0}</span> total records
        </p>
      )}

      <DataTable columns={columns} data={data?.data || []} pagination={data?.pagination} onPageChange={setPage} loading={isLoading} emptyMessage="No audit logs found" />
    </div>
  );
}
