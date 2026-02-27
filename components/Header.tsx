
import React from 'react';
import { View } from '../types';

interface HeaderProps {
  title: string;
  isSyncing: boolean;
  syncStatus: 'synced' | 'pending' | 'error';
  onSync: () => void;
  view: View;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const Header: React.FC<HeaderProps> = ({ title, isSyncing, syncStatus, onSync, view, searchQuery, onSearchChange }) => {
  const statusColor = syncStatus === 'synced' ? 'text-emerald-600' : syncStatus === 'error' ? 'text-red-500' : 'text-amber-500';
  const statusBg = syncStatus === 'synced' ? 'bg-emerald-50' : syncStatus === 'error' ? 'bg-red-50' : 'bg-amber-50';
  const statusIcon = syncStatus === 'synced' ? 'cloud_done' : syncStatus === 'error' ? 'cloud_off' : 'cloud_queue';

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${statusBg} border-slate-200`}>
          <span className={`material-symbols-outlined text-base ${isSyncing ? 'animate-spin text-blue-500' : statusColor}`}>
            {isSyncing ? 'sync' : statusIcon}
          </span>
          <button 
            onClick={onSync}
            disabled={isSyncing}
            className="text-xs font-medium text-slate-600 hover:text-blue-600 transition-colors"
          >
            {isSyncing ? 'Actualizando...' : syncStatus === 'synced' ? 'Sincronizado' : 'Sincronizar'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input 
            className="w-64 h-9 pl-9 pr-3 rounded-md bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-primary transition-colors" 
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