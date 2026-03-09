import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import SeverityBadge from '../components/SeverityBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, TrendingUp, Shield, Clock, AlertTriangle } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-lg px-3 py-2 shadow-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm text-gray-600 dark:text-gray-300">
            Count: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [selectedCustomer, setSelectedCustomer] = useState(user?.customerIds?.[0] || '');
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then(r => r.data),
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', selectedCustomer, month, year],
    queryFn: () => api.get(`/reports/monthly/${selectedCustomer}?month=${month}&year=${year}`).then(r => r.data),
    enabled: !!selectedCustomer,
  });

  const slaResponsePct = report?.sla_performance?.total
    ? Math.round((report.sla_performance.response_met / report.sla_performance.total) * 100)
    : 0;
  const slaResolutionPct = report?.sla_performance?.total
    ? Math.round((report.sla_performance.resolution_met / report.sla_performance.total) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gradient Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-800 dark:from-primary-800 dark:via-primary-900 dark:to-indigo-950 p-6 shadow-lg">
        <div className="absolute inset-0 bg-grid-white/[0.03]" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Monthly Security Report</h1>
            <p className="text-sm text-primary-200">Generate and review monthly security performance</p>
          </div>
        </div>
      </div>

      {/* Selector Row */}
      <div className="rounded-xl border border-gray-200/60 dark:border-dark-700/60 bg-white/70 dark:bg-dark-800/70 backdrop-blur-md shadow-sm p-5">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer</label>
            <select className="input-field w-auto min-w-[200px]" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
              <option value="">Select customer...</option>
              {customers?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
            <select className="input-field w-auto" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('default', { month: 'long' })}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
            <select className="input-field w-auto" value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>}

      {report && (
        <div className="space-y-6">
          {/* Customer Header Card */}
          <div className="card bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-700 dark:to-primary-900 text-white border-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{report.customer.name}</h2>
                <p className="text-primary-200">Report Period: {new Date(report.report_period.start).toLocaleDateString()} - {new Date(report.report_period.end).toLocaleDateString()}</p>
              </div>
              <FileText className="h-12 w-12 text-primary-300" />
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card text-center border border-gray-200 dark:border-dark-700">
              <div className="flex justify-center mb-2">
                <AlertTriangle className="h-6 w-6 text-orange-500 dark:text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{report.alert_summary?.total_alerts || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Alerts</p>
            </div>
            <div className="card text-center border border-gray-200 dark:border-dark-700">
              <div className="flex justify-center mb-2">
                <Shield className="h-6 w-6 text-blue-500 dark:text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{report.case_summary?.total_cases || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Cases</p>
            </div>
            <div className="card text-center border border-gray-200 dark:border-dark-700">
              <div className="flex justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-green-500 dark:text-green-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{report.case_summary?.resolved || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cases Resolved</p>
            </div>
            <div className="card text-center border border-gray-200 dark:border-dark-700">
              <div className="flex justify-center mb-2">
                <Clock className="h-6 w-6 text-purple-500 dark:text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{report.mttr_hours}h</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Avg MTTR</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alerts by Severity */}
            <div className="card border border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Alerts by Severity</h3>
              <div className="space-y-3">
                {['critical', 'high', 'medium', 'low'].map(sev => (
                  <div key={sev} className="flex items-center justify-between"><SeverityBadge severity={sev} /><span className="font-medium text-gray-900 dark:text-gray-100">{report.alert_summary?.[sev] || 0}</span></div>
                ))}
              </div>
            </div>

            {/* Alerts by Platform Chart */}
            <div className="card border border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Alerts by Platform</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={report.alerts_by_platform || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                  <XAxis dataKey="source_platform" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SLA Performance */}
            <div className="card border border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">SLA Performance</h3>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Response SLA Met</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">{report.sla_performance?.response_met || 0} / {report.sla_performance?.total || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2.5">
                    <div
                      className="bg-green-500 dark:bg-green-400 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${slaResponsePct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{slaResponsePct}% compliance</p>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Resolution SLA Met</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">{report.sla_performance?.resolution_met || 0} / {report.sla_performance?.total || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2.5">
                    <div
                      className="bg-green-500 dark:bg-green-400 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${slaResolutionPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{slaResolutionPct}% compliance</p>
                </div>
              </div>
            </div>

            {/* Top Threat Categories */}
            <div className="card border border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Top Threat Categories</h3>
              <div className="space-y-2">
                {report.top_threat_categories?.map((t: any) => (
                  <div key={t.alert_category} className="flex items-center justify-between"><span className="text-sm text-gray-700 dark:text-gray-300">{t.alert_category}</span><span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.count}</span></div>
                ))}
                {(!report.top_threat_categories || report.top_threat_categories.length === 0) && <p className="text-gray-500 dark:text-gray-400 text-center py-2">No threat data</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedCustomer && !isLoading && (
        <div className="card text-center py-12 border border-gray-200 dark:border-dark-700">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
          <p className="text-gray-500 dark:text-gray-400">Select a customer to generate a monthly report</p>
        </div>
      )}
    </div>
  );
}
