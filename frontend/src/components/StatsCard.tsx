import React from 'react';
import { cn } from '../lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'orange';
  subtitle?: string;
  trend?: { value: number; label: string };
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
  yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
};

const borderColorMap = {
  blue: 'border-l-blue-500',
  red: 'border-l-red-500',
  green: 'border-l-green-500',
  yellow: 'border-l-yellow-500',
  purple: 'border-l-purple-500',
  orange: 'border-l-orange-500',
};

export default function StatsCard({ title, value, icon: Icon, color = 'blue', subtitle, trend }: Props) {
  return (
    <div
      className={cn(
        'card border-l-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        'dark:bg-dark-800 dark:border-dark-700',
        borderColorMap[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100 animate-count-up">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          {trend && (
            <div className={cn('mt-1 flex items-center gap-1 text-sm font-medium', trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
              {trend.value >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', colorMap[color], 'dark:bg-gradient-to-br dark:from-current/10 dark:to-current/5')}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
