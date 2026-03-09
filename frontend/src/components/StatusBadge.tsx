import React from 'react';
import { cn, getStatusColor } from '../lib/utils';

interface Props {
  status: string;
  className?: string;
}

const statusLabels: Record<string, string> = {
  new: 'New',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  pending_customer: 'Pending Customer',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
  false_positive: 'False Positive',
};

export default function StatusBadge({ status, className }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      getStatusColor(status),
      className
    )}>
      {statusLabels[status] || status}
    </span>
  );
}
