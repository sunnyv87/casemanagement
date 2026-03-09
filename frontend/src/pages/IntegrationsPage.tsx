import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { formatDate, formatRelativeTime } from '../lib/utils';
import { Plus, X, Plug, RefreshCw, Trash2, TestTube } from 'lucide-react';

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
    securonix: 'bg-blue-100 text-blue-800', seceon: 'bg-teal-100 text-teal-800',
    splunk: 'bg-green-100 text-green-800', fortisoar: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">SIEM/SOAR Integrations</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> Add Integration</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.data?.map((integration: any) => (
            <div key={integration.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${platformColors[integration.platform] || 'bg-gray-100'}`}>
                    <Plug className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{integration.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{integration.platform}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${integration.status === 'active' ? 'bg-green-100 text-green-800' : integration.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                  {integration.status}
                </span>
              </div>

              <dl className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Customer</dt><dd className="font-medium">{integration.customer_name}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Mode</dt><dd className="capitalize">{integration.ingestion_mode}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Polling</dt><dd>{integration.polling_interval_seconds}s</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Last Poll</dt><dd>{integration.last_poll_at ? formatRelativeTime(integration.last_poll_at) : 'Never'}</dd></div>
                {integration.bidirectional_sync && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Bidirectional</dt><dd className="text-green-600">Yes</dd></div>}
              </dl>

              {integration.last_error && (
                <p className="text-xs text-red-600 mb-3 p-2 bg-red-50 rounded">{integration.last_error}</p>
              )}

              <div className="flex gap-2">
                <button onClick={() => testMutation.mutate(integration.id)} className="btn-secondary flex-1 text-xs py-1.5 flex items-center justify-center gap-1">
                  <TestTube className="h-3 w-3" /> Test
                </button>
                <button onClick={() => { if (confirm('Delete this integration?')) deleteMutation.mutate(integration.id); }} className="btn-danger text-xs py-1.5 px-3">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}

          {(!data?.data || data.data.length === 0) && (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              <Plug className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No integrations configured</p>
              <p className="text-sm">Add your first SIEM/SOAR integration to start ingesting alerts</p>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Add Integration</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
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
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label><input type="text" className="input-field" required value={newIntegration.name} onChange={e => setNewIntegration(i => ({ ...i, name: e.target.value }))} placeholder="e.g., Acme Securonix Production" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base URL *</label><input type="url" className="input-field" required value={newIntegration.base_url} onChange={e => setNewIntegration(i => ({ ...i, base_url: e.target.value }))} placeholder="https://instance.example.com" /></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Auth Type</label>
                <select className="input-field" value={newIntegration.auth_type} onChange={e => setNewIntegration(i => ({ ...i, auth_type: e.target.value }))}>
                  <option value="bearer_token">Bearer Token</option><option value="api_key">API Key</option>
                  <option value="basic">Basic Auth</option><option value="oauth2">OAuth 2.0</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Polling Interval (s)</label><input type="number" className="input-field" min={30} value={newIntegration.polling_interval_seconds} onChange={e => setNewIntegration(i => ({ ...i, polling_interval_seconds: parseInt(e.target.value) }))} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mode</label>
                  <select className="input-field" value={newIntegration.ingestion_mode} onChange={e => setNewIntegration(i => ({ ...i, ingestion_mode: e.target.value }))}>
                    <option value="pull">Pull (Polling)</option><option value="push">Push (Webhook)</option><option value="both">Both</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Integration'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
