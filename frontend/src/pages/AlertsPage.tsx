import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import DataTable from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { formatDate, getPlatformIcon } from '../lib/utils';
import { Search, Filter, RefreshCw, AlertTriangle, Shield, Zap, Clock, Eye, TrendingUp } from 'lucide-react';

export default function AlertsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ severity: '', source_platform: '', alert_status: '', search: '' });

  const queryParams = new URLSearchParams({ page: String(page), limit: '50', ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)) });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['alerts', page, filters],
    queryFn: () => api.get(`/alerts?${queryParams}`).then(r => r.data),
  });

  const alerts = data?.data || [];
  const totalCount = data?.pagination?.total || 0;
  const criticalCount = alerts.filter((a: any) => a.severity === 'critical').length;
  const newUnassignedCount = alerts.filter((a: any) => a.alert_status === 'new' && !a.analyst_first_name).length;
  const resolvedCount = alerts.filter((a: any) => a.alert_status === 'resolved').length;

  const severityChips = [
    { label: 'All', value: '' },
    { label: 'Critical', value: 'critical', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
    { label: 'High', value: 'high', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' },
    { label: 'Medium', value: 'medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' },
    { label: 'Low', value: 'low', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' },
  ];

  const platformOptions = [
    { label: 'All Platforms', value: '', icon: null },
    { label: 'Securonix', value: 'securonix', abbr: 'S' },
    { label: 'Seceon', value: 'seceon', abbr: 'Se' },
    { label: 'Splunk', value: 'splunk', abbr: 'Sp' },
    { label: 'FortiSOAR', value: 'fortisoar', abbr: 'F' },
    { label: 'Manual', value: 'manual', abbr: 'M' },
  ];

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

  const statCards = [
    {
      label: 'Total Alerts',
      value: totalCount,
      icon: AlertTriangle,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-400',
    },
    {
      label: 'Critical',
      value: criticalCount,
      icon: Zap,
      gradient: 'from-red-500 to-red-600',
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
    },
    {
      label: 'New / Unassigned',
      value: newUnassignedCount,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-400',
    },
    {
      label: 'Resolved',
      value: resolvedCount,
      icon: Shield,
      gradient: 'from-emerald-500 to-green-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-400',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gradient Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-6 shadow-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0djEyaDEyVjE0SDM2ek0xMiAxNHYxMmgxMlYxNEgxMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-white/15 backdrop-blur-sm">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">Alert Queue</h1>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
                </span>
                <span className="text-xs font-medium text-green-300 uppercase tracking-wide">Live</span>
              </div>
              <p className="text-primary-200 text-sm mt-0.5">
                Monitoring {totalCount} alert{totalCount !== 1 ? 's' : ''} across all platforms
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-medium transition-all duration-200 border border-white/20"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 p-5 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {card.label}
                  </p>
                  <p className={`text-3xl font-bold mt-1 ${card.text}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
              {/* Subtle decorative gradient line at bottom */}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.gradient} opacity-60`}></div>
            </div>
          );
        })}
      </div>

      {/* Glassmorphism Filter Bar */}
      <div className="rounded-xl bg-white/80 backdrop-blur-xl border border-gray-200/80 dark:bg-dark-800/80 dark:border-dark-700/50 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Filters</span>
        </div>
        <div className="flex flex-wrap gap-4">
          {/* Search input */}
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

          {/* Severity dropdown */}
          <select
            className="input-field w-auto"
            value={filters.severity}
            onChange={e => { setFilters(f => ({ ...f, severity: e.target.value })); setPage(1); }}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Platform filter with icon badges */}
          <div className="flex items-center gap-2">
            {platformOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setFilters(f => ({ ...f, source_platform: opt.value })); setPage(1); }}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 border
                  ${filters.source_platform === opt.value
                    ? 'bg-primary-50 text-primary-700 border-primary-300 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-700 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-dark-700 dark:text-gray-400 dark:border-dark-600 dark:hover:bg-dark-600'
                  }
                `}
                title={opt.label}
              >
                {opt.abbr && (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-gray-100 dark:bg-dark-600 text-[10px] font-bold text-gray-700 dark:text-gray-300">
                    {opt.abbr}
                  </span>
                )}
                <span className="hidden sm:inline">{opt.label}</span>
                {!opt.abbr && <span className="sm:hidden">All</span>}
              </button>
            ))}
          </div>

          {/* Status dropdown */}
          <select
            className="input-field w-auto"
            value={filters.alert_status}
            onChange={e => { setFilters(f => ({ ...f, alert_status: e.target.value })); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>
        </div>

        {/* Quick Severity Filter Chips */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-dark-700">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mr-1">Quick filter:</span>
          {severityChips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => { setFilters(f => ({ ...f, severity: chip.value })); setPage(1); }}
              className={`
                inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 border
                ${filters.severity === chip.value
                  ? chip.color
                    ? `${chip.color} ring-2 ring-offset-1 ring-current/20 dark:ring-offset-dark-800`
                    : 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-700'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 dark:bg-dark-700 dark:text-gray-400 dark:border-dark-600 dark:hover:bg-dark-600'
                }
              `}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={alerts}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={(alert: any) => navigate(`/alerts/${alert.alert_id}`)}
        loading={isLoading}
        emptyMessage="No alerts found"
      />
    </div>
  );
}
