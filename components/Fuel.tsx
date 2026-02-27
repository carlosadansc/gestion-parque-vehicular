
import React, { useState, useMemo } from 'react';
import { FuelEntry, Vehicle, Driver, AppSetting } from '../types';

interface FuelProps {
  fuelHistory: FuelEntry[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onAddFuel: (entry: Omit<FuelEntry, 'id'>) => Promise<void>;
  onUpdateFuel: (entry: FuelEntry) => Promise<void>;
  onSync: () => void;
  settings?: AppSetting[];
}

const Fuel: React.FC<FuelProps> = ({ fuelHistory = [], vehicles = [], drivers = [], onAddFuel, onUpdateFuel, onSync, settings = [] }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FuelEntry | null>(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicleId: '',
    driverId: '',
    liters: '',
    cost: '',
    odometer: ''
  });

  const handleEdit = (entry: FuelEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date.split('T')[0],
      vehicleId: entry.vehicleId,
      driverId: entry.driverId,
      liters: String(entry.liters),
      cost: String(entry.cost),
      odometer: String(entry.odometer)
    });
    setShowModal(true);
  };

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    (settings || []).forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

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
      const entryData = {
        date: formData.date,
        vehicleId: formData.vehicleId,
        driverId: formData.driverId,
        liters: Number(formData.liters),
        cost: Number(formData.cost),
        odometer: Number(formData.odometer) || 0
      };

      if (editingEntry) {
        await onUpdateFuel({
          ...editingEntry,
          ...entryData
        });
      } else {
        await onAddFuel(entryData);
      }

      setFormData({ 
        date: new Date().toISOString().split('T')[0],
        vehicleId: '', 
        driverId: '', 
        liters: '', 
        cost: '', 
        odometer: '' 
      });
      setEditingEntry(null);
      setShowModal(false);
    } catch (err) {
      alert("Error al guardar registro de combustible");
    } finally {
      setIsSaving(false);
    }
  };

  // Variables institucionales para impresión
  // Normalizar la ruta del logo (convertir rutas relativas a absolutas)
  const rawLogo = settingsMap['APP_LOGO'] || '/images/logo-dif.png';
  const appLogo = rawLogo.startsWith('./') ? rawLogo.replace('./', '/') : rawLogo;
  const directorName = settingsMap['INSTITUTION_HEAD_NAME'] || 'Director General';
  const managerName = settingsMap['VEHICLE_MANAGER_NAME'] || 'Encargado del Parque Vehicular';

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
       <style>{`
         @media print {
           body * { 
             visibility: hidden; 
           }
           #fuel-printable, #fuel-printable * { 
             visibility: visible; 
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
           }
           #fuel-printable { 
             position: absolute; 
             left: 0; 
             top: 0; 
             width: 100%; 
             padding: 0; 
             margin: 0;
             background: white !important; 
             font-family: 'Inter', sans-serif;
           }
           .no-print { display: none !important; }
           @page { margin: 0.5cm; size: letter landscape; }
           /* Ensure tables fit on landscape page */
           #fuel-printable table {
             width: 100% !important;
             font-size: 8pt !important;
           }
           
            /* ========================================
               SIGNATURE SECTION - FLOWING WITH CONTENT
               ======================================== */
            #fuel-printable .signature-section {
              page-break-inside: avoid;
              margin-top: 2rem;
            }
            
            #fuel-printable .signature-line {
              border-top: 2px solid #1e293b;
              padding-top: 0.5rem;
              min-width: 200px;
            }
         }
       `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="page-title">Bitácora de Combustible</h2>
          <p className="page-subtitle">Control de gastos y rendimiento por unidad</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowPrintPreview(true)}
                className="btn btn-secondary"
            >
                <span className="material-symbols-outlined">print</span>
                Vista Previa
            </button>
            <button 
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
            >
            <span className="material-symbols-outlined">local_gas_station</span>
            Agregar Carga
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <FuelStat label="Rendimiento Promedio" value={globalAveragePerformance > 0 ? globalAveragePerformance.toFixed(2) : "---"} unit="KM/L" icon="analytics" desc="Basado en historial de odómetro" />
        <FuelStat label="Gasto Total" value={`$${(totalCost || 0).toLocaleString()}`} icon="attach_money" trend="+12%" isNegativeTrend />
        <FuelStat label="Litros Totales" value={(totalLiters || 0).toLocaleString()} unit="L" icon="water_drop" desc={`${(fuelHistory?.length || 0)} cargas registradas`} />
      </div>

      <div className="card flex flex-col h-full no-print">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <div>
            <h3 className="section-title">Historial de Consumo</h3>
            <p className="label mt-0.5">Listado completo de cargas</p>
          </div>
          <button onClick={onSync} className="btn btn-ghost text-xs">
            <span className="material-symbols-outlined text-sm">sync</span> Sincronizar
          </button>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="table-professional">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Vehículo</th>
                <th className="text-right">Odómetro</th>
                <th className="text-right">Litros</th>
                <th className="text-right">Rendimiento</th>
                <th className="text-right">Costo</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {processedHistory.map((entry) => {
                const vehicle = vehicles.find(v => v.id === entry.vehicleId);
                const driver = drivers.find(d => d.id === entry.driverId);
                return (
                  <tr key={entry.id}>
                    <td className="font-medium">
                      {entry.date ? new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                    </td>
                    <td>
                      <p className="font-medium text-slate-900">{vehicle?.plate || entry.vehicleId || 'S/P'}</p>
                      <p className="text-xs text-slate-400">{driver?.name || entry.driverId || '---'}</p>
                    </td>
                    <td className="text-right text-slate-500">{(Number(entry.odometer) || 0).toLocaleString()} km</td>
                    <td className="text-right font-medium">{entry.liters || 0} L</td>
                    <td className="text-right">
                      {entry.performance ? (
                        <span className="badge badge-info">
                          {entry.performance.toFixed(2)} KM/L
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Carga Inicial</span>
                      )}
                    </td>
                     <td className="text-right font-medium">${(Number(entry.cost) || 0).toFixed(2)}</td>
                     <td className="text-center">
                        <button 
                          onClick={() => handleEdit(entry)}
                          className="btn-icon"
                          aria-label="Editar"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                     </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-xl w-full max-w-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600" aria-hidden="true">local_gas_station</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{editingEntry ? 'Editar Carga' : 'Nueva Carga'}</h3>
                </div>
              </div>
              <button 
                onClick={() => !isSaving && setShowModal(false)}
                disabled={isSaving}
                className="size-9 rounded-md hover:bg-white transition-all flex items-center justify-center text-slate-400 disabled:opacity-50"
                aria-label="Cerrar modal"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha de la Carga</label>
                <input 
                  type="date"
                  required disabled={isSaving}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vehículo</label>
                  <select 
                    required disabled={isSaving}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Litros Cargados</label>
                  <div className="relative">
                    <input 
                      required disabled={isSaving}
                      type="number" step="0.01"
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 pr-8 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                      placeholder="0.00"
                      value={formData.liters}
                      onChange={e => setFormData({...formData, liters: e.target.value})}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">L</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Costo Total ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                    <input 
                      required disabled={isSaving}
                      type="number" step="0.01"
                      className="w-full bg-slate-50 border border-slate-200 rounded-md pl-7 pr-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                  placeholder="Ej. 125400"
                  value={formData.odometer}
                  onChange={e => setFormData({...formData, odometer: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" disabled={isSaving}
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-md transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={isSaving}
                  className="flex-[2] py-3 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-md hover:opacity-90 transition-all disabled:opacity-80 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                      Guardando...
                    </>
                  ) : (
                    editingEntry ? 'Guardar Cambios' : 'Guardar Registro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISTA PREVIA DE IMPRESIÓN (REPORTE DE COMBUSTIBLE) */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
           <div className="sticky top-0 bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg no-print">
             <div className="flex items-center gap-4">
               <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/20 transition-all">Cerrar</button>
               <h3 className="font-black uppercase tracking-widest text-sm">Vista Previa de Impresión</h3>
             </div>
             <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
               <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Reporte PDF
             </button>
           </div>
           <div className="flex-1 bg-slate-100 p-10 flex justify-center">
              <div id="fuel-printable" className="bg-white w-[27.94cm] min-h-[21.59cm] p-[1.5cm] shadow-2xl relative text-slate-900">
                
                {/* Header Institucional */}
                <div className="flex justify-between items-center mb-8 border-b-4 border-slate-900 pb-6">
                  <div className="flex items-center gap-6">
                    <img src="/images/logo-dif.png" alt="Logo" className="w-24 object-contain" />
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-slate-900 uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                      <span className="text-lg font-black text-slate-900 uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                      <span className="text-[8pt] font-bold uppercase text-slate-400 mt-2 tracking-[0.2em]">Parque Vehicular • Control de Combustible</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                        Bitácora General
                    </div>
                    <p className="text-[9pt] text-slate-400 font-bold mt-1">Fecha de Emisión: {new Date().toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
                  </div>
                </div>

                <div className="flex gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex-1">
                        <p className="text-[8pt] font-black text-blue-600 uppercase tracking-widest mb-1">Total Ejercido</p>
                        <p className="text-2xl font-black text-slate-900">${(totalCost || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg flex-1">
                        <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Litros Consumidos</p>
                        <p className="text-2xl font-black text-slate-900">{(totalLiters || 0).toLocaleString()} L</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg flex-1">
                        <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Rendimiento Promedio</p>
                        <p className="text-2xl font-black text-slate-900">{globalAveragePerformance > 0 ? globalAveragePerformance.toFixed(2) : "---"} KM/L</p>
                    </div>
                </div>

                {/* Tabla */}
                <div className="mb-8">
                  <table className="w-full border-collapse border border-slate-300">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-slate-600 w-24">Fecha</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-slate-600">Vehículo</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-slate-600">Conductor</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-slate-600 text-right">Odómetro</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-slate-600 text-right">Litros</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-slate-600 text-right">Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedHistory.map((entry, idx) => {
                        const vehicle = vehicles.find(v => v.id === entry.vehicleId);
                        const driver = drivers.find(d => d.id === entry.driverId);
                        return (
                          <tr key={idx} className="border-b border-slate-300">
                            <td className="px-2 py-2 text-[8pt] font-bold text-center text-slate-500">
                              {entry.date ? new Date(entry.date).toLocaleDateString('es-ES') : '-'}
                            </td>
                            <td className="px-2 py-2 text-[8pt] font-black text-slate-900 uppercase">
                              {vehicle?.plate || '---'} ({vehicle?.model || ''})
                            </td>
                            <td className="px-2 py-2 text-[8pt] font-bold text-slate-700 uppercase">
                              {driver?.name || '---'}
                            </td>
                            <td className="px-2 py-2 text-[8pt] text-right font-mono">
                              {(Number(entry.odometer) || 0).toLocaleString()}
                            </td>
                            <td className="px-2 py-2 text-[8pt] text-right font-mono">
                              {entry.liters}
                            </td>
                            <td className="px-2 py-2 text-[8pt] text-right font-black text-slate-900 font-mono">
                              ${(Number(entry.cost) || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                 {/* Firmas - Formal Signature Section */}
                 <div className="signature-section absolute bottom-[1.5cm] left-[1.5cm] right-[1.5cm]">
                     <div className="grid grid-cols-2 gap-24 text-center">
                         <div className="signature-line border-t-2 border-slate-900 pt-4">
                             <p className="text-[9pt] font-black uppercase text-slate-900">{managerName}</p>
                             <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Encargado del Parque Vehicular</p>
                             <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Elaboró</p>
                         </div>
                         <div className="signature-line border-t-2 border-slate-900 pt-4">
                             <p className="text-[9pt] font-black uppercase text-slate-900">{directorName}</p>
                             <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Director General</p>
                             <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Enterado</p>
                         </div>
                     </div>
                     <div className="text-center mt-8 border-t border-slate-200 pt-2">
                         <p className="text-[7pt] font-black text-slate-300 uppercase tracking-[0.3em]">Sistema de Gestion de Parque Vehicular • DIF Municipal La Paz</p>
                     </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const FuelStat: React.FC<{ label: string, value: string, unit?: string, icon: string, trend?: string, isNegativeTrend?: boolean, desc?: string }> = ({ label, value, unit, icon, trend, isNegativeTrend, desc }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 group hover:border-blue-500/30 transition-all">
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
