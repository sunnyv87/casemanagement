import React from 'react';
import { cn } from '../lib/utils';
import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'orange';
  subtitle?: string;
  trend?: { value: number; label: string };
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  red: 'bg-red-50 text-red-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
};

export default function StatsCard({ title, value, icon: Icon, color = 'blue', subtitle, trend }: Props) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          {trend && (
            <p className={cn('mt-1 text-sm font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', colorMap[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
