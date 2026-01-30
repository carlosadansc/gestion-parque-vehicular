
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
  const statusColor = syncStatus === 'synced' ? 'text-green-500' : syncStatus === 'error' ? 'text-rose-500' : 'text-amber-500';
  const statusIcon = syncStatus === 'synced' ? 'cloud_done' : syncStatus === 'error' ? 'cloud_off' : 'cloud_queue';

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0 sticky top-0 z-40">
      <div className="flex items-center gap-6">
        {/* <h2 className="text-slate-800 text-xl md:text-2xl font-black tracking-tight">{title}</h2> */}
        
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin text-blue-500' : statusColor}`}>
              {isSyncing ? 'sync' : statusIcon}
            </span>
            <span className="text-[10px] font-black uppercase tracking-tight text-slate-400">Google Sheets</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-300"></div>
          <button 
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 group"
          >
            <p className="text-[11px] text-slate-500 font-bold whitespace-nowrap group-hover:text-blue-600 transition-colors">
              {isSyncing ? 'Actualizando...' : syncStatus === 'synced' ? 'Datos al día' : 'Sincronizar ahora'}
            </p>
            <span className={`material-symbols-outlined text-sm text-slate-400 group-hover:text-blue-500 ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative w-64 md:w-72 lg:w-80 hidden xl:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input 
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-slate-100 border-transparent text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400" 
            placeholder="Buscar..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
          <div className="size-10 rounded-full bg-slate-200 border-2 border-blue-500/10 overflow-hidden ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all">
            <img alt="Perfil" className="w-full h-full object-cover" src="https://picsum.photos/seed/user1/100" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
