
import React, { useMemo, useState } from 'react';
import { Incident, Vehicle, Driver, AppSetting } from '../types';

interface IncidentsProps {
  incidents: Incident[];
  searchQuery: string;
  onAddIncident: (newIncident: Omit<Incident, 'id'>) => Promise<void>;
  vehicles?: Vehicle[];
  drivers?: Driver[];
  settings?: AppSetting[];
}

const Incidents: React.FC<IncidentsProps> = ({ incidents, searchQuery, onAddIncident, vehicles = [], drivers = [], settings = [] }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    (settings || []).forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

  const [formData, setFormData] = useState({
    type: 'mechanical' as 'mechanical' | 'traffic' | 'accident',
    title: '',
    description: '',
    vehicleId: '',
    driverId: '',
    status: 'pending' as 'critical' | 'pending' | 'resolved' | 'in-workshop'
  });

  const filteredIncidents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return incidents.filter((incident) => {
      const vehicle = vehicles.find(v => v.id === incident.vehicleId);
      const driver = drivers.find(d => d.id === incident.driverId);
      return incident.title.toLowerCase().includes(query) ||
             incident.description.toLowerCase().includes(query) ||
             vehicle?.plate?.toLowerCase().includes(query) ||
             driver?.name?.toLowerCase().includes(query);
    });
  }, [incidents, vehicles, drivers, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.vehicleId || !formData.driverId) return;

    setIsSaving(true);
    try {
      await onAddIncident({
        ...formData,
        date: new Date().toISOString()
      });
      setFormData({ type: 'mechanical', title: '', description: '', vehicleId: '', driverId: '', status: 'pending' });
      setShowModal(false);
    } catch (err) {
      alert("Error al reportar incidencia");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintRequest = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowPrintPreview(true);
  };

  // Variables institucionales
  const instName = settingsMap['INSTITUTION_NAME'] || 'SISTEMA PARA EL DESARROLLO INTEGRAL DE LA FAMILIA';
  const managerName = settingsMap['VEHICLE_MANAGER_NAME'] || 'RESPONSABLE DE ÁREA';
  const managerPos = settingsMap['VEHICLE_MANAGER_POS'] || 'ENCARGADO DE PARQUE VEHICULAR';
  const appLogo = settingsMap['APP_LOGO'] || 'https://i.ibb.co/3ykMvS8/escudo-paz.png';

  const reportVehicle = selectedIncident ? vehicles.find(v => v.id === selectedIncident.vehicleId) : null;
  const reportDriver = selectedIncident ? drivers.find(d => d.id === selectedIncident.driverId) : null;

  return (
    <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
      <style>{`
        @page { size: letter; margin: 2cm; }
        @media print {
          body * { visibility: hidden; }
          #incident-printable, #incident-printable * { visibility: visible; }
          #incident-printable { 
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

      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tablero de Incidencias</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Monitoreo y gestión de eventos en tiempo real.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#135bec] text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <span className="material-symbols-outlined text-lg filled">add_circle</span>
          Reportar Incidencia
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <SummaryCard label="Total Hoy" value={incidents.length.toString()} trend="+2.4%" color="green" />
        <SummaryCard label="Mecánicas" value={incidents.filter(i => i.type === 'mechanical').length.toString()} icon="handyman" color="blue" />
        <SummaryCard label="Tránsito" value={incidents.filter(i => i.type === 'traffic').length.toString()} icon="receipt_long" color="amber" />
        <SummaryCard label="Accidentes" value={incidents.filter(i => i.type === 'accident').length.toString()} icon="emergency" color="rose" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 no-print">
        {filteredIncidents.map((incident) => {
          const vehicle = vehicles.find(v => v.id === incident.vehicleId);
          const driver = drivers.find(d => d.id === incident.driverId);
          return (
            <div key={incident.id} className={`bg-white rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-xl transition-all ${incident.status === 'critical' ? 'border-2 border-blue-500' : 'border-slate-200'}`}>
              <div className="p-6">
                <div className="flex justify-between mb-5">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border ${
                    incident.type === 'mechanical' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    incident.type === 'accident' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>{incident.type}</span>
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    {new Date(incident.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-slate-900 text-lg tracking-tight leading-tight flex-1">{incident.title}</h3>
                  <button 
                    onClick={() => handlePrintRequest(incident)}
                    className="size-9 bg-slate-50 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-xl transition-all flex items-center justify-center shrink-0 ml-2"
                    title="Imprimir Reporte"
                  >
                    <span className="material-symbols-outlined text-lg">description</span>
                  </button>
                </div>
                <p className="text-sm font-medium text-slate-500 mt-3 leading-relaxed line-clamp-2">{incident.description}</p>
                <div className="mt-6 grid grid-cols-2 gap-4 pt-5 border-t border-slate-100">
                  <div>
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">Placa</p>
                    <p className="text-sm font-black text-slate-800 tracking-tight">{vehicle?.plate || incident.vehicleId}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">Conductor</p>
                    <p className="text-sm font-black text-slate-800 tracking-tight">{driver?.name || incident.driverId}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Reportar Incidencia</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Registro de eventos y fallas</p>
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
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Incidencia</label>
                  <select 
                    disabled={isSaving}
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="mechanical">Mecánica</option>
                    <option value="traffic">Tránsito / Multa</option>
                    <option value="accident">Accidente</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prioridad / Estado</label>
                  <select 
                    disabled={isSaving}
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="critical">Crítica / Urgente</option>
                    <option value="in-workshop">En Taller</option>
                    <option value="resolved">Resuelta</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Título corto</label>
                <input 
                  required disabled={isSaving}
                  className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50"
                  placeholder="Ej. Falla en frenos, Choque leve..."
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descripción detallada</label>
                <textarea 
                  rows={3} disabled={isSaving}
                  className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none disabled:opacity-50"
                  placeholder="Explica qué sucedió..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vehículo (Placa)</label>
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
                  className="flex-[2] py-4 bg-[#135bec] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-80 flex items-center justify-center gap-3"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                      Guardando...
                    </>
                  ) : (
                    'Guardar Reporte'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISTA PREVIA DE REPORTE FORMAL */}
      {showPrintPreview && selectedIncident && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col no-print overflow-y-auto">
          <div className="sticky top-0 bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg">
             <div className="flex items-center gap-4">
                <button onClick={() => setShowPrintPreview(false)} className="size-10 flex items-center justify-center hover:bg-slate-800 rounded-full transition-colors">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h3 className="font-black text-sm uppercase tracking-widest">Reporte de Incidencia - Vista Previa</h3>
             </div>
             <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
               <span className="material-symbols-outlined text-sm">print</span> Imprimir Reporte Oficial
             </button>
          </div>
          
          <div className="flex-1 bg-slate-100 p-10 flex justify-center">
            <div id="incident-printable" className="bg-white w-[21.59cm] min-h-[27.94cm] p-[2.5cm] shadow-2xl relative text-slate-900 border border-slate-200">
              {/* Header Oficial */}
              <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                <img src={appLogo} alt="Logo" className="h-24 w-auto object-contain" />
                <div className="text-right flex flex-col gap-1">
                  <p className="text-lg font-black leading-tight uppercase max-w-sm">{instName}</p>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Control Patrimonial y Vehicular</p>
                  <p className="text-sm font-bold mt-4">FOLIO DE INCIDENCIA: <span className="underline decoration-slate-300">#{(selectedIncident.id || '---').slice(-8).toUpperCase()}</span></p>
                  <p className="text-sm">Fecha de Emisión: {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Título y Cuerpo del Reporte */}
              <div className="space-y-10 text-[13pt] leading-relaxed">
                <div className="text-center font-black text-xl border-y-2 border-slate-100 py-4 uppercase tracking-[0.1em]">
                  Acta Administrativa de Incidencia Vehicular
                </div>

                <p className="text-justify italic">
                  Por medio de la presente, se hace constar formalmente el registro de una incidencia detectada y/o reportada en el parque vehicular perteneciente a esta institución, detallando los hechos acontecidos para los fines legales y administrativos que correspondan:
                </p>

                {/* Tabla de Datos de la Incidencia */}
                <div className="bg-slate-50 p-10 rounded-2xl space-y-6 border border-slate-200 text-[11pt]">
                  <div className="grid grid-cols-2 gap-y-6">
                    <div>
                      <span className="font-black uppercase tracking-tighter text-slate-400 block text-[9pt]">Tipo de Evento</span> 
                      <span className="font-bold uppercase text-primary">{selectedIncident.type}</span>
                    </div>
                    <div>
                      <span className="font-black uppercase tracking-tighter text-slate-400 block text-[9pt]">Fecha del Evento</span> 
                      {new Date(selectedIncident.date).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-black uppercase tracking-tighter text-slate-400 block text-[9pt]">Unidad Involucrada</span> 
                      {reportVehicle?.model || '---'} ({reportVehicle?.plate || 'S/P'})
                    </div>
                    <div>
                      <span className="font-black uppercase tracking-tighter text-slate-400 block text-[9pt]">Operador Responsable</span> 
                      {reportDriver?.name || '---'}
                    </div>
                    <div className="col-span-2">
                      <span className="font-black uppercase tracking-tighter text-slate-400 block text-[9pt]">Título del Reporte</span> 
                      <span className="font-black">{selectedIncident.title}</span>
                    </div>
                  </div>
                  <div className="pt-5 border-t border-slate-200">
                    <span className="font-black uppercase text-[9pt] opacity-40 mb-2 block">Descripción Detallada de los Hechos:</span>
                    <p className="text-justify leading-relaxed whitespace-pre-wrap">{selectedIncident.description}</p>
                  </div>
                </div>

                <p className="text-justify text-sm">
                  Las partes involucradas manifiestan que los datos anteriormente descritos son verídicos. Este documento servirá como base para el dictamen mecánico, peritaje de tránsito o deslinde de responsabilidades según sea el caso.
                </p>
              </div>

              {/* Firmas de Validación */}
              <div className="mt-48 grid grid-cols-2 gap-24 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-full border-t-2 border-slate-900 pt-5">
                    <p className="text-sm font-black uppercase">{reportDriver?.name || 'C. CHOFER RESPONSABLE'}</p>
                    <p className="text-[9pt] font-bold uppercase opacity-60 leading-tight">Firma del Conductor / Operador</p>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full border-t-2 border-slate-900 pt-5">
                    <p className="text-sm font-black uppercase">{managerName}</p>
                    <p className="text-[9pt] font-bold uppercase opacity-60 leading-tight">{managerPos}</p>
                  </div>
                </div>
              </div>

              {/* Pie de página decorativo */}
              <div className="absolute bottom-[2cm] left-[2.5cm] right-[2.5cm] border-t border-slate-200 pt-6 flex justify-between items-center text-[7pt] font-black text-slate-300 uppercase tracking-[0.3em]">
                <span>Validación Digital • ID: {selectedIncident.id}</span>
                <span>DIF Municipal La Paz • Flota Pro v7.4</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ label: string, value: string, trend?: string, icon?: string, color: string }> = ({ label, value, trend, icon, color }) => {
  const borderColors: any = { green: 'border-l-green-500', blue: 'border-l-blue-500', amber: 'border-l-amber-500', rose: 'border-l-rose-500' };
  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 border-l-4 ${borderColors[color]} shadow-sm`}>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">{label}</p>
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-3xl font-black tracking-tighter text-slate-900">{value}</span>
        {trend ? <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{trend}</span> : <span className="material-symbols-outlined text-slate-200 text-2xl">{icon}</span>}
      </div>
    </div>
  );
};

export default Incidents;
