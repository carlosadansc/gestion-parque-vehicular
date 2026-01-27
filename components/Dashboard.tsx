
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Vehicle, Driver, FuelEntry, Incident } from '../types';

interface DashboardProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  fuelEntries: FuelEntry[];
  incidents: Incident[];
}

const Dashboard: React.FC<DashboardProps> = ({ vehicles = [], drivers = [], fuelEntries = [], incidents = [] }) => {
  // 1. Cálculos de Estadísticas Reales
  const totalFuelCost = useMemo(() => fuelEntries.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0), [fuelEntries]);
  const criticalIncidents = useMemo(() => incidents.filter(i => i.status === 'critical').length, [incidents]);
  const activeDrivers = useMemo(() => drivers.filter(d => d.status === 'en-route').length, [drivers]);

  // 2. Procesamiento de datos para el Gráfico (Gastos por mes últimos 6 meses)
  const chartData = useMemo(() => {
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const now = new Date();
    const last6Months = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        name: months[d.getMonth()],
        value: 0
      });
    }

    fuelEntries.forEach(entry => {
      if (!entry.date) return;
      const entryDate = new Date(entry.date);
      const entryMonth = entryDate.getMonth();
      const entryYear = entryDate.getFullYear();

      const monthData = last6Months.find(m => m.monthIndex === entryMonth && m.year === entryYear);
      if (monthData) {
        monthData.value += (Number(entry.cost) || 0);
      }
    });

    return last6Months;
  }, [fuelEntries]);

  // 3. Eventos Recientes Combinados (Incidencias + Cargas de Combustible)
  const recentEvents = useMemo(() => {
    const combined = [
      ...incidents.map(i => {
        const driver = drivers.find(d => d.id === i.driverId);
        const vehicle = vehicles.find(v => v.id === i.vehicleId);
        return {
          id: i.id,
          type: 'incident',
          title: i.title || 'Incidencia',
          desc: `${driver?.name || 'Chofer'} • ${vehicle?.plate || 'Placa'}`,
          date: i.date ? new Date(i.date) : new Date(),
          icon: i.type === 'mechanical' ? 'handyman' : i.type === 'accident' ? 'emergency' : 'warning',
          color: i.status === 'critical' ? 'rose' : 'amber'
        };
      }),
      ...fuelEntries.map(f => {
        const driver = drivers.find(d => d.id === f.driverId);
        const vehicle = vehicles.find(v => v.id === f.vehicleId);
        return {
          id: f.id,
          type: 'fuel',
          title: `Carga: ${f.liters}L`,
          desc: `${vehicle?.plate || 'Vehículo'} • ${driver?.name || 'Chofer'}`,
          date: f.date ? new Date(f.date) : new Date(),
          icon: 'local_gas_station',
          color: 'blue'
        };
      })
    ];

    return combined
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  }, [incidents, fuelEntries, drivers, vehicles]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Vehículos" 
          value={(vehicles?.length || 0).toString()} 
          trend="Inventario" 
          icon="local_shipping" 
          color="blue" 
        />
        <StatCard 
          label="Choferes en Ruta" 
          value={(activeDrivers || 0).toString()} 
          trend="Operativos" 
          icon="badge" 
          color="indigo" 
        />
        <StatCard 
          label="Gasto Combustible" 
          value={`$${(totalFuelCost || 0).toLocaleString()}`} 
          trend="Histórico" 
          icon="payments" 
          color="orange" 
        />
        <StatCard 
          label="Alertas Críticas" 
          value={(criticalIncidents || 0).toString()} 
          trend="Acción Requerida" 
          icon="report_problem" 
          color="rose" 
          isAlert={criticalIncidents > 0} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Gastos de Combustible</h3>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Análisis de costos mensuales (Real)</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="size-2 bg-[#135bec] rounded-full"></span>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Inversión en MXN</span>
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#135bec" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#135bec" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                  itemStyle={{ fontWeight: 900, color: '#135bec' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#135bec" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Actividad Reciente</h3>
            <span className="material-symbols-outlined text-slate-300">history</span>
          </div>
          <div className="space-y-7">
            {recentEvents.length > 0 ? recentEvents.map((event) => (
              <ActivityItem 
                key={event.id}
                icon={event.icon} 
                title={event.title} 
                desc={event.desc} 
                time={event.date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                color={event.color} 
              />
            )) : (
              <div className="py-20 text-center opacity-30">
                <span className="material-symbols-outlined text-4xl block mb-2">inventory_2</span>
                <p className="text-xs font-black uppercase tracking-widest">Sin actividad reciente</p>
              </div>
            )}
          </div>
          {recentEvents.length > 0 && (
            <button className="w-full mt-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#135bec] bg-blue-50 hover:bg-blue-100 rounded-xl transition-all">
              Ver todo el historial
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string, trend: string, icon: string, color: string, isAlert?: boolean }> = ({ label, value, trend, icon, color, isAlert }) => {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    orange: 'bg-orange-50 text-orange-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${colorMap[color]}`}>
          <span className="material-symbols-outlined filled text-2xl">{icon}</span>
        </div>
        <span className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isAlert ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-500'}`}>
          {trend}
        </span>
      </div>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">{label}</p>
      <p className="text-slate-900 text-3xl font-black tracking-tighter">{value}</p>
    </div>
  );
};

const ActivityItem: React.FC<{ icon: string, title: string, desc: string, time: string, color: string }> = ({ icon, title, desc, time, color }) => {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="flex gap-5 group cursor-pointer">
      <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 transition-all group-hover:rotate-12 ${colorMap[color]}`}>
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <div className="flex-1 border-b border-slate-50 pb-4">
        <div className="flex justify-between items-start">
          <p className="text-sm font-black text-slate-800 group-hover:text-[#135bec] transition-colors leading-tight">{title}</p>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{time}</span>
        </div>
        <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{desc}</p>
      </div>
    </div>
  );
};

export default Dashboard;
