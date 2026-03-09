import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import DataTable from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { formatDate, getPlatformIcon } from '../lib/utils';
import { Search, Filter, RefreshCw } from 'lucide-react';

export default function AlertsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ severity: '', source_platform: '', alert_status: '', search: '' });

  const queryParams = new URLSearchParams({ page: String(page), limit: '50', ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)) });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['alerts', page, filters],
    queryFn: () => api.get(`/alerts?${queryParams}`).then(r => r.data),
  });

  const columns = [
    { key: 'source_platform', header: 'Source', render: (a: any) => (
      <span className="inline-flex items-center justify-center h-7 w-7 rounded bg-gray-100 dark:bg-dark-700 text-xs font-bold text-gray-600 dark:text-gray-400" title={a.source_platform}>
        {getPlatformIcon(a.source_platform)}
      </span>
    )},
    { key: 'severity', header: 'Severity', render: (a: any) => <SeverityBadge severity={a.severity} /> },
    { key: 'alert_name', header: 'Alert Name', render: (a: any) => (
      <div className="max-w-xs">
        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{a.alert_name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{a.source_alert_id}</p>
      </div>
    )},
    { key: 'customer_name', header: 'Customer', render: (a: any) => <span className="text-gray-700 dark:text-gray-300">{a.customer_name || a.customer_code}</span> },
    { key: 'alert_status', header: 'Status', render: (a: any) => <StatusBadge status={a.alert_status} /> },
    { key: 'assigned', header: 'Assigned To', render: (a: any) => a.analyst_first_name ? <span className="dark:text-gray-300">{`${a.analyst_first_name} ${a.analyst_last_name}`}</span> : <span className="text-gray-400 dark:text-gray-500">Unassigned</span> },
    { key: 'alert_created_at', header: 'Created', render: (a: any) => <span className="text-gray-500 dark:text-gray-400 text-xs">{formatDate(a.alert_created_at)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alert Queue</h1>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2 dark:hover:bg-dark-600">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search alerts..."
                className="input-field pl-10"
                value={filters.search}
                onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
              />
            </div>
          </div>
          <select className="input-field w-auto" value={filters.severity} onChange={e => { setFilters(f => ({ ...f, severity: e.target.value })); setPage(1); }}>
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className="input-field w-auto" value={filters.source_platform} onChange={e => { setFilters(f => ({ ...f, source_platform: e.target.value })); setPage(1); }}>
            <option value="">All Platforms</option>
            <option value="securonix">Securonix</option>
            <option value="seceon">Seceon</option>
            <option value="splunk">Splunk</option>
            <option value="fortisoar">FortiSOAR</option>
            <option value="manual">Manual</option>
          </select>
          <select className="input-field w-auto" value={filters.alert_status} onChange={e => { setFilters(f => ({ ...f, alert_status: e.target.value })); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={(alert: any) => navigate(`/alerts/${alert.alert_id}`)}
        loading={isLoading}
        emptyMessage="No alerts found"
      />
    </div>
  );
}
