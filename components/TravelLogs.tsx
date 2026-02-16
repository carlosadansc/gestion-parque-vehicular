
import React, { useState, useMemo } from 'react';
import { TravelLog, Vehicle, Driver, Area, AppSetting } from '../types';

interface TravelLogsProps {
  travelLogs: TravelLog[];
  vehicles: Vehicle[];
  drivers: Driver[];
  areas: Area[];
  settings?: AppSetting[];
  onAddTravelLog: (log: Omit<TravelLog, 'id'>) => Promise<void>;
  onUpdateTravelLog: (log: TravelLog) => Promise<void>;
  onSync: () => void;
}

// Helper para formato de hora 12h (AM/PM)
const formatTime = (time: string | undefined) => {
  if (!time) return '';
  
  // Si viene en formato ISO
  if (time.includes('T')) {
    try {
      const date = new Date(time);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
      return time;
    }
  }

  // Si viene en formato HH:MM o HH:MM:SS
  const [hoursStr, minutesStr] = time.split(':');
  if (hoursStr && minutesStr) {
    const hours = parseInt(hoursStr, 10);
    const minutes = minutesStr.substring(0, 2);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }
  
  return time;
};

// Helper robusto para calcular duración
const calculateDuration = (start: string, end: string) => {
  if (!start || !end) return null;

  // Normalizar cualquier formato a HH:MM para cálculo
  const extractTime = (t: string) => {
    if (t.includes('T')) {
        const d = new Date(t);
        if (isNaN(d.getTime())) return '00:00';
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    // Si viene HH:MM:SS recortamos, si es HH:MM lo dejamos
    return t.length > 5 ? t.substring(0, 5) : t;
  };

  const s = extractTime(start);
  const e = extractTime(end);

  const startDate = new Date(`2000-01-01T${s}`);
  const endDate = new Date(`2000-01-01T${e}`);
  
  let diff = endDate.getTime() - startDate.getTime();
  
  // Si da negativo (ej. Salida 23:00, Llegada 01:00), sumamos 24 horas
  if (diff < 0) diff += 24 * 60 * 60 * 1000; 

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  if (isNaN(hours) || isNaN(minutes)) return '---';
  
  // Formato legible
  const hLabel = hours > 0 ? `${hours} Hrs` : '';
  const mLabel = minutes > 0 ? `${minutes} Min` : '';
  
  if (!hLabel && !mLabel) return '0 Min';
  return `${hLabel} ${mLabel}`.trim();
};

const TravelLogs: React.FC<TravelLogsProps> = ({ travelLogs = [], vehicles = [], drivers = [], areas = [], settings = [], onAddTravelLog, onUpdateTravelLog, onSync }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingLog, setViewingLog] = useState<TravelLog | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedLog, setSelectedLog] = useState<TravelLog | null>(null);
  const [editingLog, setEditingLog] = useState<TravelLog | null>(null);
  const [showBlankBitacoraModal, setShowBlankBitacoraModal] = useState(false);
  const [blankBitacoraVehicleId, setBlankBitacoraVehicleId] = useState('');
  const [showBlankBitacoraPrint, setShowBlankBitacoraPrint] = useState(false);
  
  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    (settings || []).forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    departureTime: '',
    arrivalTime: '',
    driverId: '',
    vehicleId: '',
    initialOdometer: '',
    finalOdometer: '',
    destination: '',
    areaId: '',
    notes: '',
    initialFuelLevel: 100,
    finalFuelLevel: 100
  });

  const sortedLogs = useMemo(() => {
    return [...travelLogs].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [travelLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.driverId || !formData.date || !formData.departureTime) return;

    setIsSaving(true);
    try {
      const payload = {
        date: formData.date,
        departureTime: formData.departureTime,
        arrivalTime: formData.arrivalTime || '',
        driverId: formData.driverId,
        vehicleId: formData.vehicleId,
        initialOdometer: Number(formData.initialOdometer) || 0,
        finalOdometer: Number(formData.finalOdometer) || 0,
        destination: formData.destination,
        areaId: formData.areaId,
        notes: formData.notes,
        initialFuelLevel: Number(formData.initialFuelLevel),
        finalFuelLevel: Number(formData.finalFuelLevel)
      };

      if (editingLog) {
        await onUpdateTravelLog({
          ...editingLog,
          ...payload
        });
      } else {
        await onAddTravelLog(payload);
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      alert("Error al guardar bitácora de viaje");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (log: TravelLog) => {
    setEditingLog(log);
    setFormData({
      date: log.date ? (typeof log.date === 'string' ? log.date.split('T')[0] : new Date(log.date).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
      departureTime: log.departureTime || '',
      arrivalTime: log.arrivalTime || '',
      driverId: log.driverId || '',
      vehicleId: log.vehicleId || '',
      initialOdometer: (log.initialOdometer || 0).toString(),
      finalOdometer: log.finalOdometer ? log.finalOdometer.toString() : '',
      destination: log.destination || '',
      areaId: log.areaId || '',
      notes: log.notes || '',
      initialFuelLevel: log.initialFuelLevel !== undefined ? log.initialFuelLevel : 100,
      finalFuelLevel: log.finalFuelLevel !== undefined ? log.finalFuelLevel : 100
    });
    setShowModal(true);
  };

  const handleViewDetail = (log: TravelLog) => {
    setViewingLog(log);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setEditingLog(null);
    setFormData({ 
      date: new Date().toISOString().split('T')[0], 
      departureTime: '', 
      arrivalTime: '', 
      driverId: '', 
      vehicleId: '', 
      initialOdometer: '', 
      finalOdometer: '', 
      destination: '', 
      areaId: '', 
      notes: '',
      initialFuelLevel: 100,
      finalFuelLevel: 100
    });
  };

  const handlePrintRequest = (log: TravelLog) => {
    setSelectedLog(log);
    setShowPrintPreview(true);
  };

  // Variables institucionales
  // Normalizar la ruta del logo (convertir rutas relativas a absolutas)
  const rawLogo = settingsMap['APP_LOGO'] || '/images/logo-dif.png';
  const appLogo = rawLogo.startsWith('./') ? rawLogo.replace('./', '/') : rawLogo;
  const managerName = settingsMap['VEHICLE_MANAGER_NAME'] || 'ENCARGADO DE PARQUE VEHICULAR';
  const managerPos = settingsMap['VEHICLE_MANAGER_POS'] || 'VALIDACIÓN';

  const selectedVehicle = selectedLog ? vehicles.find(v => v.id === selectedLog.vehicleId) : null;
  const selectedDriver = selectedLog ? drivers.find(d => d.id === selectedLog.driverId) : null;
  const selectedArea = selectedLog ? areas.find(a => a.id === selectedLog.areaId) : null;
  const blankBitacoraVehicle = vehicles.find(v => v.id === blankBitacoraVehicleId) || null;

  const handlePrintBlankBitacora = () => {
    if (!blankBitacoraVehicleId) return;
    setShowBlankBitacoraModal(false);
    setShowBlankBitacoraPrint(true);
  };

  const BLANK_ROWS = 9;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
       <style>{`
         @media print {
           body * { 
             visibility: hidden; 
           }
           #travel-printable, #travel-printable * { 
             visibility: visible; 
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
           }
           #travel-printable, #blank-bitacora-printable {
             position: absolute;
             left: 0;
             top: 0;
             width: 100%;
             padding: 0;
             margin: 0;
             background: white !important;
             font-family: 'Inter', sans-serif;
           }
           #blank-bitacora-printable, #blank-bitacora-printable * {
             visibility: visible;
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
           }
           .no-print { display: none !important; }
           @page { margin: 0.5cm; size: letter; }
           
            /* ========================================
               SIGNATURE SECTION - FLOWING WITH CONTENT
               ======================================== */
            #travel-printable .signature-section {
              page-break-inside: avoid;
              margin-top: 2rem;
            }
            
            #travel-printable .signature-line {
              border-top: 2px solid #1e293b;
              padding-top: 0.5rem;
              min-width: 200px;
            }
         }
       `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bitácora de Viajes</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Control operativo y registro de entradas/salidas.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setBlankBitacoraVehicleId(''); setShowBlankBitacoraModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-widest rounded-xl hover:border-primary hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined text-xl">print</span>
            Imprimir Bitácora
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue-500/20"
          >
            <span className="material-symbols-outlined text-xl">add_road</span>
            Registrar Salida
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col no-print">
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Movimientos Recientes</h3>
          <button onClick={onSync} className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all">
            <span className="material-symbols-outlined text-sm">sync</span> Actualizar Datos
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Fecha / Horarios</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Unidad / Chofer</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Destino / Ruta</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-right">Odómetro</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedLogs.map((log) => {
                const vehicle = vehicles.find(v => v.id === log.vehicleId);
                const driver = drivers.find(d => d.id === log.driverId);
                const area = areas.find(a => a.id === log.areaId);
                const isComplete = log.arrivalTime && log.finalOdometer && Number(log.finalOdometer) > 0;
                
                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-900 text-sm tracking-tight">
                        {log.date ? new Date(log.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${isComplete ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600 animate-pulse'}`}>
                          {formatTime(log.departureTime) || '--:--'} <span className="mx-1">→</span> {log.arrivalTime ? formatTime(log.arrivalTime) : 'EN RUTA'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-900 text-sm">{vehicle?.plate || log.vehicleId || 'S/P'}</p>
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{driver?.name || log.driverId || '---'}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-tight line-clamp-1">{log.destination || 'Sin destino'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{area?.name || 'General'}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <p className="text-[11px] text-slate-400 font-black">INI: {(Number(log.initialOdometer) || 0).toLocaleString()} km</p>
                      <p className={`text-[11px] font-black ${isComplete ? 'text-slate-900' : 'text-blue-500 italic'}`}>
                        {isComplete ? `FIN: ${Number(log.finalOdometer).toLocaleString()} km` : 'PENDIENTE'}
                      </p>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleViewDetail(log)}
                          className="size-9 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all flex items-center justify-center"
                          title="Ver Detalle y Resumen"
                        >
                          <span className="material-symbols-outlined text-xl">visibility</span>
                        </button>
                        <button 
                          onClick={() => handleEdit(log)}
                          className={`size-9 rounded-xl transition-all flex items-center justify-center ${isComplete ? 'text-slate-400 hover:text-primary hover:bg-primary/10' : 'text-white bg-blue-600 shadow-md hover:bg-blue-700'}`}
                          title={isComplete ? "Editar Registro" : "Completar Llegada"}
                        >
                          <span className="material-symbols-outlined text-xl">{isComplete ? 'edit' : 'login'}</span>
                        </button>
                        <button 
                          onClick={() => handlePrintRequest(log)}
                          className="size-9 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all flex items-center justify-center"
                          title="Ficha de Bitácora"
                        >
                          <span className="material-symbols-outlined text-xl">assignment</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center opacity-30">
                    <span className="material-symbols-outlined text-4xl block mb-2">route</span>
                    <p className="text-xs font-black uppercase tracking-widest">No hay viajes registrados en la bitácora</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DETALLE DEL VIAJE --- */}
      {showDetailModal && viewingLog && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Detalle de Recorrido</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  Fecha: {new Date(viewingLog.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="size-10 rounded-full hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 overflow-y-auto max-h-[80vh] custom-scrollbar">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                    <span className="material-symbols-outlined">directions_car</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehículo</p>
                    <p className="font-bold text-slate-900 leading-tight">{vehicles.find(v => v.id === viewingLog.vehicleId)?.model || 'Desconocido'}</p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{vehicles.find(v => v.id === viewingLog.vehicleId)?.plate || viewingLog.vehicleId}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chofer</p>
                    <p className="font-bold text-slate-900 leading-tight">{drivers.find(d => d.id === viewingLog.driverId)?.name || 'Desconocido'}</p>
                    <p className="text-xs text-slate-500 mt-0.5 uppercase">{areas.find(a => a.id === viewingLog.areaId)?.name || 'Área General'}</p>
                  </div>
                </div>
              </div>

              {/* Timeline Section */}
              <div className="relative pl-4 border-l-2 border-slate-100 space-y-8 my-8">
                 {/* Salida */}
                 <div className="relative">
                    <div className="absolute -left-[21px] top-1 size-3 bg-green-500 rounded-full ring-4 ring-white"></div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salida</p>
                       <p className="text-xl font-black text-slate-900">{formatTime(viewingLog.departureTime)}</p>
                       <p className="text-xs font-bold text-slate-500">Odómetro: {(Number(viewingLog.initialOdometer) || 0).toLocaleString()} km</p>
                    </div>
                 </div>

                 {/* Destino */}
                 <div className="relative">
                    <div className="absolute -left-[21px] top-1 size-3 bg-blue-500 rounded-full ring-4 ring-white"></div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destino / Ruta</p>
                       <p className="text-lg font-bold text-slate-800 uppercase">{viewingLog.destination}</p>
                       <p className="text-xs text-slate-500 font-medium italic mt-1">{viewingLog.notes || 'Sin notas adicionales'}</p>
                    </div>
                 </div>

                 {/* Llegada */}
                 <div className="relative">
                    <div className={`absolute -left-[21px] top-1 size-3 rounded-full ring-4 ring-white ${viewingLog.arrivalTime ? 'bg-slate-900' : 'bg-slate-200'}`}></div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Llegada</p>
                       {viewingLog.arrivalTime ? (
                         <>
                           <p className="text-xl font-black text-slate-900">{formatTime(viewingLog.arrivalTime)}</p>
                           <p className="text-xs font-bold text-slate-500">Odómetro: {(Number(viewingLog.finalOdometer) || 0).toLocaleString()} km</p>
                         </>
                       ) : (
                         <span className="inline-block bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mt-1">En Ruta</span>
                       )}
                    </div>
                 </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recorrido Total</p>
                    <p className="text-2xl font-black text-primary">
                      {viewingLog.finalOdometer ? (Number(viewingLog.finalOdometer) - Number(viewingLog.initialOdometer)).toLocaleString() : '---'} <span className="text-sm text-slate-400 font-bold">km</span>
                    </p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tiempo Total</p>
                    <p className="text-2xl font-black text-slate-900">
                      {calculateDuration(viewingLog.departureTime, viewingLog.arrivalTime || '') || '---'}
                    </p>
                 </div>
              </div>

              {/* Fuel Info */}
              <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                 <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Consumo de Combustible</p>
                    <p className="text-xs font-bold text-slate-500">{viewingLog.finalFuelLevel !== undefined ? `${(viewingLog.initialFuelLevel || 100) - viewingLog.finalFuelLevel}% Consumido` : 'Pendiente'}</p>
                 </div>
                 <div className="h-3 bg-slate-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-slate-300" style={{ width: `${100 - (viewingLog.initialFuelLevel || 100)}%` }}></div>
                    <div className="h-full bg-green-500" style={{ width: `${(viewingLog.initialFuelLevel || 100) - (viewingLog.finalFuelLevel || 0)}%` }}></div>
                    <div className="h-full bg-primary" style={{ width: `${viewingLog.finalFuelLevel || 0}%` }}></div>
                 </div>
                 <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase mt-2">
                    <span>Inicio: {viewingLog.initialFuelLevel}%</span>
                    <span>Fin: {viewingLog.finalFuelLevel !== undefined ? `${viewingLog.finalFuelLevel}%` : '---'}</span>
                 </div>
              </div>

            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
               <button onClick={() => { setShowDetailModal(false); }} className="px-6 py-3 bg-primary text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">Aceptar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN/CREACIÓN */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingLog ? (editingLog.arrivalTime ? 'Editar Bitácora' : 'Registrar Llegada') : 'Nueva Salida'}</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Control de movimientos de la unidad</p>
              </div>
              <button onClick={() => !isSaving && setShowModal(false)} disabled={isSaving} className="size-12 rounded-full hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {/* Formulario (igual que antes) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha</label>
                  <input required disabled={isSaving} type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hora Salida</label>
                  <input required type="time" disabled={isSaving} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" value={formData.departureTime} onChange={e => setFormData({...formData, departureTime: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hora Llegada (Opcional)</label>
                  <input type="time" disabled={isSaving} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10" value={formData.arrivalTime} onChange={e => setFormData({...formData, arrivalTime: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unidad (Vehículo)</label>
                  <select required disabled={isSaving} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})} >
                    <option value="">Seleccionar vehículo...</option>
                    {vehicles.map(v => ( <option key={v.id} value={v.id}>{v.plate} - {v.model}</option> ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Chofer asignado</label>
                  <select required disabled={isSaving} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" value={formData.driverId} onChange={e => setFormData({...formData, driverId: e.target.value})} >
                    <option value="">Seleccionar chofer...</option>
                    {drivers.map(d => ( <option key={d.id} value={d.id}>{d.name}</option> ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 border-b border-slate-200 pb-2">Datos de Salida</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Odómetro Inicial (KM)</label>
                    <input required type="number" disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none" placeholder="0" value={formData.initialOdometer} onChange={e => setFormData({...formData, initialOdometer: e.target.value})} />
                  </div>
                  <FuelGaugeInput label="Gasolina (Salida)" value={formData.initialFuelLevel} onChange={(val) => setFormData({...formData, initialFuelLevel: Number(val)})} disabled={isSaving} />
                </div>
              </div>

              <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
                 <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 border-b border-blue-200 pb-2">Datos de Retorno</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Odómetro Final</label>
                      <input type="number" disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="Pendiente" value={formData.finalOdometer} onChange={e => setFormData({...formData, finalOdometer: e.target.value})} />
                    </div>
                    <FuelGaugeInput label="Gasolina (Llegada)" value={formData.finalFuelLevel} onChange={(val) => setFormData({...formData, finalFuelLevel: Number(val)})} disabled={isSaving} />
                 </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Destino / Comisión</label>
                <input required disabled={isSaving} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" placeholder="Motivo del traslado" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Área Solicitante</label>
                  <select required disabled={isSaving} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" value={formData.areaId} onChange={e => setFormData({...formData, areaId: e.target.value})}>
                    <option value="">Seleccionar área...</option>
                    {areas.map(a => (<option key={a.id} value={a.id}>{a.name}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Notas / Observaciones</label>
                  <input disabled={isSaving} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" placeholder="Opcional..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button type="button" disabled={isSaving} onClick={() => setShowModal(false)} className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-[2] py-4 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 hover:opacity-90 transition-all flex items-center justify-center gap-3">
                  {isSaving ? <><span className="material-symbols-outlined animate-spin">sync</span> Procesando...</> : (editingLog ? (editingLog.arrivalTime ? 'Guardar Cambios' : 'Registrar Llegada') : 'Confirmar Salida')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISTA PREVIA DE IMPRESIÓN (NUEVO DISEÑO FICHA TÉCNICA) */}
      {showPrintPreview && selectedLog && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
           <div className="sticky top-0 bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg no-print">
             <div className="flex items-center gap-4">
                <button onClick={() => setShowPrintPreview(false)} className="size-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">Cerrar</button>
             </div>
             <button onClick={() => window.print()} className="bg-primary px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-lg hover:opacity-90 transition-all">
               <span className="material-symbols-outlined text-sm">print</span> Imprimir Ficha
             </button>
          </div>
          
          <div className="flex-1 bg-slate-100 p-10 flex justify-center">
            <div id="travel-printable" className="bg-white w-[21.59cm] min-h-[27.94cm] p-[1.5cm] shadow-2xl relative text-slate-900">
              
              {/* Header Institucional */}
              <div className="flex justify-between items-center mb-8 border-b-4 border-slate-900 pb-6">
                  <div className="flex items-center gap-6">
                    <img src="/images/logo-dif.png" alt="Logo" className="w-24 object-contain" />
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-slate-900 uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                      <span className="text-lg font-black text-slate-900 uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                      <span className="text-[8pt] font-bold uppercase text-slate-400 mt-2 tracking-[0.2em]">Parque Vehicular • Bitácora de Operación</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                        Ficha Técnica de Viaje
                    </div>
                    <p className="text-xs font-bold text-slate-600">FOLIO: <span className="font-black text-slate-900 text-lg ml-1">{(selectedLog.id || '---').slice(-6).toUpperCase()}</span></p>
                    <p className="text-[9pt] text-slate-400 font-bold mt-1">Fecha: {new Date(selectedLog.date).toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
                  </div>
              </div>

              {/* Datos de Identificación (Tabla) */}
              <div className="mb-8 mt-6">
                  <h4 className="text-[9pt] font-black uppercase border-b-2 border-slate-200 pb-1 text-primary mb-4">Identificación del Servicio</h4>
                  <table className="w-full border-collapse">
                      <tbody>
                          <tr className="border-b border-slate-200">
                              <td className="py-2 text-[9pt] font-black text-slate-400 uppercase w-32">Operador</td>
                              <td className="py-2 text-[11pt] font-bold text-slate-900">{selectedDriver?.name || '---'}</td>
                              <td className="py-2 text-[9pt] font-black text-slate-400 uppercase w-32 text-right pr-4">Área</td>
                              <td className="py-2 text-[11pt] font-bold text-slate-900 uppercase">{selectedArea?.name || '---'}</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                              <td className="py-2 text-[9pt] font-black text-slate-400 uppercase">Vehículo</td>
                              <td className="py-2 text-[11pt] font-bold text-slate-900">{selectedVehicle?.model || '---'}</td>
                              <td className="py-2 text-[9pt] font-black text-slate-400 uppercase text-right pr-4">Placas</td>
                              <td className="py-2 text-[11pt] font-bold text-slate-900 uppercase tracking-widest">{selectedVehicle?.plate || '---'}</td>
                          </tr>
                          <tr>
                              <td className="py-2 text-[9pt] font-black text-slate-400 uppercase">Destino / Ruta</td>
                              <td colSpan={3} className="py-2 text-[11pt] font-bold text-slate-900 uppercase">{selectedLog.destination || '---'}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>

              {/* Matriz de Recorrido (Tabla Comparativa) */}
              <div className="mb-8">
                 <h4 className="bg-slate-900 text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">Resumen de Movimiento</h4>
                 <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-center">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4 text-[8pt] font-black text-slate-500 uppercase tracking-widest">Concepto</th>
                                <th className="py-3 px-4 text-[8pt] font-black text-slate-500 uppercase tracking-widest border-l border-slate-200">Salida</th>
                                <th className="py-3 px-4 text-[8pt] font-black text-slate-500 uppercase tracking-widest border-l border-slate-200">Llegada</th>
                                <th className="py-3 px-4 text-[8pt] font-black text-slate-500 uppercase tracking-widest border-l border-slate-200 bg-slate-100">Diferencia / Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr>
                                <td className="py-3 px-4 text-[9pt] font-black text-slate-400 uppercase text-left">Tiempo de Viaje</td>
                                <td className="py-3 px-4 text-[10pt] font-bold text-slate-900 border-l border-slate-200">{formatTime(selectedLog.departureTime) || '--:--'}</td>
                                <td className="py-3 px-4 text-[10pt] font-bold text-slate-900 border-l border-slate-200">{selectedLog.arrivalTime ? formatTime(selectedLog.arrivalTime) : 'PENDIENTE'}</td>
                                <td className="py-3 px-4 text-[10pt] font-black text-slate-900 border-l border-slate-200 bg-slate-50">
                                    {calculateDuration(selectedLog.departureTime, selectedLog.arrivalTime || '') || '---'}
                                </td>
                            </tr>
                            <tr>
                                <td className="py-3 px-4 text-[9pt] font-black text-slate-400 uppercase text-left">Kilometraje</td>
                                <td className="py-3 px-4 text-[10pt] font-bold text-slate-900 border-l border-slate-200">{(Number(selectedLog.initialOdometer) || 0).toLocaleString()} km</td>
                                <td className="py-3 px-4 text-[10pt] font-bold text-slate-900 border-l border-slate-200">{selectedLog.finalOdometer ? `${Number(selectedLog.finalOdometer).toLocaleString()} km` : '---'}</td>
                                <td className="py-3 px-4 text-[10pt] font-black text-slate-900 border-l border-slate-200 bg-slate-50">
                                    {selectedLog.finalOdometer ? `${(Number(selectedLog.finalOdometer) - Number(selectedLog.initialOdometer)).toLocaleString()} km` : '---'}
                                </td>
                            </tr>
                            <tr>
                                <td className="py-3 px-4 text-[9pt] font-black text-slate-400 uppercase text-left">Combustible (%)</td>
                                <td className="py-3 px-4 text-[10pt] font-bold text-slate-900 border-l border-slate-200">{selectedLog.initialFuelLevel}%</td>
                                <td className="py-3 px-4 text-[10pt] font-bold text-slate-900 border-l border-slate-200">{selectedLog.finalFuelLevel !== undefined ? `${selectedLog.finalFuelLevel}%` : '---'}</td>
                                <td className="py-3 px-4 text-[10pt] font-black text-slate-900 border-l border-slate-200 bg-slate-50">
                                    {selectedLog.finalFuelLevel !== undefined ? `${(selectedLog.initialFuelLevel || 100) - selectedLog.finalFuelLevel}% Consumido` : '---'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                 </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-2 mb-12">
                 <h4 className="text-[9pt] font-black uppercase border-b-2 border-slate-200 pb-1 text-primary">Observaciones / Incidencias</h4>
                 <div className="bg-slate-50 p-6 rounded-lg min-h-[100px] border border-slate-100">
                   <p className="text-[10pt] text-slate-700 leading-relaxed italic">
                      {selectedLog.notes || 'Sin observaciones registradas durante el servicio.'}
                   </p>
                 </div>
                 <p className="text-[8pt] text-slate-400 mt-2 text-justify">
                    * El operador certifica que los datos de kilometraje y niveles de combustible son correctos al momento de la entrega de la unidad.
                 </p>
              </div>

               {/* Firmas - Formal Signature Section */}
               <div className="signature-section absolute bottom-[1.5cm] left-[1.5cm] right-[1.5cm]">
                   <div className="grid grid-cols-2 gap-24 text-center">
                       <div className="signature-line border-t-2 border-slate-900 pt-4">
                           <p className="text-[9pt] font-black uppercase text-slate-900">{selectedDriver?.name || 'OPERADOR RESPONSABLE'}</p>
                           <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Operador</p>
                           <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Salida / Llegada</p>
                       </div>
                       <div className="signature-line border-t-2 border-slate-900 pt-4">
                           <p className="text-[9pt] font-black uppercase text-slate-900">{managerName}</p>
                           <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">{managerPos}</p>
                           <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Validación</p>
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

      {/* MODAL SELECCIÓN DE VEHÍCULO PARA BITÁCORA EN BLANCO */}
      {showBlankBitacoraModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Imprimir Bitácora en Blanco</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Selecciona el vehículo para generar el formato</p>
              </div>
              <button onClick={() => setShowBlankBitacoraModal(false)} className="size-10 rounded-full hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vehículo</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                  value={blankBitacoraVehicleId}
                  onChange={e => setBlankBitacoraVehicleId(e.target.value)}
                >
                  <option value="">Seleccionar vehículo...</option>
                  {vehicles.filter(v => v.status === 'active').map(v => (
                    <option key={v.id} value={v.id}>{v.plate} — {v.model} {v.brand ? `(${v.brand})` : ''}</option>
                  ))}
                </select>
              </div>
              {blankBitacoraVehicleId && blankBitacoraVehicle && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                    <span className="material-symbols-outlined">directions_car</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">{blankBitacoraVehicle.model}</p>
                    <p className="text-xs font-mono text-slate-500">{blankBitacoraVehicle.plate} {blankBitacoraVehicle.economicNumber ? `• No. Eco: ${blankBitacoraVehicle.economicNumber}` : ''}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlankBitacoraModal(false)}
                  className="flex-1 py-3.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handlePrintBlankBitacora}
                  disabled={!blankBitacoraVehicleId}
                  className="flex-[2] py-3.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-lg">print</span>
                  Generar Formato
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA PREVIA BITÁCORA EN BLANCO PARA IMPRIMIR */}
      {showBlankBitacoraPrint && blankBitacoraVehicle && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
          <div className="sticky top-0 bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg no-print">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowBlankBitacoraPrint(false)} className="size-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div>
                <p className="text-sm font-black uppercase tracking-widest">Bitácora en Blanco</p>
                <p className="text-xs text-slate-400">{blankBitacoraVehicle.plate} — {blankBitacoraVehicle.model}</p>
              </div>
            </div>
            <button onClick={() => window.print()} className="bg-primary px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-lg hover:opacity-90 transition-all">
              <span className="material-symbols-outlined text-sm">print</span> Imprimir
            </button>
          </div>

          <style>{`
            @media print {
              @page { margin: 0.4cm; size: letter landscape; }
            }
          `}</style>
          <div className="flex-1 bg-slate-100 p-6 flex justify-center overflow-auto">
            <div id="blank-bitacora-printable" className="bg-white shadow-2xl relative text-slate-900" style={{ width: '27.94cm', minHeight: '21.59cm', padding: '0.8cm 1cm' }}>
              
              {/* Header Institucional */}
              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-3">
                <div className="flex items-center gap-4">
                  <img src="/images/logo-dif.png" alt="Logo" className="w-24 object-contain" />
                  <div className="flex flex-col">
                    <span className="text-[10pt] font-black text-slate-900 uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                    <span className="text-[10pt] font-black text-slate-900 uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                    <span className="text-[7pt] font-bold uppercase text-slate-400 mt-1 tracking-[0.2em]">Parque Vehicular • Bitácora de Viajes</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white px-3 py-1 font-black text-[8pt] uppercase tracking-widest rounded-sm mb-1">
                    Bitácora de Viajes
                  </div>
                  <p className="text-[8pt] text-slate-400 font-bold">Formato para llenado manual</p>
                </div>
              </div>

              {/* Datos del Vehículo y Semana */}
              <div className="mb-3">
                {/* Campo Semana - será llenado a mano */}
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-300">
                  <span className="font-black text-slate-500 uppercase whitespace-nowrap text-[8pt]">Semana del:</span>
                  <span className="font-bold text-slate-900 border-b border-slate-300 flex-1 pb-0.5 text-[9pt]">___ al ___ de ____________ _______</span>
                </div>
                <div className="grid grid-cols-6 gap-x-4 gap-y-1 text-[8pt]">
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="font-black text-slate-500 uppercase whitespace-nowrap">Vehículo:</span>
                    <span className="font-bold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">{blankBitacoraVehicle.model || '---'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-black text-slate-500 uppercase whitespace-nowrap">Marca:</span>
                    <span className="font-bold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">{blankBitacoraVehicle.brand || '---'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-black text-slate-500 uppercase whitespace-nowrap">Año:</span>
                    <span className="font-bold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">{blankBitacoraVehicle.year || '---'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-black text-slate-500 uppercase whitespace-nowrap">Placas:</span>
                    <span className="font-bold text-slate-900 border-b border-slate-300 flex-1 pb-0.5 tracking-wider">{blankBitacoraVehicle.plate || '---'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-black text-slate-500 uppercase whitespace-nowrap">No. Eco:</span>
                    <span className="font-bold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">{blankBitacoraVehicle.economicNumber || '---'}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="font-black text-slate-500 uppercase whitespace-nowrap">Color:</span>
                    <span className="font-bold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">{blankBitacoraVehicle.color || '---'}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="font-black text-slate-500 uppercase whitespace-nowrap">Tipo Combustible:</span>
                    <span className="font-bold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">{blankBitacoraVehicle.fuelType || '---'}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="font-black text-slate-500 uppercase whitespace-nowrap">No. Inventario:</span>
                    <span className="font-bold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">{blankBitacoraVehicle.inventory || '---'}</span>
                  </div>
                </div>
              </div>

              {/* Tabla de Registros en Blanco */}
              <div className="border border-slate-400 rounded overflow-hidden">
                <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr className="bg-[#9e1b32] text-white">
                      <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase tracking-wide border-r border-slate-600 text-center" style={{ width: '6%' }}>Fecha</th>
                      <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase tracking-wide border-r border-slate-600 text-center" style={{ width: '13%' }}>Destino / Comisión</th>
                      <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase tracking-wide border-r border-slate-600 text-center" style={{ width: '5%' }}>Personal asignado</th>
                      <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase tracking-wide border-r border-slate-600 text-center" style={{ width: '5.5%' }}>Hora Salida</th>
                      <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase tracking-wide border-r border-slate-600 text-center" style={{ width: '5.5%' }}>Hora Llegada</th>
                      <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase tracking-wide border-r border-slate-600 text-center" style={{ width: '7%' }}>Km Inicial</th>
                      <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase tracking-wide border-r border-slate-600 text-center" style={{ width: '7%' }}>Km Final</th>
                      <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase tracking-wide border-r border-slate-600 text-center" style={{ width: '7%' }}>Tanque Inicial</th>
                      <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase tracking-wide border-r border-slate-600 text-center" style={{ width: '7%' }}>Tanque Final</th>
                      <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase tracking-wide border-r border-slate-600 text-center" style={{ width: '12%' }}>Nombre del Chofer</th>
                      <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase tracking-wide border-r border-slate-600 text-center" style={{ width: '8%' }}>Firma Salida</th>
                      <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase tracking-wide text-center" style={{ width: '8%' }}>Firma Entrada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: BLANK_ROWS }).map((_, i) => (
                      <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-t border-slate-300`}>
                        <td className="py-3 px-1 border-r border-slate-200 text-center text-[7pt] text-slate-300">____/____/____</td>
                        <td className="py-3 px-1 border-r border-slate-200">&nbsp;</td>
                        <td className="py-3 px-1 border-r border-slate-200">&nbsp;</td>
                        <td className="py-3 px-1 border-r border-slate-200 text-center text-[7pt] text-slate-300">__:__ __</td>
                        <td className="py-3 px-1 border-r border-slate-200 text-center text-[7pt] text-slate-300">__:__ __</td>
                        <td className="py-3 px-1 border-r border-slate-200">&nbsp;</td>
                        <td className="py-3 px-1 border-r border-slate-200">&nbsp;</td>
                        <td className="py-3 px-1 border-r border-slate-200">&nbsp;</td>
                        <td className="py-3 px-1 border-r border-slate-200">&nbsp;</td>
                        <td className="py-3 px-1 border-r border-slate-200">&nbsp;</td>
                        <td className="py-3 px-1 border-r border-slate-200">&nbsp;</td>
                        <td className="py-3 px-1">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer con firmas de validación */}
              <div className="mt-4 flex justify-between items-end">
                <div className="text-[7pt] text-slate-400">
                  <p className="font-bold">* Cada registro debe ser llenado por el chofer responsable al momento de salida y llegada.</p>
                  <p className="font-bold">* Los niveles de tanque se registran como fracción (E, 1/4, 1/2, 3/4, F).</p>
                </div>
                {/* <div className="text-center min-w-[200px]">
                  <div className="border-t-2 border-slate-900 pt-2 mt-6">
                    <p className="text-[8pt] font-black uppercase text-slate-900">{managerName}</p>
                    <p className="text-[6pt] font-bold text-slate-400 uppercase tracking-widest">{managerPos}</p>
                  </div>
                </div> */}
              </div>

              {/* Footer institucional */}
              <div className="text-center mt-3 border-t border-slate-200 pt-1">
                <p className="text-[6pt] font-black text-slate-300 uppercase tracking-[0.3em]">Sistema de Gestión de Parque Vehicular • DIF Municipal La Paz</p>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FuelGaugeInput = ({ label, value, onChange, disabled }: any) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <span className={`text-xs font-black ${value < 25 ? 'text-rose-500' : 'text-primary'}`}>{value}%</span>
    </div>
    <div className="relative h-6 w-full">
       <input 
        type="range" 
        min="0" max="100" step="5"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#135bec] absolute top-2"
      />
    </div>
    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase px-1">
      <span>E</span>
      <span>1/4</span>
      <span>1/2</span>
      <span>3/4</span>
      <span>F</span>
    </div>
  </div>
);

export default TravelLogs;
