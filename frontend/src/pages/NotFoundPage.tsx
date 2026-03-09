import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600">404</h1>
      <p className="text-xl text-gray-500 dark:text-gray-400 mt-4">Page not found</p>
      <Link to="/dashboard" className="btn-primary mt-6 flex items-center gap-2">
        <Home className="h-4 w-4" /> Back to Dashboard
      </Link>
    </div>
  );
}
