import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import DataTable from '../components/DataTable';
import { formatDate } from '../lib/utils';

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ event_type: '', from_date: '', to_date: '' });

  const queryParams = new URLSearchParams({ page: String(page), limit: '50', ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)) });

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, filters],
    queryFn: () => api.get(`/audit/logs?${queryParams}`).then(r => r.data),
  });

  const columns = [
    { key: 'timestamp', header: 'Timestamp', render: (a: any) => <span className="text-xs font-mono">{formatDate(a.timestamp)}</span> },
    { key: 'event_type', header: 'Event', render: (a: any) => <span className="px-2 py-0.5 rounded bg-gray-100 text-xs font-medium text-gray-700 dark:text-gray-300">{a.event_type}</span> },
    { key: 'actor', header: 'Actor', render: (a: any) => (
      <div><p className="text-sm">{a.actor_user_id?.substring(0, 8) || 'System'}...</p><p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{a.actor_role || 'N/A'}</p></div>
    )},
    { key: 'target', header: 'Target', render: (a: any) => (
      <div><p className="text-sm capitalize">{a.target_entity_type || 'N/A'}</p><p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{a.target_entity_id?.substring(0, 8) || ''}...</p></div>
    )},
    { key: 'ip', header: 'IP Address', render: (a: any) => <span className="text-xs font-mono">{a.ip_address || 'N/A'}</span> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Logs</h1>
      <div className="card">
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
          <input type="date" className="input-field w-auto" value={filters.from_date} onChange={e => { setFilters(f => ({ ...f, from_date: e.target.value })); setPage(1); }} />
          <input type="date" className="input-field w-auto" value={filters.to_date} onChange={e => { setFilters(f => ({ ...f, to_date: e.target.value })); setPage(1); }} />
        </div>
      </div>
      <DataTable columns={columns} data={data?.data || []} pagination={data?.pagination} onPageChange={setPage} loading={isLoading} emptyMessage="No audit logs found" />
    </div>
  );
}
