
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

  const navButtonClass = (isActive: boolean, extra = '') =>
    `group flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-sm transition-colors ${
      isActive ? 'bg-primary text-white' : 'text-text-muted hover:text-text hover:bg-surface-subtle'
    } ${extra}`.trim();

  const navIconClass = (isActive: boolean) =>
    `material-symbols-outlined ui-icon text-[20px] ${
      isActive ? 'text-white' : 'text-text-muted group-hover:text-text'
    }`;

  return (
    <aside 
      className="w-60 flex flex-col shrink-0 z-50 bg-surface border-r border-border transition-colors transition-opacity"
    >
      <div className="p-4 flex-1 flex flex-col min-h-0 h-full">
        <div className="flex items-center gap-3 mb-6">
          <img alt="DIF" className="w-10 h-10 object-contain" src="/images/logo-dif.png" />
          <div className="flex flex-col min-w-0">
            <h1 className="text-text text-sm font-medium truncate">{appName}</h1>
            <p className="text-text-muted text-xs">Gestión Vehicular</p>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto min-h-0">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={navButtonClass(activeView === item.id)}
            >
              <span className={navIconClass(activeView === item.id)}>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
          
          {currentUser?.role === 'admin' && (
            <>
              <div className="my-3 border-t border-border"></div>
              <button
                onClick={() => onViewChange(View.USERS)}
                className={navButtonClass(activeView === View.USERS)}
              >
                <span className={navIconClass(activeView === View.USERS)}>group</span>
                <span className="font-medium">Usuarios</span>
              </button>
            </>
          )}

          <button
            onClick={() => onViewChange(View.SETTINGS)}
            className={navButtonClass(activeView === View.SETTINGS, 'mt-auto')}
          >
            <span className={navIconClass(activeView === View.SETTINGS)}>settings</span>
            <span className="font-medium">Configuración</span>
          </button>
        </nav>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white text-xs font-medium">
              {currentUser?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-text text-sm truncate">{currentUser?.name}</p>
              <p className="text-text-muted text-xs">{currentUser?.role === 'admin' ? 'Admin' : 'Usuario'}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-text-muted hover:text-text hover:bg-surface-subtle transition-colors text-sm">
            <span className="material-symbols-outlined ui-icon text-[18px]">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
