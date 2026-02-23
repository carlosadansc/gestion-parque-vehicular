
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
  const statusColor = syncStatus === 'synced' ? 'text-emerald-600' : syncStatus === 'error' ? 'text-rose-500' : 'text-amber-500';
  const statusBg = syncStatus === 'synced' ? 'bg-emerald-50' : syncStatus === 'error' ? 'bg-rose-50' : 'bg-amber-50';
  const statusIcon = syncStatus === 'synced' ? 'cloud_done' : syncStatus === 'error' ? 'cloud_off' : 'cloud_queue';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border ${statusBg} border-slate-200/50`}>
          <div className="flex items-center gap-1.5">
            <span className={`material-symbols-outlined text-base ${isSyncing ? 'animate-spin text-blue-500' : statusColor}`}>
              {isSyncing ? 'sync' : statusIcon}
            </span>
            <span className="text-xs font-medium text-slate-600">Sincronización</span>
          </div>
          <div className="h-4 w-px bg-slate-300"></div>
          <button 
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 group"
          >
            <p className="text-xs font-medium text-slate-500 whitespace-nowrap group-hover:text-blue-600 transition-colors">
              {isSyncing ? 'Actualizando...' : syncStatus === 'synced' ? 'Actualizado' : 'Sincronizar'}
            </p>
            <span className={`material-symbols-outlined text-base text-slate-400 group-hover:text-blue-500 ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-64 hidden lg:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input 
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-sm font-medium focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-400" 
            placeholder="Buscar registros..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="size-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
            <img alt="Perfil" className="w-full h-full object-cover" src="https://picsum.photos/seed/user1/100" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
