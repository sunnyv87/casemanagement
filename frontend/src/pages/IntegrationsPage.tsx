import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { formatDate, formatRelativeTime } from '../lib/utils';
import { Plus, X, Plug, RefreshCw, Trash2, TestTube, Activity, AlertCircle, Server, Layers } from 'lucide-react';

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    customer_id: '', platform: 'securonix', name: '', base_url: '', auth_type: 'bearer_token',
    credentials: { username: '', password: '', api_key: '', token: '' },
    ingestion_mode: 'pull', polling_interval_seconds: 60, bidirectional_sync: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get('/integrations').then(r => r.data),
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/integrations', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['integrations'] }); setShowCreate(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/integrations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/integrations/${id}/test`),
  });

  const platformColors: Record<string, string> = {
    securonix: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    seceon: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    splunk: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    fortisoar: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  };

  const integrations = data?.data || [];
  const totalCount = integrations.length;
  const activeCount = integrations.filter((i: any) => i.status === 'active').length;
  const errorCount = integrations.filter((i: any) => i.status === 'error').length;
  const uniquePlatforms = new Set(integrations.map((i: any) => i.platform)).size;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gradient Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 p-6 shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Plug className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">SIEM/SOAR Integrations</h1>
              <p className="text-sm text-white/70">Manage and monitor your security platform connections</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/30 hover:shadow-lg"
          >
            <Plus className="h-4 w-4" /> Add Integration
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Integrations</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Active</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{activeCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Error</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{errorCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Platforms</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{uniquePlatforms}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration: any) => (
            <div
              key={integration.id}
              className="card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${platformColors[integration.platform] || 'bg-gray-100 dark:bg-gray-800'}`}>
                    <Plug className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{integration.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{integration.platform}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  integration.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : integration.status === 'error'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {integration.status}
                </span>
              </div>

              <dl className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Customer</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{integration.customer_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Mode</dt>
                  <dd className="capitalize text-gray-700 dark:text-gray-300">{integration.ingestion_mode}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Polling</dt>
                  <dd className="text-gray-700 dark:text-gray-300">{integration.polling_interval_seconds}s</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Last Poll</dt>
                  <dd className="text-gray-700 dark:text-gray-400">
                    {integration.last_poll_at ? formatRelativeTime(integration.last_poll_at) : 'Never'}
                  </dd>
                </div>
                {integration.bidirectional_sync && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Bidirectional</dt>
                    <dd className="text-green-600 dark:text-green-400">Yes</dd>
                  </div>
                )}
              </dl>

              {integration.last_error && (
                <div className="text-xs text-red-600 dark:text-red-400 mb-3 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{integration.last_error}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => testMutation.mutate(integration.id)}
                  className="btn-secondary flex-1 text-xs py-1.5 flex items-center justify-center gap-1"
                >
                  <TestTube className="h-3 w-3" /> Test
                </button>
                <button
                  onClick={() => { if (confirm('Delete this integration?')) deleteMutation.mutate(integration.id); }}
                  className="btn-danger text-xs py-1.5 px-3"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}

          {integrations.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
                <Plug className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No integrations configured</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                Connect your first SIEM or SOAR platform to start ingesting security alerts and enable bidirectional case synchronization.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add Your First Integration
              </button>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Gradient accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 rounded-t-2xl" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                    <Plug className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add Integration</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Connect a new SIEM/SOAR platform</p>
                  </div>
                </div>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={e => { e.preventDefault(); createMutation.mutate(newIntegration); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer *</label>
                  <select className="input-field" required value={newIntegration.customer_id} onChange={e => setNewIntegration(i => ({ ...i, customer_id: e.target.value }))}>
                    <option value="">Select...</option>
                    {customers?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform *</label>
                  <select className="input-field" value={newIntegration.platform} onChange={e => setNewIntegration(i => ({ ...i, platform: e.target.value }))}>
                    <option value="securonix">Securonix SNYPR</option>
                    <option value="seceon">Seceon aiSIEM</option>
                    <option value="splunk">Splunk Enterprise Security</option>
                    <option value="fortisoar">FortiSOAR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input type="text" className="input-field" required value={newIntegration.name} onChange={e => setNewIntegration(i => ({ ...i, name: e.target.value }))} placeholder="e.g., Acme Securonix Production" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base URL *</label>
                  <input type="url" className="input-field" required value={newIntegration.base_url} onChange={e => setNewIntegration(i => ({ ...i, base_url: e.target.value }))} placeholder="https://instance.example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Auth Type</label>
                  <select className="input-field" value={newIntegration.auth_type} onChange={e => setNewIntegration(i => ({ ...i, auth_type: e.target.value }))}>
                    <option value="bearer_token">Bearer Token</option><option value="api_key">API Key</option>
                    <option value="basic">Basic Auth</option><option value="oauth2">OAuth 2.0</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Polling Interval (s)</label>
                    <input type="number" className="input-field" min={30} value={newIntegration.polling_interval_seconds} onChange={e => setNewIntegration(i => ({ ...i, polling_interval_seconds: parseInt(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mode</label>
                    <select className="input-field" value={newIntegration.ingestion_mode} onChange={e => setNewIntegration(i => ({ ...i, ingestion_mode: e.target.value }))}>
                      <option value="pull">Pull (Polling)</option><option value="push">Push (Webhook)</option><option value="both">Both</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Integration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
