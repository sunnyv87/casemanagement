import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import {
  LayoutDashboard, AlertTriangle, FolderOpen, Building2, Users,
  Plug, FileText, ScrollText, Bell, LogOut, Menu, X, ChevronDown, Shield,
  Sun, Moon
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

const navSections = [
  {
    title: 'Operations',
    items: ['/dashboard', '/alerts', '/cases'],
  },
  {
    title: 'Management',
    items: ['/customers', '/users', '/integrations', '/reports', '/audit'],
  },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notification-dropdown]')) {
        setNotificationsOpen(false);
      }
    };
    if (notificationsOpen) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [notificationsOpen]);

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get('/notifications?unread=true&limit=5').then(r => r.data),
    refetchInterval: 30000,
  });

  const unreadCount = notifications?.unread_count || 0;
  const notificationItems = notifications?.items || [];
  const filteredNav = navItems.filter(item => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className={cn('min-h-screen flex', isDark ? 'bg-slate-950 text-gray-100' : 'bg-gray-50 text-gray-900')}>
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
        isDark
          ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800/50'
          : 'bg-white border-r border-gray-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className={cn(
          'flex items-center justify-between h-16 px-6 border-b',
          isDark ? 'border-slate-800/50' : 'border-gray-200'
        )}>
          <div className="flex items-center gap-2">
            <Shield className={cn('h-8 w-8', isDark ? 'text-blue-400' : 'text-blue-600')} />
            <div>
              <h1 className={cn('font-bold text-lg leading-tight', isDark ? 'text-white' : 'text-gray-900')}>
                TechD SOC
              </h1>
              <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>Case Management</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className={cn(
            'lg:hidden transition-colors',
            isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'
          )}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation sections */}
        <nav className="mt-4 px-3 flex-1 overflow-y-auto">
          {navSections.map(section => {
            const sectionItems = filteredNav.filter(item => section.items.includes(item.to));
            if (sectionItems.length === 0) return null;
            const isCollapsed = collapsedSections[section.title];

            return (
              <div key={section.title} className="mb-4">
                <button
                  onClick={() => toggleSection(section.title)}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded transition-colors',
                    isDark
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  {section.title}
                  <ChevronDown className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    isCollapsed ? '-rotate-90' : 'rotate-0'
                  )} />
                </button>

                <div className={cn(
                  'overflow-hidden transition-all duration-300 ease-in-out',
                  isCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
                )}>
                  <div className="mt-1 space-y-0.5">
                    {sectionItems.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) => cn(
                          'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                          isActive
                            ? isDark
                              ? 'bg-blue-600/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                              : 'bg-blue-50 text-blue-700'
                            : isDark
                              ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        )}
                      >
                        {/* Active indicator bar */}
                        {({ isActive }: { isActive: boolean }) => (
                          <>
                            <span className={cn(
                              'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300',
                              isActive
                                ? isDark
                                  ? 'h-6 bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                                  : 'h-6 bg-blue-600'
                                : 'h-0 bg-transparent'
                            )} />
                            <item.icon className={cn(
                              'h-5 w-5 flex-shrink-0 transition-colors duration-200',
                              isActive
                                ? isDark ? 'text-blue-400' : 'text-blue-600'
                                : isDark ? 'text-slate-400 group-hover:text-slate-200' : 'text-gray-400 group-hover:text-gray-700'
                            )} />
                            <span>{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className={cn(
          'absolute bottom-0 left-0 right-0 p-4 border-t',
          isDark ? 'border-slate-800/50' : 'border-gray-200'
        )}>
          <div className="flex items-center gap-3 px-2">
            <div className="relative">
              <div className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-medium',
                isDark ? 'bg-blue-600' : 'bg-blue-600'
              )}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              {/* Online status indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-slate-900" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium truncate', isDark ? 'text-white' : 'text-gray-900')}>
                {user?.firstName} {user?.lastName}
              </p>
              <p className={cn('text-xs capitalize', isDark ? 'text-slate-400' : 'text-gray-500')}>
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - glass effect */}
        <header className={cn(
          'h-16 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-xl',
          isDark
            ? 'bg-slate-900/70 border-b border-slate-800/50'
            : 'bg-white/70 border-b border-gray-200'
        )}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className={cn(
              'lg:hidden transition-colors',
              isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
            )}>
              <Menu className="h-6 w-6" />
            </button>

            {/* Live clock */}
            <div className={cn(
              'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono',
              isDark ? 'bg-slate-800/50 text-slate-300' : 'bg-gray-100 text-gray-600'
            )}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              {formattedTime}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                'p-2 rounded-lg transition-all duration-200',
                isDark
                  ? 'text-slate-400 hover:text-yellow-400 hover:bg-slate-800'
                  : 'text-gray-500 hover:text-amber-500 hover:bg-gray-100'
              )}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notifications dropdown */}
            <div className="relative" data-notification-dropdown>
              <button
                onClick={() => setNotificationsOpen(prev => !prev)}
                className={cn(
                  'relative p-2 rounded-lg transition-all duration-200',
                  isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                )}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-slate-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {notificationsOpen && (
                <div className={cn(
                  'absolute right-0 mt-2 w-80 rounded-xl shadow-2xl border overflow-hidden transition-all duration-200 origin-top-right',
                  isDark
                    ? 'bg-slate-900 border-slate-700/50 shadow-black/40'
                    : 'bg-white border-gray-200 shadow-gray-300/40'
                )}>
                  <div className={cn(
                    'px-4 py-3 border-b font-semibold text-sm',
                    isDark ? 'border-slate-700/50 text-white' : 'border-gray-100 text-gray-900'
                  )}>
                    Notifications
                    {unreadCount > 0 && (
                      <span className={cn(
                        'ml-2 px-2 py-0.5 text-xs rounded-full',
                        isDark ? 'bg-blue-600/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                      )}>
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notificationItems.length > 0 ? (
                      notificationItems.map((item: any, index: number) => (
                        <div
                          key={item.id || index}
                          className={cn(
                            'px-4 py-3 border-b last:border-0 transition-colors cursor-pointer',
                            isDark
                              ? 'border-slate-800/50 hover:bg-slate-800/50'
                              : 'border-gray-50 hover:bg-gray-50'
                          )}
                        >
                          <p className={cn(
                            'text-sm font-medium',
                            isDark ? 'text-slate-200' : 'text-gray-800'
                          )}>
                            {item.title || 'Notification'}
                          </p>
                          <p className={cn(
                            'text-xs mt-0.5',
                            isDark ? 'text-slate-400' : 'text-gray-500'
                          )}>
                            {item.message || item.body || ''}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className={cn(
                        'px-4 py-8 text-center text-sm',
                        isDark ? 'text-slate-500' : 'text-gray-400'
                      )}>
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="flex items-center gap-2 ml-2">
              <div className="text-right hidden sm:block">
                <p className={cn('text-sm font-medium', isDark ? 'text-slate-200' : 'text-gray-700')}>
                  {user?.firstName} {user?.lastName}
                </p>
                <p className={cn('text-xs capitalize', isDark ? 'text-slate-400' : 'text-gray-500')}>
                  {user?.role}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  isDark
                    ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
                    : 'text-gray-500 hover:text-red-600 hover:bg-gray-100'
                )}
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content with smooth transitions */}
        <main className={cn(
          'flex-1 p-6 transition-colors duration-300',
          isDark ? 'bg-slate-950' : 'bg-gray-50'
        )}>
          <div className="animate-[fadeIn_0.3s_ease-in-out]">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
