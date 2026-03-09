import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowRight, ShieldOff } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-fade-in relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary-500/5 dark:bg-primary-400/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Pulsing Shield Icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary-500/20 dark:bg-primary-400/20 rounded-full blur-xl animate-pulse" />
        <ShieldOff className="relative h-16 w-16 text-gray-400 dark:text-gray-500 animate-pulse" />
      </div>

      {/* Animated 404 with gradient text */}
      <h1 className="text-8xl font-extrabold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
        404
      </h1>

      <p className="text-xl text-gray-500 dark:text-gray-400 mt-4 text-center max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>

      <Link
        to="/dashboard"
        className="btn-primary mt-8 flex items-center gap-2 px-6 py-2.5 text-base group"
      >
        <Home className="h-4 w-4" />
        Back to Dashboard
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
