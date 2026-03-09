import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatRelativeTime } from '../lib/utils';
import { ArrowLeft, Send, Clock, AlertTriangle, FileText, Link } from 'lucide-react';

const severityBorderColors: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-500',
};

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [rootCause, setRootCause] = useState('');

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => api.get(`/cases/${id}`).then(r => r.data),
  });

  const commentMutation = useMutation({
    mutationFn: (data: { content: string; is_internal: boolean }) => api.post(`/cases/${id}/comments`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['case', id] }); setComment(''); },
  });

  const statusMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/cases/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['case', id] }); setShowResolve(false); },
  });

  const escalateMutation = useMutation({
    mutationFn: (data: any) => api.post(`/cases/${id}/escalate`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['case', id] }),
  });

  const closeMutation = useMutation({
    mutationFn: () => api.post(`/cases/${id}/close`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['case', id] }),
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  if (!caseData) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Case not found</div>;

  const c = caseData;

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={() => navigate('/cases')} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Cases
      </button>

      {/* Case Header with severity accent border */}
      <div className={`border-l-4 ${severityBorderColors[c.severity] || 'border-l-gray-400'} bg-white dark:bg-dark-800 rounded-xl p-5 shadow-sm`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{c.case_number}</h1>
              <SeverityBadge severity={c.severity} />
              <StatusBadge status={c.status} />
              <span className={`font-medium text-sm ${c.priority === 'P1' ? 'text-red-600' : c.priority === 'P2' ? 'text-orange-600' : 'text-gray-600 dark:text-gray-400'}`}>{c.priority}</span>
            </div>
            <h2 className="text-lg text-gray-700 dark:text-gray-300 mt-1">{c.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{c.customer_name} | Created {formatDate(c.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {c.description && (
            <div className="card border border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{c.description}</p>
            </div>
          )}

          {/* Resolution */}
          {c.resolution_notes && (
            <div className="card border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <h3 className="text-lg font-semibold mb-3 text-green-800 dark:text-green-300">Resolution</h3>
              <p className="text-green-700 dark:text-green-300 whitespace-pre-wrap">{c.resolution_notes}</p>
              {c.root_cause && <p className="mt-2 text-sm text-green-600 dark:text-green-400"><strong>Root Cause:</strong> {c.root_cause}</p>}
            </div>
          )}

          {/* Linked Alerts */}
          {c.alerts?.length > 0 && (
            <div className="card border border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Linked Alerts ({c.alerts.length})</h3>
              <div className="space-y-2">
                {c.alerts.map((a: any) => (
                  <div key={a.alert_id} onClick={() => navigate(`/alerts/${a.alert_id}`)} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={a.severity} />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.alert_name}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{a.source_platform}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline / Comments */}
          <div className="card border border-gray-200 dark:border-dark-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Activity Timeline</h3>
            <div className="space-y-4">
              {c.comments?.map((comment: any) => (
                <div
                  key={comment.id}
                  className={`p-4 rounded-lg border ${
                    comment.is_internal
                      ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-700/50 dark:bg-yellow-900/20'
                      : comment.comment_type === 'customer_query'
                        ? 'border-blue-200 bg-blue-50 dark:border-blue-700/50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-dark-700 dark:bg-dark-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{comment.first_name} {comment.last_name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">({comment.role})</span>
                      {comment.is_internal && <span className="text-xs bg-yellow-200 dark:bg-yellow-800/60 text-yellow-800 dark:text-yellow-300 px-1.5 py-0.5 rounded">Internal</span>}
                      {comment.comment_type !== 'comment' && <span className="text-xs bg-gray-200 dark:bg-dark-600 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">{comment.comment_type.replace('_', ' ')}</span>}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatRelativeTime(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
              {(!c.comments || c.comments.length === 0) && <p className="text-gray-500 dark:text-gray-400 text-center py-4">No activity yet</p>}
            </div>

            {/* Add comment */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-700">
              <div className="flex gap-3">
                <textarea className="input-field flex-1" rows={2} placeholder={user?.role === 'customer' ? 'Add a query...' : 'Add a comment...'} value={comment} onChange={e => setComment(e.target.value)} />
                <div className="flex flex-col gap-2">
                  {user?.role !== 'customer' && (
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="rounded" />
                      Internal
                    </label>
                  )}
                  <button onClick={() => comment.trim() && commentMutation.mutate({ content: comment, is_internal: isInternal })} disabled={!comment.trim()} className="btn-primary py-1.5 px-3">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Actions */}
          <div className="card border border-gray-200 dark:border-dark-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Actions</h3>
            <div className="space-y-2">
              {c.status === 'new' && user?.role !== 'customer' && (
                <button onClick={() => statusMutation.mutate({ status: 'in_progress' })} className="btn-primary w-full">Start Working</button>
              )}
              {['assigned', 'in_progress'].includes(c.status) && user?.role !== 'customer' && (
                <>
                  <button onClick={() => setShowResolve(true)} className="btn-primary w-full">Resolve Case</button>
                  <button onClick={() => statusMutation.mutate({ status: 'pending_customer' })} className="btn-secondary w-full">Pending Customer</button>
                  <button onClick={() => escalateMutation.mutate({ reason: 'Requires manager review' })} className="btn-secondary w-full">Escalate</button>
                </>
              )}
              {c.status === 'pending_customer' && user?.role !== 'customer' && (
                <button onClick={() => statusMutation.mutate({ status: 'in_progress' })} className="btn-primary w-full">Resume</button>
              )}
              {c.status === 'resolved' && ['customer', 'manager', 'admin'].includes(user?.role || '') && (
                <button onClick={() => closeMutation.mutate()} className="btn-primary w-full">Close Case</button>
              )}
            </div>
          </div>

          {/* SLA Info */}
          <div className="card border border-gray-200 dark:border-dark-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-100"><Clock className="h-5 w-5" /> SLA Status</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Response SLA</p>
                  {c.sla_response_breached !== undefined && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.sla_response_breached ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                      {c.sla_response_breached ? 'Breached' : 'On Track'}
                    </span>
                  )}
                </div>
                <p className={`font-medium text-sm ${c.sla_response_breached ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {c.sla_response_breached ? 'Breached' : c.sla_response_due_at ? `Due ${formatRelativeTime(c.sla_response_due_at)}` : 'N/A'}
                </p>
                {!c.sla_response_breached && (
                  <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-1.5 mt-1.5">
                    <div className="bg-green-500 dark:bg-green-400 h-1.5 rounded-full" style={{ width: '65%' }} />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Resolution SLA</p>
                  {c.sla_resolution_breached !== undefined && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.sla_resolution_breached ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                      {c.sla_resolution_breached ? 'Breached' : 'On Track'}
                    </span>
                  )}
                </div>
                <p className={`font-medium text-sm ${c.sla_resolution_breached ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {c.sla_resolution_breached ? 'Breached' : c.sla_resolution_due_at ? `Due ${formatRelativeTime(c.sla_resolution_due_at)}` : 'N/A'}
                </p>
                {!c.sla_resolution_breached && (
                  <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-1.5 mt-1.5">
                    <div className="bg-green-500 dark:bg-green-400 h-1.5 rounded-full" style={{ width: '40%' }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Case Details */}
          <div className="card border border-gray-200 dark:border-dark-700">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Analyst</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{c.analyst_first_name ? `${c.analyst_first_name} ${c.analyst_last_name}` : 'Unassigned'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Type</dt><dd className="capitalize text-gray-900 dark:text-gray-100">{c.case_type?.replace('_', ' ')}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Created</dt><dd className="text-gray-900 dark:text-gray-100">{formatDate(c.created_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Updated</dt><dd className="text-gray-900 dark:text-gray-100">{formatRelativeTime(c.updated_at)}</dd></div>
              {c.resolved_at && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Resolved</dt><dd className="text-gray-900 dark:text-gray-100">{formatDate(c.resolved_at)}</dd></div>}
            </dl>
          </div>

          {/* Tags */}
          {c.tags?.length > 0 && (
            <div className="card border border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {c.tags.map((tag: string) => <span key={tag} className="px-2.5 py-1 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium">{tag}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolve && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-gray-200 dark:border-dark-700 w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Resolve Case</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution Summary *</label>
                <textarea className="input-field" rows={4} required value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="Describe the resolution..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Root Cause</label>
                <textarea className="input-field" rows={2} value={rootCause} onChange={e => setRootCause(e.target.value)} placeholder="Identified root cause..." />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowResolve(false)} className="btn-secondary">Cancel</button>
                <button onClick={() => resolutionNotes && statusMutation.mutate({ status: 'resolved', resolution_notes: resolutionNotes, root_cause: rootCause })} disabled={!resolutionNotes} className="btn-primary">Resolve Case</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
