import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import StatsCard from '../components/StatsCard';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { formatRelativeTime } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, FolderOpen, Clock, ShieldCheck, Users, Building2, Plug, TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SEVERITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const dashboardEndpoint = user?.role === 'admin' ? '/dashboard/admin'
    : user?.role === 'manager' ? '/dashboard/manager'
    : user?.role === 'analyst' ? '/dashboard/analyst'
    : '/dashboard/customer';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', user?.role],
    queryFn: () => api.get(dashboardEndpoint).then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Analyst Dashboard
  if (user?.role === 'analyst') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Analyst Workbench</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard title="My Open Cases" value={data?.my_cases?.total || 0} icon={FolderOpen} color="blue" />
          <StatsCard title="Critical Cases" value={data?.my_cases?.critical || 0} icon={AlertTriangle} color="red" />
          <StatsCard title="New Alerts" value={data?.new_alerts || 0} icon={AlertTriangle} color="yellow" />
          <StatsCard title="Unassigned Alerts" value={data?.unassigned_alerts || 0} icon={Clock} color="orange" />
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Active Cases</h2>
          <div className="space-y-3">
            {data?.recent_cases?.map((c: any) => (
              <div key={c.case_id} onClick={() => navigate(`/cases/${c.case_id}`)} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={c.severity} />
                  <div>
                    <p className="font-medium text-gray-900">{c.case_number} - {c.title}</p>
                    <p className="text-sm text-gray-500">{c.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={c.status} />
                  {(c.sla_response_breached || c.sla_resolution_breached) && (
                    <span className="text-xs text-red-600 font-medium">SLA Breached</span>
                  )}
                </div>
              </div>
            ))}
            {(!data?.recent_cases || data.recent_cases.length === 0) && (
              <p className="text-gray-500 text-center py-4">No active cases</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Manager Dashboard
  if (user?.role === 'manager') {
    const statusData = data?.cases_by_status?.map((s: any) => ({ name: s.status.replace('_', ' '), value: parseInt(s.count) })) || [];
    const severityData = data?.cases_by_severity?.map((s: any) => ({ name: s.severity, value: parseInt(s.count), color: SEVERITY_COLORS[s.severity as keyof typeof SEVERITY_COLORS] || '#6b7280' })) || [];

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Manager Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard title="SLA Compliance" value={`${data?.sla_compliance || 100}%`} icon={ShieldCheck} color="green" />
          <StatsCard title="MTTR" value={`${data?.mttr_hours || 0}h`} icon={Clock} color="blue" />
          <StatsCard title="Active Analysts" value={data?.analyst_workload?.length || 0} icon={Users} color="purple" />
          <StatsCard title="Customers" value={data?.customer_summary?.length || 0} icon={Building2} color="orange" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Alert Volume (30 Days)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.alert_trend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Open Cases by Severity</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }: any) => `${name}: ${value}`}>
                  {severityData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Analyst Workload</h2>
            <div className="space-y-3">
              {data?.analyst_workload?.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{a.first_name} {a.last_name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${Math.min((parseInt(a.open_cases) / 10) * 100, 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{a.open_cases}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Customer Summary</h2>
            <div className="space-y-3">
              {data?.customer_summary?.map((c: any) => (
                <div key={c.customer_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <span className="text-sm font-medium text-gray-700">{c.customer_name}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">{c.open_cases} open</span>
                    {parseInt(c.sla_breaches) > 0 && <span className="text-red-600 font-medium">{c.sla_breaches} SLA breaches</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  if (user?.role === 'admin') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Console</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatsCard title="Customers" value={data?.platform_stats?.total_customers || 0} icon={Building2} color="blue" />
          <StatsCard title="Active" value={data?.platform_stats?.active_customers || 0} icon={Building2} color="green" />
          <StatsCard title="Users" value={data?.platform_stats?.total_users || 0} icon={Users} color="purple" />
          <StatsCard title="Integrations" value={data?.platform_stats?.active_integrations || 0} icon={Plug} color="orange" />
          <StatsCard title="Errors" value={data?.platform_stats?.error_integrations || 0} icon={AlertTriangle} color="red" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Integration Health</h2>
            <div className="space-y-3">
              {data?.integrations?.map((i: any) => (
                <div key={i.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">{i.name}</p>
                    <p className="text-sm text-gray-500">{i.customer_name} - {i.platform}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${i.status === 'active' ? 'bg-green-100 text-green-800' : i.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                    {i.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Recent Audit Events</h2>
            <div className="space-y-2">
              {data?.recent_audit?.slice(0, 10).map((a: any) => (
                <div key={a.audit_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-700">{a.event_type.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-400">{formatRelativeTime(a.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Customer Dashboard
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Customer Portal</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Cases" value={data?.stats?.total_cases || 0} icon={FolderOpen} color="blue" />
        <StatsCard title="Open Cases" value={data?.stats?.open_cases || 0} icon={AlertTriangle} color="orange" />
        <StatsCard title="Resolved" value={data?.stats?.resolved_cases || 0} icon={ShieldCheck} color="green" />
        <StatsCard title="Critical Open" value={data?.stats?.critical_open || 0} icon={AlertTriangle} color="red" />
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Cases</h2>
        <div className="space-y-3">
          {data?.recent_cases?.map((c: any) => (
            <div key={c.case_id} onClick={() => navigate(`/cases/${c.case_id}`)} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">{c.case_number} - {c.title}</p>
                <p className="text-sm text-gray-500">Updated {formatRelativeTime(c.updated_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={c.severity} />
                <StatusBadge status={c.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
