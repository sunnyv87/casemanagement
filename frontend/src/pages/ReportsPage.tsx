import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import SeverityBadge from '../components/SeverityBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Monthly Security Report</h1>
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select className="input-field w-auto" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
              <option value="">Select customer...</option>
              {customers?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select className="input-field w-auto" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('default', { month: 'long' })}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select className="input-field w-auto" value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>}

      {report && (
        <div className="space-y-6">
          <div className="card bg-gradient-to-r from-primary-600 to-primary-800 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{report.customer.name}</h2>
                <p className="text-primary-200">Report Period: {new Date(report.report_period.start).toLocaleDateString()} - {new Date(report.report_period.end).toLocaleDateString()}</p>
              </div>
              <FileText className="h-12 w-12 text-primary-300" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card text-center"><p className="text-3xl font-bold text-gray-900">{report.alert_summary?.total_alerts || 0}</p><p className="text-sm text-gray-500">Total Alerts</p></div>
            <div className="card text-center"><p className="text-3xl font-bold text-gray-900">{report.case_summary?.total_cases || 0}</p><p className="text-sm text-gray-500">Total Cases</p></div>
            <div className="card text-center"><p className="text-3xl font-bold text-gray-900">{report.case_summary?.resolved || 0}</p><p className="text-sm text-gray-500">Cases Resolved</p></div>
            <div className="card text-center"><p className="text-3xl font-bold text-gray-900">{report.mttr_hours}h</p><p className="text-sm text-gray-500">Avg MTTR</p></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Alerts by Severity</h3>
              <div className="space-y-3">
                {['critical', 'high', 'medium', 'low'].map(sev => (
                  <div key={sev} className="flex items-center justify-between"><SeverityBadge severity={sev} /><span className="font-medium">{report.alert_summary?.[sev] || 0}</span></div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Alerts by Platform</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={report.alerts_by_platform || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="source_platform" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">SLA Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-gray-500">Response SLA Met</span><span className="font-medium text-green-600">{report.sla_performance?.response_met || 0} / {report.sla_performance?.total || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Resolution SLA Met</span><span className="font-medium text-green-600">{report.sla_performance?.resolution_met || 0} / {report.sla_performance?.total || 0}</span></div>
              </div>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Top Threat Categories</h3>
              <div className="space-y-2">
                {report.top_threat_categories?.map((t: any) => (
                  <div key={t.alert_category} className="flex items-center justify-between"><span className="text-sm text-gray-700">{t.alert_category}</span><span className="text-sm font-medium">{t.count}</span></div>
                ))}
                {(!report.top_threat_categories || report.top_threat_categories.length === 0) && <p className="text-gray-500 text-center py-2">No threat data</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedCustomer && !isLoading && (
        <div className="card text-center py-12"><FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" /><p className="text-gray-500">Select a customer to generate a monthly report</p></div>
      )}
    </div>
  );
}
