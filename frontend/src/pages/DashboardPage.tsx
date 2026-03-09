import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import StatsCard from '../components/StatsCard';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { formatRelativeTime } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, FolderOpen, Clock, ShieldCheck, Users, Building2, Plug, TrendingUp,
  TrendingDown, Activity, Globe, Shield, Zap, Eye, Radio, ChevronRight, Timer
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SEVERITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };

const DARK_CHART_THEME = {
  grid: '#334155',
  text: '#94a3b8',
  tooltipBg: '#1e293b',
  tooltipBorder: '#334155',
};

// --- Animated count-up hook ---
function useCountUp(target: number, duration = 1200): number {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(target);

  useEffect(() => {
    prevTarget.current = target;
    if (target === 0) { setCount(0); return; }
    let start = 0;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(eased * target);
      setCount(current);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return count;
}

// --- Animated stat card with gradient icon and trend ---
function AnimatedStatCard({
  title, value, icon: Icon, gradient, trend, pulse, suffix,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  trend?: number;
  pulse?: boolean;
  suffix?: string;
}) {
  const animatedValue = useCountUp(value);
  return (
    <div className="card group relative overflow-hidden">
      {pulse && value > 0 && (
        <div className="absolute top-3 right-3 h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {animatedValue}{suffix || ''}
          </p>
          {trend !== undefined && (
            <div className={`mt-1 flex items-center gap-1 text-sm font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span>{trend >= 0 ? '+' : ''}{trend}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

// --- Custom dark tooltip for recharts ---
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2 shadow-xl"
      style={{ background: DARK_CHART_THEME.tooltipBg, borderColor: DARK_CHART_THEME.tooltipBorder }}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color || '#e2e8f0' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// --- Threat level indicator ---
function ThreatLevelIndicator() {
  const levels = ['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE'] as const;
  const colors = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444'];
  const activeLevel = 2; // ELEVATED for demo
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Threat Level</span>
      <div className="flex items-center gap-1.5">
        {levels.map((level, i) => (
          <div key={level} className="flex flex-col items-center gap-1">
            <div
              className={`h-6 w-8 rounded-sm transition-all ${i <= activeLevel ? 'shadow-lg' : 'opacity-30'}`}
              style={{ backgroundColor: colors[i], boxShadow: i === activeLevel ? `0 0 12px ${colors[i]}` : undefined }}
            />
            {i === activeLevel && (
              <span className="text-[10px] font-bold tracking-wider" style={{ color: colors[i] }}>{level}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- SLA countdown ---
function SlaCountdown({ breached }: { breached: boolean }) {
  const [time, setTime] = useState(() => breached ? 0 : Math.floor(Math.random() * 14400) + 3600);

  useEffect(() => {
    if (breached || time <= 0) return;
    const interval = setInterval(() => setTime(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, [breached, time]);

  if (breached) return <span className="text-xs text-red-500 font-semibold animate-pulse">SLA BREACHED</span>;

  const hours = Math.floor(time / 3600);
  const mins = Math.floor((time % 3600) / 60);
  const secs = time % 60;
  const isUrgent = time < 3600;

  return (
    <div className={`flex items-center gap-1 text-xs font-mono ${isUrgent ? 'text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
      <Timer className="h-3 w-3" />
      <span>{String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
    </div>
  );
}

// --- Mock threat intelligence feed items ---
const MOCK_THREAT_FEED = [
  { id: 1, title: 'APT29 Phishing Campaign Targeting Finance Sector', severity: 'critical', time: '12m ago', source: 'CISA' },
  { id: 2, title: 'New Zero-Day in Apache Struts (CVE-2026-XXXX)', severity: 'high', time: '47m ago', source: 'NVD' },
  { id: 3, title: 'Ransomware Variant LockBit 4.0 Detected in Wild', severity: 'critical', time: '1h ago', source: 'VirusTotal' },
  { id: 4, title: 'DNS Tunneling Activity Increase in APAC Region', severity: 'medium', time: '2h ago', source: 'Threat Intel' },
  { id: 5, title: 'Credential Stuffing Spike on SaaS Platforms', severity: 'high', time: '3h ago', source: 'Dark Web Monitor' },
];

const SEVERITY_BADGE_STYLES: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border border-green-500/30',
};

const AUDIT_EVENT_COLORS: Record<string, string> = {
  login: 'bg-blue-500/20 text-blue-400',
  create: 'bg-green-500/20 text-green-400',
  update: 'bg-yellow-500/20 text-yellow-400',
  delete: 'bg-red-500/20 text-red-400',
  default: 'bg-gray-500/20 text-gray-400',
};

function getAuditBadgeColor(eventType: string): string {
  if (eventType.includes('login') || eventType.includes('auth')) return AUDIT_EVENT_COLORS.login;
  if (eventType.includes('create')) return AUDIT_EVENT_COLORS.create;
  if (eventType.includes('update') || eventType.includes('modify')) return AUDIT_EVENT_COLORS.update;
  if (eventType.includes('delete') || eventType.includes('remove')) return AUDIT_EVENT_COLORS.delete;
  return AUDIT_EVENT_COLORS.default;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ============================================================
// Main Dashboard Component
// ============================================================

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
        <div className="relative">
          <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
          <div className="absolute inset-0 animate-ping h-10 w-10 border-2 border-primary-500/30 rounded-full" />
        </div>
      </div>
    );
  }

  // ==========================================================
  // ADMIN DASHBOARD
  // ==========================================================
  if (user?.role === 'admin') {
    const stats = data?.platform_stats || {};
    return (
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 dark:from-dark-800 dark:via-blue-950/50 dark:to-dark-800 p-8 border border-slate-700/50">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                Security Operations Center
              </h1>
              <p className="mt-2 text-slate-400">Platform-wide monitoring and administration</p>
            </div>
            <ThreatLevelIndicator />
          </div>
          {/* Live pulse indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-xs text-green-400 font-medium">LIVE</span>
          </div>
        </div>

        {/* Global Threat Map Placeholder */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 dark:border-dark-700 bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900 dark:from-dark-800 dark:via-blue-950/20 dark:to-dark-800 p-6 h-48">
          <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 animate-pulse" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-cyan-400" />
              <h2 className="text-lg font-semibold text-gray-200 dark:text-gray-100">Global Threat Map</h2>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Real-time threat visualization</span>
          </div>
          <div className="mt-4 flex items-center justify-center h-24">
            <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span>Active Incidents: 3</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span>Monitored Regions: 12</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Sensors Online: 48</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <AnimatedStatCard
            title="Total Customers" value={stats.total_customers || 0}
            icon={Building2} gradient="from-blue-500 to-blue-700" trend={8}
          />
          <AnimatedStatCard
            title="Active Customers" value={stats.active_customers || 0}
            icon={Building2} gradient="from-green-500 to-emerald-700" trend={3}
          />
          <AnimatedStatCard
            title="Total Users" value={stats.total_users || 0}
            icon={Users} gradient="from-purple-500 to-violet-700" trend={12}
          />
          <AnimatedStatCard
            title="Integrations" value={stats.active_integrations || 0}
            icon={Plug} gradient="from-orange-500 to-amber-700" trend={5}
          />
          <AnimatedStatCard
            title="Errors" value={stats.error_integrations || 0}
            icon={AlertTriangle} gradient="from-red-500 to-rose-700" trend={-15} pulse
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Integration Health */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Integration Health</h2>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {data?.integrations?.map((i: any) => (
                <div key={i.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800/50 hover:dark:bg-dark-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {/* Status indicator dot */}
                    <div className="relative flex-shrink-0">
                      {i.status === 'active' ? (
                        <>
                          <span className="absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                        </>
                      ) : i.status === 'error' ? (
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                      ) : (
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{i.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{i.customer_name} - {i.platform}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    i.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : i.status === 'error'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {i.status}
                  </span>
                </div>
              ))}
              {(!data?.integrations || data.integrations.length === 0) && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No integrations found</p>
              )}
            </div>
          </div>

          {/* Recent Audit Events */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Audit Events</h2>
              <Eye className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              {data?.recent_audit?.slice(0, 10).map((a: any) => (
                <div key={a.audit_id} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-dark-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getAuditBadgeColor(a.event_type)}`}>
                      {a.event_type.replace(/_/g, ' ').split(' ')[0]}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{a.event_type.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{formatRelativeTime(a.timestamp)}</span>
                </div>
              ))}
              {(!data?.recent_audit || data.recent_audit.length === 0) && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent audit events</p>
              )}
            </div>
          </div>
        </div>

        {/* Threat Intelligence Feed */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Radio className="h-5 w-5 text-red-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Threat Intelligence Feed</h2>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              Live Feed
            </span>
          </div>
          <div className="space-y-3">
            {MOCK_THREAT_FEED.map((threat) => (
              <div key={threat.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${SEVERITY_BADGE_STYLES[threat.severity]}`}>
                    {threat.severity}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-400 transition-colors">
                      {threat.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Source: {threat.source}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{threat.time}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MANAGER DASHBOARD
  // ==========================================================
  if (user?.role === 'manager') {
    const statusData = data?.cases_by_status?.map((s: any) => ({ name: s.status.replace('_', ' '), value: parseInt(s.count) })) || [];
    const severityData = data?.cases_by_severity?.map((s: any) => ({ name: s.severity, value: parseInt(s.count), color: SEVERITY_COLORS[s.severity as keyof typeof SEVERITY_COLORS] || '#6b7280' })) || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manager Overview</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Team performance and case analytics</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Activity className="h-4 w-4" />
            <span>Last 30 days</span>
          </div>
        </div>

        {/* Stats cards with trends */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatedStatCard
            title="SLA Compliance" value={data?.sla_compliance || 100}
            icon={ShieldCheck} gradient="from-green-500 to-emerald-700" trend={2} suffix="%"
          />
          <AnimatedStatCard
            title="MTTR (hours)" value={data?.mttr_hours || 0}
            icon={Clock} gradient="from-blue-500 to-blue-700" trend={-8} suffix="h"
          />
          <AnimatedStatCard
            title="Active Analysts" value={data?.analyst_workload?.length || 0}
            icon={Users} gradient="from-purple-500 to-violet-700" trend={0}
          />
          <AnimatedStatCard
            title="Customers" value={data?.customer_summary?.length || 0}
            icon={Building2} gradient="from-orange-500 to-amber-700" trend={5}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alert Volume Bar Chart */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Alert Volume (30 Days)</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.alert_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={DARK_CHART_THEME.grid} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  tick={{ fill: DARK_CHART_THEME.text, fontSize: 12 }}
                  axisLine={{ stroke: DARK_CHART_THEME.grid }}
                  tickLine={{ stroke: DARK_CHART_THEME.grid }}
                />
                <YAxis
                  tick={{ fill: DARK_CHART_THEME.text, fontSize: 12 }}
                  axisLine={{ stroke: DARK_CHART_THEME.grid }}
                  tickLine={{ stroke: DARK_CHART_THEME.grid }}
                />
                <Tooltip content={<DarkTooltip />} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
                <Bar dataKey="count" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Severity Pie Chart */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Open Cases by Severity</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  dataKey="value"
                  label={({ name, value }: any) => `${name}: ${value}`}
                  stroke="none"
                >
                  {severityData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workload and Customer Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Analyst Workload with gradient bars */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Analyst Workload</h2>
            <div className="space-y-4">
              {data?.analyst_workload?.map((a: any) => {
                const load = Math.min((parseInt(a.open_cases) / 10) * 100, 100);
                const barColor = load > 80 ? 'from-red-500 to-red-600' : load > 50 ? 'from-yellow-500 to-orange-500' : 'from-blue-500 to-cyan-500';
                return (
                  <div key={a.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{a.first_name} {a.last_name}</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{a.open_cases} cases</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`bg-gradient-to-r ${barColor} h-2.5 rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${load}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!data?.analyst_workload || data.analyst_workload.length === 0) && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No analyst data available</p>
              )}
            </div>
          </div>

          {/* Customer Summary with SLA breach indicators */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Customer Summary</h2>
            <div className="space-y-2">
              {data?.customer_summary?.map((c: any) => {
                const hasBreach = parseInt(c.sla_breaches) > 0;
                return (
                  <div
                    key={c.customer_id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors border ${
                      hasBreach
                        ? 'border-red-500/30 bg-red-50 dark:bg-red-900/10 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                        : 'border-gray-200 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50'
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.customer_name}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{c.open_cases} open</span>
                      {hasBreach && (
                        <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {c.sla_breaches} SLA breaches
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!data?.customer_summary || data.customer_summary.length === 0) && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No customer data available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ANALYST DASHBOARD
  // ==========================================================
  if (user?.role === 'analyst') {
    return (
      <div className="space-y-6">
        {/* Greeting Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {getGreeting()}, {user?.first_name || 'Analyst'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            My Queue &mdash; {data?.recent_cases?.length || 0} active cases assigned to you
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatedStatCard
            title="My Open Cases" value={data?.my_cases?.total || 0}
            icon={FolderOpen} gradient="from-blue-500 to-blue-700" trend={0}
          />
          <AnimatedStatCard
            title="Critical Cases" value={data?.my_cases?.critical || 0}
            icon={AlertTriangle} gradient="from-red-500 to-rose-700" pulse
          />
          <AnimatedStatCard
            title="New Alerts" value={data?.new_alerts || 0}
            icon={Zap} gradient="from-yellow-500 to-amber-700" trend={-5}
          />
          <AnimatedStatCard
            title="Unassigned Alerts" value={data?.unassigned_alerts || 0}
            icon={Clock} gradient="from-orange-500 to-orange-700"
          />
        </div>

        {/* Active Cases */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">My Active Cases</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">Click to open</span>
          </div>
          <div className="space-y-3">
            {data?.recent_cases?.map((c: any) => {
              const isBreached = c.sla_response_breached || c.sla_resolution_breached;
              return (
                <div
                  key={c.case_id}
                  onClick={() => navigate(`/cases/${c.case_id}`)}
                  className="card-hover flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={c.severity} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{c.case_number} - {c.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{c.customer_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <SlaCountdown breached={!!isBreached} />
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              );
            })}
            {(!data?.recent_cases || data.recent_cases.length === 0) && (
              <div className="text-center py-8">
                <ShieldCheck className="h-12 w-12 mx-auto text-green-500/50 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No active cases - queue is clear!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // CUSTOMER DASHBOARD
  // ==========================================================
  return (
    <div className="space-y-6">
      {/* Company Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-700 dark:to-primary-900 p-8">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent)]" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-white/80" />
            <h1 className="text-2xl font-bold text-white">Customer Portal</h1>
          </div>
          <p className="mt-2 text-primary-100">Welcome back. Here is an overview of your security cases.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard
          title="Total Cases" value={data?.stats?.total_cases || 0}
          icon={FolderOpen} gradient="from-blue-500 to-blue-700"
        />
        <AnimatedStatCard
          title="Open Cases" value={data?.stats?.open_cases || 0}
          icon={AlertTriangle} gradient="from-orange-500 to-amber-700"
        />
        <AnimatedStatCard
          title="Resolved" value={data?.stats?.resolved_cases || 0}
          icon={ShieldCheck} gradient="from-green-500 to-emerald-700"
        />
        <AnimatedStatCard
          title="Critical Open" value={data?.stats?.critical_open || 0}
          icon={AlertTriangle} gradient="from-red-500 to-rose-700" pulse
        />
      </div>

      {/* Recent Cases */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Cases</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">Click to view details</span>
        </div>
        <div className="space-y-3">
          {data?.recent_cases?.map((c: any) => (
            <div
              key={c.case_id}
              onClick={() => navigate(`/cases/${c.case_id}`)}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 hover:-translate-y-0.5 cursor-pointer transition-all"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{c.case_number} - {c.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Updated {formatRelativeTime(c.updated_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <SeverityBadge severity={c.severity} />
                <StatusBadge status={c.status} />
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ))}
          {(!data?.recent_cases || data.recent_cases.length === 0) && (
            <div className="text-center py-8">
              <ShieldCheck className="h-12 w-12 mx-auto text-green-500/50 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No cases found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
