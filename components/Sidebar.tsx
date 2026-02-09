
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
    { id: View.DASHBOARD, label: 'Inicio', icon: 'dashboard' },
    { id: View.REPORTS, label: 'Reportes', icon: 'bar_chart' },
    { id: View.VEHICLES, label: 'Vehículos', icon: 'directions_car' },
    { id: View.DRIVERS, label: 'Choferes', icon: 'person' },
    { id: View.INSPECTIONS, label: 'Revisiones', icon: 'fact_check' },
    { id: View.MAINTENANCE, label: 'Mantenimiento', icon: 'handyman' },
    { id: View.PLANNING, label: 'Planeación', icon: 'calendar_month' },
    { id: View.TRAVEL_LOGS, label: 'Bitácora de viajes', icon: 'route' },
    { id: View.FUEL, label: 'Combustible', icon: 'local_gas_station' },
    { id: View.INCIDENTS, label: 'Incidencias', icon: 'report_problem' },
  ];

  return (
    <aside 
      className="w-64 md:w-72 flex flex-col shrink-0 z-50 transition-all duration-300 min-h-0"
      style={{ backgroundColor: 'var(--secondary-color, #0f172a)' }}
    >
      <div className="p-6 md:p-8 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-white h-12 w-13 px-2 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
            <img alt="DIF Logo" className="w-full h-full object-contain" src="../images/logo-dif.png" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-white text-lg md:text-xl font-black leading-none tracking-tight truncate">{appName}</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Gestión de Activos</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                activeView === item.id ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined ${activeView === item.id ? 'filled' : ''}`}>{item.icon}</span>
              <p className={`text-sm ${activeView === item.id ? 'font-bold' : 'font-medium'}`}>{item.label}</p>
            </button>
          ))}
          
          {currentUser?.role === 'admin' && (
            <>
              <div className="my-6 border-t border-white/10"></div>
              <button
                onClick={() => onViewChange(View.USERS)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeView === View.USERS ? 'bg-primary text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined">group</span>
                <p className="text-sm font-medium">Usuarios</p>
              </button>
            </>
          )}

          <button
            onClick={() => onViewChange(View.SETTINGS)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeView === View.SETTINGS ? 'bg-primary text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined">settings</span>
            <p className="text-sm font-medium">Ajustes</p>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
             <div className="size-10 rounded-lg bg-white/10 flex items-center justify-center text-white font-black text-xs">
                {currentUser?.name[0].toUpperCase()}
             </div>
             <div className="flex flex-col min-w-0">
                <p className="text-white text-xs font-black truncate">{currentUser?.name}</p>
                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest truncate">{currentUser?.role}</p>
             </div>
          </div>
          <button onClick={onLogout} className="w-full flex  items-center gap-3 py-2 px-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all">
            <span className="material-symbols-outlined">logout</span>
            <p className="text-xs font-black uppercase tracking-widest">Cerrar Sesión</p>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
