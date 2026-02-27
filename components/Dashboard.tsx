
import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie 
} from 'recharts';
import { Vehicle, Driver, FuelEntry, Incident } from '../types';

interface DashboardProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  fuelEntries: FuelEntry[];
  incidents: Incident[];
}

const Dashboard: React.FC<DashboardProps> = ({ vehicles = [], drivers = [], fuelEntries = [], incidents = [] }) => {
  
  // --- 1. METRICAS DE VALOR (Business Intelligence) ---

  // A. Salud de la Flota (Algoritmo basado en los 16 puntos de inspección)
  const fleetHealthScore = useMemo(() => {
    if (vehicles.length === 0) return 0;
    
    const statusPoints: Record<string, number> = { 'Bien': 100, 'Regular': 70, 'Mal': 30, 'Muy Mal': 0 };
    const checkPoints = [
      'engineStatus', 'transmissionStatus', 'clutchStatus', 'brakesStatus', 
      'steeringStatus', 'suspensionStatus', 'shocksStatus', 'tiresStatus',
      'batteryStatus', 'lightsStatus', 'wipersStatus', 'hornStatus',
      'shifterStatus', 'speedoStatus', 'tempGaugeStatus', 'oilGaugeStatus'
    ];

    let totalScore = 0;
    let totalChecks = 0;

    vehicles.forEach(v => {
      checkPoints.forEach(key => {
        const val = (v as any)[key];
        if (val) {
          totalScore += statusPoints[val] || 100; // Asumimos 100 si no hay dato
          totalChecks++;
        }
      });
    });

    return totalChecks > 0 ? Math.round(totalScore / totalChecks) : 100;
  }, [vehicles]);

  // B. Eficiencia de Combustible Global ($/KM)
  const fuelEfficiency = useMemo(() => {
    const totalCost = fuelEntries.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
    // Estimación simplificada de KM recorridos basada en registros de combustible (max odo - min odo por auto)
    // Para mayor precisión se usaría TravelLogs, pero esto aprovecha lo que ya está en Fuel.
    let totalKm = 0;
    const vehicleOdos: Record<string, number[]> = {};
    
    fuelEntries.forEach(f => {
      if (!vehicleOdos[f.vehicleId]) vehicleOdos[f.vehicleId] = [];
      vehicleOdos[f.vehicleId].push(Number(f.odometer));
    });

    Object.values(vehicleOdos).forEach(odos => {
      if (odos.length > 1) {
        const min = Math.min(...odos);
        const max = Math.max(...odos);
        totalKm += (max - min);
      }
    });

    return totalKm > 0 ? totalCost / totalKm : 0;
  }, [fuelEntries]);

  // C. Disponibilidad Operativa
  const availabilityRate = useMemo(() => {
    if (vehicles.length === 0) return 0;
    const active = vehicles.filter(v => v.status === 'active').length;
    return Math.round((active / vehicles.length) * 100);
  }, [vehicles]);

  // --- 2. DATOS PARA GRÁFICOS ---

  // Gráfico de Gastos (Ultimos 6 meses)
  const financialData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const data = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[d.getMonth()]}`;
      
      const monthlyEntries = fuelEntries.filter(f => {
        const fDate = new Date(f.date);
        return fDate.getMonth() === d.getMonth() && fDate.getFullYear() === d.getFullYear();
      });

      const cost = monthlyEntries.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
      data.push({ name: key, value: cost });
    }
    return data;
  }, [fuelEntries]);

  // Gráfico de Incidencias por Tipo
  const incidentData = useMemo(() => {
    const counts: Record<string, number> = { mechanical: 0, traffic: 0, accident: 0, theft: 0 };
    incidents.forEach(i => {
      if (counts[i.type] !== undefined) counts[i.type]++;
    });
    
    return [
      { name: 'Mecánica', value: counts.mechanical, color: '#3b82f6' }, // Blue
      { name: 'Tránsito', value: counts.traffic, color: '#f59e0b' },   // Amber
      { name: 'Accidente', value: counts.accident, color: '#ef4444' }, // Red
      { name: 'Otros', value: counts.theft, color: '#8b5cf6' },        // Purple
    ].filter(d => d.value > 0);
  }, [incidents]);

  // Top Consumidores (Vehículos que más gastan)
  const topSpenders = useMemo(() => {
    const spending: Record<string, number> = {};
    fuelEntries.forEach(f => {
      spending[f.vehicleId] = (spending[f.vehicleId] || 0) + (Number(f.cost) || 0);
    });
    
    return Object.entries(spending)
      .map(([id, cost]) => {
        const v = vehicles.find(veh => veh.id === id);
        return { id, plate: v?.plate || '---', model: v?.model || 'Desconocido', cost };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 4);
  }, [fuelEntries, vehicles]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      
      {/* HEADER DE BIENVENIDA */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Panel General</h2>
          <p className="text-slate-500 font-medium mt-1">Resumen ejecutivo del estado de la flota vehicular</p>
        </div>
        <div className="flex gap-2">
           <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-500">
             {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
           </span>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Salud de Flota */}
        <div className="bg-slate-900 rounded-xl p-5 text-white relative overflow-hidden">
          <div className="absolute top-3 right-3 opacity-10">
            <span className="material-symbols-outlined text-6xl">health_and_safety</span>
          </div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">Salud Mecánica</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight">{fleetHealthScore}%</span>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Óptimo</span>
          </div>
          <div className="w-full bg-slate-700 h-1.5 mt-4 rounded-full overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${fleetHealthScore}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">{vehicles.length * 16} puntos de control</p>
        </div>

        {/* Disponibilidad */}
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex justify-between items-start mb-3">
             <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
               <span className="material-symbols-outlined filled text-xl">directions_car</span>
             </div>
             <span className={`text-xs font-medium px-2 py-0.5 rounded ${availabilityRate > 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
               {availabilityRate > 80 ? 'Alta' : 'Media'}
             </span>
          </div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Disponibilidad</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{availabilityRate}%</p>
          <p className="text-xs text-slate-500 mt-1">
            <span className="text-slate-700 font-medium">{vehicles.filter(v => v.status === 'active').length}</span> activos / 
            <span className="text-rose-600 font-medium"> {vehicles.filter(v => v.status === 'workshop').length}</span> taller
          </p>
        </div>

        {/* Costo por KM */}
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex justify-between items-start mb-3">
             <div className="size-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
               <span className="material-symbols-outlined filled text-xl">local_gas_station</span>
             </div>
          </div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Costo/Km</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            ${fuelEfficiency > 0 ? fuelEfficiency.toFixed(2) : '0.00'}
            <span className="text-sm text-slate-400 ml-1 font-medium">/km</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Eficiencia de combustible</p>
        </div>

        {/* Incidencias Críticas */}
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex justify-between items-start mb-3">
             <div className="size-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
               <span className="material-symbols-outlined filled text-xl">warning</span>
             </div>
             {incidents.filter(i => i.status === 'critical').length > 0 && (
               <span className="text-xs font-medium px-2 py-0.5 rounded bg-rose-100 text-rose-700">Pendiente</span>
             )}
          </div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Alertas Críticas</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{incidents.filter(i => i.status === 'critical').length}</p>
          <p className="text-xs text-slate-500 mt-1">Incidencias sin atender</p>
        </div>
      </div>

      {/* SECCIÓN GRÁFICA PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gráfico Financiero */}
        <div className="lg:col-span-2 bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Tendencia de Gastos</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Combustible (Últimos 6 Meses)</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                <span className="size-2 rounded-full bg-blue-600"></span> MXN (Neto)
            </div>
          </div>
          <div className="h-[300px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#135bec" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#135bec" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                  itemStyle={{ fontWeight: 900, color: '#135bec', fontSize: '12px' }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Gasto']}
                />
                <Area type="monotone" dataKey="value" stroke="#135bec" strokeWidth={4} fillOpacity={1} fill="url(#colorCost)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Incidencias */}
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 flex flex-col">
          <div className="mb-6">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Incidencias</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Distribución por Tipo</p>
          </div>
          <div className="flex-1 min-h-[250px] md:min-h-[300px] relative">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incidentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {incidentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)' }}
                     itemStyle={{ fontWeight: 800, fontSize: '11px' }}
                  />
                </PieChart>
             </ResponsiveContainer>
             {/* Centro del Donut */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                   <p className="text-3xl font-black text-slate-900">{incidents.length}</p>
                   <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Total</p>
                </div>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
             {incidentData.map((d, i) => (
               <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <div className="size-2 rounded-full" style={{backgroundColor: d.color}}></div>
                  {d.name} ({d.value})
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* SECCIÓN INFERIOR: TOP GASTOS Y ACTIVIDAD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Top Gastos */}
        <div className="card overflow-hidden">
           <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Mayores Consumidores</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Vehículos con mayor gasto acumulado</p>
           </div>
           <div className="p-4 md:p-6">
              {topSpenders.length > 0 ? topSpenders.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors group">
                   <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-xl flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        #{idx + 1}
                      </div>
                      <div>
                         <p className="text-sm font-black text-slate-900">{item.plate}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase">{item.model}</p>
                      </div>
                   </div>
                   <p className="text-sm font-black text-slate-900">${item.cost.toLocaleString()}</p>
                </div>
              )) : (
                <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Sin datos suficientes</div>
              )}
           </div>
        </div>

        {/* Actividad Reciente (Refinada) */}
        <div className="card overflow-hidden">
           <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Bitácora Reciente</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Últimos movimientos registrados</p>
           </div>
           <div className="p-4 md:p-6 space-y-2">
              {/* Combinamos incidencias y combustible para el feed */}
              {[
                ...incidents.slice(0, 3).map(i => ({...i, metaType: 'incident'})),
                ...fuelEntries.slice(0, 3).map(f => ({...f, metaType: 'fuel'}))
              ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((item: any, idx) => (
                 <div key={`${item.metaType}-${item.id}`} className="flex gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                    <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${item.metaType === 'incident' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                       <span className="material-symbols-outlined text-lg">{item.metaType === 'incident' ? 'warning' : 'local_gas_station'}</span>
                    </div>
                    <div className="flex-1">
                       <div className="flex justify-between">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            {item.metaType === 'incident' ? item.title : `Carga: ${item.liters} Litros`}
                          </p>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {new Date(item.date).toLocaleDateString()}
                          </span>
                       </div>
                       <p className="text-[10px] font-medium text-slate-500 mt-0.5 line-clamp-1">
                          {item.metaType === 'incident' ? item.description : `Costo: $${item.cost} - Km: ${item.odometer}`}
                       </p>
                    </div>
                 </div>
              ))}
              {fuelEntries.length === 0 && incidents.length === 0 && (
                 <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Sin actividad reciente</div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
