
import React, { useState, useMemo } from 'react';
import { FuelEntry, Vehicle, Driver } from '../types';

interface FuelProps {
  fuelHistory: FuelEntry[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onAddFuel: (entry: Omit<FuelEntry, 'id'>) => Promise<void>;
  onSync: () => void;
}

const Fuel: React.FC<FuelProps> = ({ fuelHistory = [], vehicles = [], drivers = [], onAddFuel, onSync }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicleId: '',
    driverId: '',
    liters: '',
    cost: '',
    odometer: ''
  });

  const { processedHistory, globalAveragePerformance } = useMemo(() => {
    const entriesByVehicle: Record<string, FuelEntry[]> = {};
    fuelHistory.forEach(entry => {
      if (!entry.vehicleId) return;
      if (!entriesByVehicle[entry.vehicleId]) entriesByVehicle[entry.vehicleId] = [];
      entriesByVehicle[entry.vehicleId].push(entry);
    });

    const historyWithPerformance: (FuelEntry & { performance?: number })[] = [];
    let totalPerformanceSum = 0;
    let performanceCount = 0;

    Object.keys(entriesByVehicle).forEach(vehicleId => {
      const sorted = [...entriesByVehicle[vehicleId]].sort((a, b) => Number(a.odometer) - Number(b.odometer));
      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        const previous = i > 0 ? sorted[i - 1] : null;
        let performance: number | undefined = undefined;
        if (previous && Number(current.liters) > 0) {
          const distance = Number(current.odometer) - Number(previous.odometer);
          if (distance > 0) {
            performance = distance / Number(current.liters);
            totalPerformanceSum += performance;
            performanceCount++;
          }
        }
        historyWithPerformance.push({ ...current, performance });
      }
    });

    return {
      processedHistory: historyWithPerformance.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      }),
      globalAveragePerformance: performanceCount > 0 ? totalPerformanceSum / performanceCount : 0
    };
  }, [fuelHistory]);

  const totalCost = useMemo(() => fuelHistory.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0), [fuelHistory]);
  const totalLiters = useMemo(() => fuelHistory.reduce((acc, curr) => acc + (Number(curr.liters) || 0), 0), [fuelHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.liters || !formData.cost || !formData.driverId) return;

    setIsSaving(true);
    try {
      await onAddFuel({
        date: formData.date,
        vehicleId: formData.vehicleId,
        driverId: formData.driverId,
        liters: Number(formData.liters),
        cost: Number(formData.cost),
        odometer: Number(formData.odometer) || 0
      });
      setFormData({ 
        date: new Date().toISOString().split('T')[0],
        vehicleId: '', 
        driverId: '', 
        liters: '', 
        cost: '', 
        odometer: '' 
      });
      setShowModal(false);
    } catch (err) {
      alert("Error al guardar registro de combustible");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bitácora de Combustible</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Control de gastos y rendimiento por unidad.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#135bec] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
        >
          <span className="material-symbols-outlined text-xl">local_gas_station</span>
          Agregar Carga
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FuelStat label="Rendimiento Promedio" value={globalAveragePerformance > 0 ? globalAveragePerformance.toFixed(2) : "---"} unit="KM/L" icon="analytics" desc="Basado en historial de odómetro" />
        <FuelStat label="Gasto Total" value={`$${(totalCost || 0).toLocaleString()}`} icon="attach_money" trend="+12%" isNegativeTrend />
        <FuelStat label="Litros Totales" value={(totalLiters || 0).toLocaleString()} unit="L" icon="water_drop" desc={`${(fuelHistory?.length || 0)} cargas registradas`} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Historial de Consumo</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Listado completo de cargas realizadas</p>
          </div>
          <button onClick={onSync} className="text-[10px] font-black text-[#135bec] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all">
            <span className="material-symbols-outlined text-sm">sync</span> Sincronizar
          </button>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Vehículo</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Odómetro</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Litros</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right text-blue-600">Rendimiento</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedHistory.map((entry) => {
                const vehicle = vehicles.find(v => v.id === entry.vehicleId);
                const driver = drivers.find(d => d.id === entry.driverId);
                return (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-slate-700 font-bold text-[13px]">
                      {entry.date ? new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-black text-slate-900 text-sm tracking-tight">{vehicle?.plate || entry.vehicleId || 'S/P'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{driver?.name || entry.driverId || '---'}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-400 text-[12px]">{(Number(entry.odometer) || 0).toLocaleString()} km</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-700">{entry.liters || 0} L</td>
                    <td className="px-6 py-4 text-right">
                      {entry.performance ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-black text-[11px] border border-blue-100">
                          {entry.performance.toFixed(2)} KM/L
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-bold uppercase italic">Carga Inicial</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">${(Number(entry.cost) || 0).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Nueva Carga</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Registra el gasto de combustible</p>
              </div>
              <button 
                onClick={() => !isSaving && setShowModal(false)}
                disabled={isSaving}
                className="size-10 rounded-full hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-slate-400"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha de la Carga</label>
                <input 
                  type="date"
                  required disabled={isSaving}
                  className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vehículo</label>
                  <select 
                    required disabled={isSaving}
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50"
                    value={formData.vehicleId}
                    onChange={e => setFormData({...formData, vehicleId: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Conductor</label>
                  <select 
                    required disabled={isSaving}
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50"
                    value={formData.driverId}
                    onChange={e => setFormData({...formData, driverId: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Litros Cargados</label>
                  <div className="relative">
                    <input 
                      required disabled={isSaving}
                      type="number" step="0.01"
                      className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 pr-10 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50"
                      placeholder="0.00"
                      value={formData.liters}
                      onChange={e => setFormData({...formData, liters: e.target.value})}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">L</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Costo Total ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                    <input 
                      required disabled={isSaving}
                      type="number" step="0.01"
                      className="w-full bg-slate-50 border-slate-200 rounded-2xl pl-8 pr-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50"
                      placeholder="0.00"
                      value={formData.cost}
                      onChange={e => setFormData({...formData, cost: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lectura del Odómetro (Km)</label>
                <input 
                  required disabled={isSaving}
                  type="number"
                  className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50"
                  placeholder="Ej. 125400"
                  value={formData.odometer}
                  onChange={e => setFormData({...formData, odometer: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" disabled={isSaving}
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-2xl transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={isSaving}
                  className="flex-[2] py-4 bg-[#135bec] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-80 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                      Guardando...
                    </>
                  ) : (
                    'Guardar Registro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const FuelStat: React.FC<{ label: string, value: string, unit?: string, icon: string, trend?: string, isNegativeTrend?: boolean, desc?: string }> = ({ label, value, unit, icon, trend, isNegativeTrend, desc }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:border-blue-500/30 transition-all">
    <div className="flex items-center justify-between mb-4">
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{label}</p>
      <div className="bg-blue-50 text-blue-600 p-2 rounded-xl group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-slate-900 text-3xl font-black tracking-tighter">
        {value} {unit && <span className="text-lg text-slate-400 font-bold ml-1">{unit}</span>}
      </p>
      {trend && <p className={`${isNegativeTrend ? 'text-rose-600' : 'text-green-600'} text-[11px] font-black`}>{trend}</p>}
      {desc && <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{desc}</p>}
    </div>
  </div>
);

export default Fuel;
