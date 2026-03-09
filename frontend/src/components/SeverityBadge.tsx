import React from 'react';
import { cn, getSeverityColor } from '../lib/utils';

interface Props {
  severity: string;
  className?: string;
}

export default function SeverityBadge({ severity, className }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      'dark:border-opacity-50',
      getSeverityColor(severity),
      className
    )}>
      {severity?.charAt(0).toUpperCase() + severity?.slice(1)}
    </span>
  );
}
