import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { formatDate } from '../lib/utils';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const severityBorderColor: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500',
};

export default function AlertDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: alert, isLoading } = useQuery({
    queryKey: ['alert', id],
    queryFn: () => api.get(`/alerts/${id}`).then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/alerts/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert', id] }),
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  if (!alert) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Alert not found</div>;

  const borderAccent = severityBorderColor[alert.severity] || 'border-l-gray-400';
  const isCritical = alert.severity === 'critical';

  const rawJson = JSON.stringify(alert.source_raw_json, null, 2);
  const rawJsonLines = rawJson ? rawJson.split('\n') : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={() => navigate('/alerts')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Alerts
      </button>

      <div className={`border-l-4 ${borderAccent} bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-6`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{alert.alert_name}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Source: {alert.source_platform} | ID: {alert.source_alert_id}</p>
          </div>
          <div className="flex items-center gap-3">
            <SeverityBadge severity={alert.severity} />
            <span className={isCritical ? 'shadow-[0_0_12px_rgba(239,68,68,0.5)] rounded-full' : ''}>
              <StatusBadge status={alert.alert_status} />
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Alert Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Customer</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-200">{alert.customer_name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Category</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-200">{alert.alert_category || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Source IP</dt>
                <dd className="font-mono text-sm text-gray-900 dark:text-gray-300">{alert.source_ip || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Destination IP</dt>
                <dd className="font-mono text-sm text-gray-900 dark:text-gray-300">{alert.destination_ip || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Actor / Entity</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-200">{alert.actor_entity || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Risk Score</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-200">{alert.risk_score ?? 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="text-gray-900 dark:text-gray-200">{formatDate(alert.alert_created_at)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Ingested</dt>
                <dd className="text-gray-900 dark:text-gray-200">{formatDate(alert.ingested_at)}</dd>
              </div>
            </dl>
            {alert.alert_description && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{alert.alert_description}</p>
              </div>
            )}
          </div>

          {/* Raw JSON */}
          <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Raw Alert Data</h2>
            <div className="bg-gray-950 dark:bg-black/50 rounded-lg overflow-x-auto max-h-96 border border-gray-800 dark:border-dark-600">
              <table className="w-full text-xs font-mono">
                <tbody>
                  {rawJsonLines.map((line, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="pl-3 pr-3 py-0 text-right text-gray-600 select-none border-r border-gray-800 dark:border-dark-600 w-10 align-top">
                        {i + 1}
                      </td>
                      <td className="pl-3 pr-4 py-0 text-green-400 dark:text-green-400 whitespace-pre">
                        {line}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Actions</h2>
            <div className="space-y-2">
              {alert.alert_status === 'new' && (
                <button
                  onClick={() => statusMutation.mutate('in_progress')}
                  className="btn-primary w-full hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
                >
                  Take Ownership
                </button>
              )}
              <button
                onClick={() => statusMutation.mutate('escalated')}
                className="btn-secondary w-full hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
              >
                Escalate
              </button>
              <button
                onClick={() => statusMutation.mutate('false_positive')}
                className="btn-secondary w-full hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
              >
                Mark False Positive
              </button>
              <button
                onClick={() => statusMutation.mutate('resolved')}
                className="btn-secondary w-full hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
              >
                Resolve
              </button>
            </div>
          </div>

          {alert.tags?.length > 0 && (
            <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-6">
              <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {alert.tags.map((tag: string) => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded text-xs">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {alert.mitre_techniques?.length > 0 && (
            <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-6">
              <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">MITRE ATT&CK</h2>
              <div className="flex flex-wrap gap-2">
                {alert.mitre_techniques.map((t: string) => (
                  <span key={t} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded text-xs font-mono">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
