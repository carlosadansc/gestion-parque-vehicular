
import React from 'react';
import { View } from '../types';
import NotificationCenter, { NotificationItem } from './NotificationCenter';

interface HeaderProps {
  title: string;
  isSyncing: boolean;
  syncStatus: 'synced' | 'pending' | 'error';
  onSync: () => void;
  view: View;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  notifications?: NotificationItem[];
  notificationUserKey?: string;
  onOpenNotification?: (item: NotificationItem) => void;
}

const Header: React.FC<HeaderProps> = ({ isSyncing, syncStatus, onSync, searchQuery, onSearchChange, darkMode, onToggleDarkMode, notifications = [], notificationUserKey, onOpenNotification }) => {
  const statusColor = syncStatus === 'synced' ? 'text-emerald-600' : syncStatus === 'error' ? 'text-red-500' : 'text-amber-500';
  const statusBg = syncStatus === 'synced' ? 'bg-emerald-50' : syncStatus === 'error' ? 'bg-red-50' : 'bg-amber-50';
  const statusIcon = syncStatus === 'synced' ? 'cloud_done' : syncStatus === 'error' ? 'cloud_off' : 'cloud_queue';

  return (
    <header className="h-16 bg-surface/95 border-b border-border flex items-center justify-between px-5 md:px-8 shrink-0 backdrop-blur transition-colors">
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${statusBg} border-border shadow-sm transition-colors dark:border-opacity-10 dark:bg-opacity-10`}>
          <span className={`material-symbols-outlined text-base ${isSyncing ? 'animate-spin text-blue-500' : statusColor}`}>
            {isSyncing ? 'sync' : statusIcon}
          </span>
          <button 
            onClick={onSync}
            disabled={isSyncing}
            className="text-xs font-medium text-text-muted hover:text-text transition-colors"
          >
            {isSyncing ? 'Actualizando...' : syncStatus === 'synced' ? 'Sincronizado' : 'Sincronizar'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onOpenNotification && (
          <NotificationCenter
            items={notifications}
            userKey={notificationUserKey}
            onOpen={onOpenNotification}
          />
        )}
        {onToggleDarkMode && (
          <button 
            onClick={onToggleDarkMode} 
            className="btn-icon rounded-xl border border-border bg-surface-subtle hover:bg-surface"
            title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <span className="material-symbols-outlined">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        )}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg">search</span>
          <input 
            className="w-44 sm:w-56 lg:w-72 h-10 pl-10 pr-3 rounded-xl bg-surface-subtle border border-border text-sm shadow-sm focus:bg-surface focus:border-primary transition-colors text-text"
            placeholder="Buscar..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
