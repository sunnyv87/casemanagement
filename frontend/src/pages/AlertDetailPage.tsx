import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { formatDate } from '../lib/utils';
import { ArrowLeft, ExternalLink } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/alerts')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:hover:text-gray-100">
        <ArrowLeft className="h-4 w-4" /> Back to Alerts
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{alert.alert_name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Source: {alert.source_platform} | ID: {alert.source_alert_id}</p>
        </div>
        <div className="flex items-center gap-3">
          <SeverityBadge severity={alert.severity} />
          <StatusBadge status={alert.alert_status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Alert Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div><dt className="text-sm text-gray-500 dark:text-gray-400">Customer</dt><dd className="font-medium">{alert.customer_name}</dd></div>
              <div><dt className="text-sm text-gray-500 dark:text-gray-400">Category</dt><dd className="font-medium">{alert.alert_category || 'N/A'}</dd></div>
              <div><dt className="text-sm text-gray-500 dark:text-gray-400">Source IP</dt><dd className="font-mono text-sm">{alert.source_ip || 'N/A'}</dd></div>
              <div><dt className="text-sm text-gray-500 dark:text-gray-400">Destination IP</dt><dd className="font-mono text-sm">{alert.destination_ip || 'N/A'}</dd></div>
              <div><dt className="text-sm text-gray-500 dark:text-gray-400">Actor / Entity</dt><dd className="font-medium">{alert.actor_entity || 'N/A'}</dd></div>
              <div><dt className="text-sm text-gray-500 dark:text-gray-400">Risk Score</dt><dd className="font-medium">{alert.risk_score ?? 'N/A'}</dd></div>
              <div><dt className="text-sm text-gray-500 dark:text-gray-400">Created</dt><dd>{formatDate(alert.alert_created_at)}</dd></div>
              <div><dt className="text-sm text-gray-500 dark:text-gray-400">Ingested</dt><dd>{formatDate(alert.ingested_at)}</dd></div>
            </dl>
            {alert.alert_description && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{alert.alert_description}</p>
              </div>
            )}
          </div>

          {/* Raw JSON */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Raw Alert Data</h2>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs max-h-96">
              {JSON.stringify(alert.source_raw_json, null, 2)}
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-2">
              {alert.alert_status === 'new' && (
                <button onClick={() => statusMutation.mutate('in_progress')} className="btn-primary w-full">Take Ownership</button>
              )}
              <button onClick={() => statusMutation.mutate('escalated')} className="btn-secondary w-full">Escalate</button>
              <button onClick={() => statusMutation.mutate('false_positive')} className="btn-secondary w-full">Mark False Positive</button>
              <button onClick={() => statusMutation.mutate('resolved')} className="btn-secondary w-full">Resolve</button>
            </div>
          </div>

          {alert.tags?.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {alert.tags.map((tag: string) => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 dark:text-gray-300 rounded text-xs">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {alert.mitre_techniques?.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">MITRE ATT&CK</h2>
              <div className="flex flex-wrap gap-2">
                {alert.mitre_techniques.map((t: string) => (
                  <span key={t} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-mono">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
