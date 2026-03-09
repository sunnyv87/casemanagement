import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import {
  LayoutDashboard, AlertTriangle, FolderOpen, Building2, Users,
  Plug, FileText, ScrollText, Bell, LogOut, Menu, X, ChevronDown, Shield
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['customer', 'analyst', 'manager', 'admin'] },
  { to: '/alerts', icon: AlertTriangle, label: 'Alert Queue', roles: ['analyst', 'manager', 'admin'] },
  { to: '/cases', icon: FolderOpen, label: 'Cases', roles: ['customer', 'analyst', 'manager', 'admin'] },
  { to: '/customers', icon: Building2, label: 'Customers', roles: ['manager', 'admin'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['admin'] },
  { to: '/integrations', icon: Plug, label: 'Integrations', roles: ['admin'] },
  { to: '/reports', icon: FileText, label: 'Reports', roles: ['customer', 'manager', 'admin'] },
  { to: '/audit', icon: ScrollText, label: 'Audit Logs', roles: ['manager', 'admin'] },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get('/notifications?unread=true&limit=5').then(r => r.data),
    refetchInterval: 30000,
  });

  const unreadCount = notifications?.unread_count || 0;
  const filteredNav = navItems.filter(item => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary-400" />
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">TechD SOC</h1>
              <p className="text-gray-400 text-xs">Case Management</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 px-3 space-y-1">
          {filteredNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User menu */}
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-700">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 p-2 rounded-lg hover:bg-gray-100" title="Logout">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
