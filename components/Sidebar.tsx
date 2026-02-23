
import React from 'react';
import { View, User } from '../types';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  appName: string;
  currentUser: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, appName, currentUser, onLogout }) => {
  const menuItems = [
    { id: View.DASHBOARD, label: 'Panel Principal', icon: 'dashboard' },
    { id: View.REPORTS, label: 'Reportes', icon: 'bar_chart' },
    { id: View.VEHICLES, label: 'Vehículos', icon: 'directions_car' },
    { id: View.DRIVERS, label: 'Choferes', icon: 'person' },
    { id: View.INSPECTIONS, label: 'Revisiones', icon: 'fact_check' },
    { id: View.MAINTENANCE, label: 'Mantenimiento', icon: 'handyman' },
    { id: View.PLANNING, label: 'Planeación', icon: 'calendar_month' },
    { id: View.TRAVEL_LOGS, label: 'Bitácora', icon: 'route' },
    { id: View.FUEL, label: 'Combustible', icon: 'local_gas_station' },
    { id: View.INCIDENTS, label: 'Incidencias', icon: 'report_problem' },
  ];

  return (
    <aside 
      className="w-64 flex flex-col shrink-0 z-50 border-r border-slate-200/50"
      style={{ backgroundColor: '#0f172a' }}
    >
      <div className="p-5 flex-1 flex flex-col min-h-0 h-full">
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/10">
          <div className="bg-white/10 h-11 w-16 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <img alt="DIF Logo" className="w-9 h-9 object-contain" src="../images/logo-dif.png" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-white text-base font-semibold tracking-tight truncate">{appName}</h1>
            <p className="text-slate-400 text-[11px] font-medium mt-0.5">Sistema de Gestión</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 py-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-150 text-left ${
                activeView === item.id 
                  ? 'bg-primary/90 text-white shadow-sm' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span className={`material-symbols-outlined text-lg ${activeView === item.id ? 'filled' : ''}`}>{item.icon}</span>
              <p className="text-sm font-medium">{item.label}</p>
              {activeView === item.id && (
                <span className="ml-auto w-1 h-1.5 rounded-full bg-white/80"></span>
              )}
            </button>
          ))}
          
          {currentUser?.role === 'admin' && (
            <>
              <div className="my-3 border-t border-white/10"></div>
              <button
                onClick={() => onViewChange(View.USERS)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-150 text-left ${
                  activeView === View.USERS 
                    ? 'bg-primary/90 text-white shadow-sm' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-lg">group</span>
                <p className="text-sm font-medium">Usuarios</p>
              </button>
            </>
          )}

          <button
            onClick={() => onViewChange(View.SETTINGS)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-150 text-left mt-auto ${
              activeView === View.SETTINGS 
                ? 'bg-primary/90 text-white shadow-sm' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            <p className="text-sm font-medium">Configuración</p>
          </button>
        </nav>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 mb-3 px-2">
             <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary-foreground font-semibold text-xs text-white">
                {currentUser?.name?.[0]?.toUpperCase() || 'U'}
             </div>
             <div className="flex flex-col min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{currentUser?.name}</p>
                <p className="text-slate-500 text-[10px] font-medium truncate">{currentUser?.role === 'admin' ? 'Administrador' : 'Usuario'}</p>
             </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-sm font-medium">
            <span className="material-symbols-outlined text-lg">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
