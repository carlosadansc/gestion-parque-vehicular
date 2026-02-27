
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
    { id: View.DASHBOARD, label: 'Panel', icon: 'dashboard' },
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
      className="w-60 flex flex-col shrink-0 z-50 bg-[#0f172a]"
    >
      <div className="p-4 flex-1 flex flex-col min-h-0 h-full">
        <div className="flex items-center gap-3 mb-6">
          <img alt="DIF" className="w-10 h-10 object-contain" src="../images/logo-dif.png" />
          <div className="flex flex-col min-w-0">
            <h1 className="text-white text-sm font-medium truncate">{appName}</h1>
            <p className="text-slate-500 text-xs">Gestión Vehicular</p>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto min-h-0">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-sm transition-colors ${
                activeView === item.id 
                  ? 'bg-primary text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
          
          {currentUser?.role === 'admin' && (
            <>
              <div className="my-3 border-t border-white/10"></div>
              <button
                onClick={() => onViewChange(View.USERS)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-sm transition-colors ${
                  activeView === View.USERS 
                    ? 'bg-primary text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-xl">group</span>
                <span className="font-medium">Usuarios</span>
              </button>
            </>
          )}

          <button
            onClick={() => onViewChange(View.SETTINGS)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-sm transition-colors mt-auto ${
              activeView === View.SETTINGS 
                ? 'bg-primary text-white' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-xl">settings</span>
            <span className="font-medium">Configuración</span>
          </button>
        </nav>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white text-xs font-medium">
              {currentUser?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-white text-sm truncate">{currentUser?.name}</p>
              <p className="text-slate-500 text-xs">{currentUser?.role === 'admin' ? 'Admin' : 'Usuario'}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-colors text-sm">
            <span className="material-symbols-outlined text-lg">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;