import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function formatRelativeTime(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
    informational: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return colors[severity?.toLowerCase()] || colors.informational;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    assigned: 'bg-indigo-100 text-indigo-800',
    in_progress: 'bg-purple-100 text-purple-800',
    pending_customer: 'bg-yellow-100 text-yellow-800',
    escalated: 'bg-red-100 text-red-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    false_positive: 'bg-gray-100 text-gray-600',
  };
  return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

export function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    securonix: 'S',
    seceon: 'Se',
    splunk: 'Sp',
    fortisoar: 'F',
    manual: 'M',
  };
  return icons[platform] || '?';
}

export function getPriorityLabel(priority: string): string {
  return priority?.toUpperCase() || 'N/A';
}
