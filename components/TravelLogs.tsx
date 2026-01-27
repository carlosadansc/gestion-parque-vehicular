
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

const TravelLogs: React.FC<TravelLogsProps> = ({ travelLogs = [], vehicles = [], drivers = [], areas = [], settings = [], onAddTravelLog, onUpdateTravelLog, onSync }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedLog, setSelectedLog] = useState<TravelLog | null>(null);
  const [editingLog, setEditingLog] = useState<TravelLog | null>(null);
  
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
    notes: ''
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
        notes: formData.notes
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
      notes: log.notes || ''
    });
    setShowModal(true);
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
      notes: '' 
    });
  };

  const handlePrintRequest = (log: TravelLog) => {
    setSelectedLog(log);
    setShowPrintPreview(true);
  };

  const instName = settingsMap['INSTITUTION_NAME'] || 'SISTEMA PARA EL DESARROLLO INTEGRAL DE LA FAMILIA';
  const managerName = settingsMap['VEHICLE_MANAGER_NAME'] || 'RESPONSABLE DE ÁREA';
  const managerPos = settingsMap['VEHICLE_MANAGER_POS'] || 'ENCARGADO DE PARQUE VEHICULAR';
  const appLogo = settingsMap['APP_LOGO'] || 'https://i.ibb.co/3ykMvS8/escudo-paz.png';

  const selectedVehicle = selectedLog ? vehicles.find(v => v.id === selectedLog.vehicleId) : null;
  const selectedDriver = selectedLog ? drivers.find(d => d.id === selectedLog.driverId) : null;
  const selectedArea = selectedLog ? areas.find(a => a.id === selectedLog.areaId) : null;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <style>{`
        @page { size: letter; margin: 1.5cm; }
        @media print {
          body * { visibility: hidden; }
          #travel-printable, #travel-printable * { visibility: visible; }
          #travel-printable { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            background: white !important; 
            padding: 0;
            font-family: 'Times New Roman', serif;
            color: black;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bitácora de Viajes</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Control operativo y registro de entradas/salidas.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue-500/20"
        >
          <span className="material-symbols-outlined text-xl">add_road</span>
          Registrar Salida
        </button>
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
                          {log.departureTime || '--:--'} <span className="mx-1">→</span> {log.arrivalTime || 'EN RUTA'}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Odómetro Inicial (KM)</label>
                  <input required type="number" disabled={isSaving} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" placeholder="0" value={formData.initialOdometer} onChange={e => setFormData({...formData, initialOdometer: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Odómetro Final (Opcional)</label>
                  <input type="number" disabled={isSaving} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="Pendiente" value={formData.finalOdometer} onChange={e => setFormData({...formData, finalOdometer: e.target.value})} />
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

      {/* VISTA PREVIA DE IMPRESIÓN */}
      {showPrintPreview && selectedLog && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col no-print overflow-y-auto">
          <div className="sticky top-0 bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg">
             <div className="flex items-center gap-4">
                <button onClick={() => setShowPrintPreview(false)} className="size-10 flex items-center justify-center hover:bg-slate-800 rounded-full transition-colors">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h3 className="font-black text-sm uppercase tracking-widest">Ficha de Bitácora Técnica - Vista Previa</h3>
             </div>
             <button onClick={() => window.print()} className="bg-primary px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
               <span className="material-symbols-outlined text-sm">print</span> Imprimir Documento
             </button>
          </div>
          
          <div className="flex-1 bg-slate-100 p-10 flex justify-center overflow-y-auto">
            <div id="travel-printable" className="bg-white w-[21.59cm] min-h-[27.94cm] p-[2.5cm] shadow-2xl relative text-slate-900 border border-slate-200">
              
              <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                <img src={appLogo} alt="Logo" className="h-24 w-auto object-contain" />
                <div className="text-right flex flex-col gap-1">
                  <p className="text-lg font-black leading-tight uppercase max-w-sm">{instName}</p>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Control Vehicular / Bitácora V.7.5</p>
                  <p className="text-sm font-bold mt-4 uppercase">
                    FICHA TÉCNICA DE VIAJE: 
                    <span className="underline decoration-slate-300 ml-2">#{(selectedLog.id || '---').slice(-6).toUpperCase()}</span>
                  </p>
                  <p className="text-sm">La Paz, B.C.S., a {new Date(selectedLog.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="space-y-8 text-[11pt] animate-in fade-in duration-500">
                <div className="text-center bg-slate-900 text-white py-3 rounded-lg font-black uppercase tracking-widest text-sm mb-8">
                  Control y Validación de Recorrido
                </div>

                <div className="grid grid-cols-2 gap-10">
                  <section className="space-y-4">
                    <h4 className="font-black text-primary uppercase text-[9pt] border-b border-slate-200 pb-1">Datos de Identificación</h4>
                    <p><span className="font-black block text-[8pt] text-slate-400 uppercase">Operador:</span> {selectedDriver?.name || '---'}</p>
                    <p><span className="font-black block text-[8pt] text-slate-400 uppercase">Vehículo:</span> {selectedVehicle?.model || '---'} - {selectedVehicle?.plate || 'S/P'}</p>
                    <p><span className="font-black block text-[8pt] text-slate-400 uppercase">Área:</span> {selectedArea?.name || 'General'}</p>
                  </section>
                  <section className="space-y-4">
                    <h4 className="font-black text-primary uppercase text-[9pt] border-b border-slate-200 pb-1">Itinerario Registrado</h4>
                    <p><span className="font-black block text-[8pt] text-slate-400 uppercase">Destino:</span> {selectedLog.destination || '---'}</p>
                    <div className="flex justify-between">
                      <p><span className="font-black block text-[8pt] text-slate-400 uppercase">Salió:</span> {selectedLog.departureTime || '--:--'} hrs</p>
                      <p><span className="font-black block text-[8pt] text-slate-400 uppercase">Llegó:</span> {selectedLog.arrivalTime || 'PENDIENTE'} hrs</p>
                    </div>
                  </section>
                </div>

                <div className="mt-10 bg-slate-50 border-2 border-slate-900 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-3 text-center border-b border-slate-900">
                    <div className="p-4 border-r border-slate-900 font-black text-[9pt] uppercase bg-slate-100">Odómetro Inicial</div>
                    <div className="p-4 border-r border-slate-900 font-black text-[9pt] uppercase bg-slate-100">Odómetro Final</div>
                    <div className="p-4 font-black text-[9pt] uppercase bg-primary text-white">Kilometraje Recorrido</div>
                  </div>
                  <div className="grid grid-cols-3 text-center text-xl font-black">
                    <div className="p-6 border-r border-slate-900">{(Number(selectedLog.initialOdometer) || 0).toLocaleString()} km</div>
                    <div className="p-6 border-r border-slate-900">{selectedLog.finalOdometer && Number(selectedLog.finalOdometer) > 0 ? `${Number(selectedLog.finalOdometer).toLocaleString()} km` : '---'}</div>
                    <div className="p-6">
                      {selectedLog.finalOdometer && Number(selectedLog.finalOdometer) > 0 
                        ? `${(Math.max(0, Number(selectedLog.finalOdometer) - Number(selectedLog.initialOdometer))).toLocaleString()} km`
                        : <span className="text-sm opacity-50 italic">Pendiente</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-10 space-y-4">
                  <h4 className="font-black text-slate-900 uppercase text-[9pt] border-b border-slate-200 pb-1">Observaciones en la Entrega</h4>
                  <div className="min-h-[100px] p-4 border border-slate-200 rounded-xl italic text-slate-600 bg-slate-50/30">
                    {selectedLog.notes || 'Sin observaciones registradas.'}
                  </div>
                </div>

                <p className="text-[9pt] italic mt-10 text-slate-500 text-justify">
                  Certifico que he entregado/recibido la unidad descrita en condiciones óptimas para su operación continua, 
                  notificando cualquier anomalía técnica detectada durante el trayecto comisionado. El kilometraje registrado 
                  corresponde fielmente a los indicadores del tablero de la unidad.
                </p>

                <div className="mt-40 grid grid-cols-2 gap-24 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-full border-t-2 border-slate-900 pt-5">
                      <p className="text-sm font-black uppercase">{selectedDriver?.name || 'C. CHOFER OPERADOR'}</p>
                      <p className="text-[9pt] font-bold uppercase opacity-60 leading-tight">Firma de Conformidad</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-full border-t-2 border-slate-900 pt-5">
                      <p className="text-sm font-black uppercase">{managerName}</p>
                      <p className="text-[9pt] font-bold uppercase opacity-60 leading-tight">Validación Parque Vehicular</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-[2cm] left-[2.5cm] right-[2.5cm] border-t border-slate-200 pt-6 flex justify-between items-center text-[7pt] font-black text-slate-300 uppercase tracking-[0.3em]">
                <span>Documento Generado Digitalmente • Flota Pro v7.5</span>
                <span>DIF Municipal La Paz</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelLogs;
