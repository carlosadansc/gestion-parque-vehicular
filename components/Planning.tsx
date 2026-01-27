
import React, { useState, useMemo } from 'react';
import { Planning, Vehicle, Driver, Area } from '../types';

interface PlanningProps {
  plannings: Planning[];
  vehicles: Vehicle[];
  drivers: Driver[];
  areas: Area[];
  onAddPlanning: (p: Omit<Planning, 'id'>) => Promise<void>;
  onUpdatePlanning: (p: Planning) => Promise<void>;
  onAddArea: (a: Omit<Area, 'id'>) => Promise<void>;
}

const PlanningComponent: React.FC<PlanningProps> = ({ plannings, vehicles, drivers, areas, onAddPlanning, onUpdatePlanning, onAddArea }) => {
  const [showModal, setShowModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingArea, setIsSavingArea] = useState(false);
  const [editingPlanning, setEditingPlanning] = useState<Planning | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicleId: '',
    driverId: '',
    areaId: '',
    notes: ''
  });

  const [areaFormData, setAreaFormData] = useState({ name: '', description: '' });

  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.vehicleId || !formData.driverId || !formData.areaId) return;

    setIsSaving(true);
    try {
      if (editingPlanning) {
        await onUpdatePlanning({ ...editingPlanning, ...formData });
      } else {
        await onAddPlanning(formData);
      }
      resetForm();
      setShowModal(false);
    } catch (err) {
      alert("Error al guardar planeación");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (p: Planning) => {
    setEditingPlanning(p);
    setFormData({
      date: p.date.split('T')[0],
      vehicleId: p.vehicleId,
      driverId: p.driverId,
      areaId: p.areaId,
      notes: p.notes || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingPlanning(null);
    setFormData({ date: new Date().toISOString().split('T')[0], vehicleId: '', driverId: '', areaId: '', notes: '' });
  };

  const handleAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaFormData.name) return;
    
    setIsSavingArea(true);
    try {
      await onAddArea(areaFormData);
      setAreaFormData({ name: '', description: '' });
    } catch (err) {
      alert("Error al guardar área");
    } finally {
      setIsSavingArea(false);
    }
  };

  const moveWeek = (offset: number) => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + (offset * 7));
    setCurrentDate(next);
  };

  const getDayPlannings = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return plannings.filter(p => p.date.split('T')[0] === dateStr);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Planeación Semanal</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Asignación de recursos por zona y fecha.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAreaModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">map</span>
            Gestionar Áreas
          </button>
          
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button onClick={() => moveWeek(-1)} className="size-9 flex items-center justify-center hover:bg-slate-50 text-slate-400 rounded-lg transition-colors">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="px-4 text-[11px] font-black uppercase tracking-widest text-slate-700 min-w-[150px] text-center">
              {weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <button onClick={() => moveWeek(1)} className="size-9 flex items-center justify-center hover:bg-slate-50 text-slate-400 rounded-lg transition-colors">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#135bec] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
          >
            <span className="material-symbols-outlined text-xl">event_available</span>
            Nueva Asignación
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day, idx) => {
          const dayPlannings = getDayPlannings(day);
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div key={idx} className={`flex flex-col min-h-[400px] bg-white rounded-2xl border transition-all ${isToday ? 'border-[#135bec] shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/10' : 'border-slate-200 shadow-sm'}`}>
              <div className={`p-4 border-b text-center ${isToday ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{day.toLocaleDateString('es-ES', { weekday: 'long' })}</p>
                <p className={`text-xl font-black mt-0.5 ${isToday ? 'text-blue-700' : 'text-slate-800'}`}>{day.getDate()}</p>
              </div>
              <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[500px] custom-scrollbar">
                {dayPlannings.map((p) => {
                  const area = areas.find(a => a.id === p.areaId);
                  const driver = drivers.find(d => d.id === p.driverId);
                  const vehicle = vehicles.find(v => v.id === p.vehicleId);
                  return (
                    <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-[#135bec]/30 hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-[#135bec] text-[9px] font-black uppercase tracking-widest rounded">{area?.name || p.areaId}</span>
                        <button 
                          onClick={() => handleEdit(p)}
                          className="opacity-0 group-hover:opacity-100 size-6 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary flex items-center justify-center transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                      </div>
                      <p className="text-[11px] font-black text-slate-900 leading-tight mb-1">{driver?.name || p.driverId}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5"><span className="material-symbols-outlined text-xs">local_shipping</span>{vehicle?.plate || p.vehicleId}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showAreaModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Catálogo de Áreas</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Zonas y sectores de operación</p>
              </div>
              <button onClick={() => !isSavingArea && setShowAreaModal(false)} disabled={isSavingArea} className="size-10 rounded-full hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <form onSubmit={handleAreaSubmit} className="space-y-4 pb-6 border-b border-slate-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre de la Nueva Área</label>
                  <div className="flex gap-2">
                    <input 
                      required disabled={isSavingArea}
                      className="flex-1 bg-slate-50 border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50"
                      placeholder="Ej. Sector Sur"
                      value={areaFormData.name}
                      onChange={e => setAreaFormData({...areaFormData, name: e.target.value})}
                    />
                    <button type="submit" disabled={isSavingArea} className="bg-[#135bec] text-white px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-80 flex items-center gap-2">
                      {isSavingArea ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : 'Añadir'}
                    </button>
                  </div>
                </div>
              </form>
              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                {areas.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><span className="material-symbols-outlined text-lg">location_on</span></div>
                      <span className="text-sm font-black text-slate-800">{a.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingPlanning ? 'Editar Asignación' : 'Nueva Asignación'}</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">{editingPlanning ? `Editando registro ${editingPlanning.id}` : 'Planifica rutas y recursos'}</p>
              </div>
              <button onClick={() => !isSaving && setShowModal(false)} disabled={isSaving} className="size-10 rounded-full hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha</label>
                  <input required disabled={isSaving} type="date" className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none disabled:opacity-50" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Área / Zona</label>
                  <select required disabled={isSaving} className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none disabled:opacity-50" value={formData.areaId} onChange={e => setFormData({...formData, areaId: e.target.value})}>
                    <option value="">Seleccionar área...</option>
                    {areas.map(a => (<option key={a.id} value={a.id}>{a.name}</option>))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vehículo</label>
                  <select required disabled={isSaving} className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none disabled:opacity-50" value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    {vehicles.map(v => (<option key={v.id} value={v.id}>{v.plate} - {v.model}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Chofer</label>
                  <select required disabled={isSaving} className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none disabled:opacity-50" value={formData.driverId} onChange={e => setFormData({...formData, driverId: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    {drivers.map(d => ( <option key={d.id} value={d.id}>{d.name}</option> ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Notas (Opcional)</label>
                <input disabled={isSaving} className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none disabled:opacity-50" placeholder="Observaciones..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" disabled={isSaving} onClick={() => setShowModal(false)} className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-[2] py-4 bg-[#135bec] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-80 flex items-center justify-center gap-3">
                  {isSaving ? <><span className="material-symbols-outlined animate-spin">sync</span> Guardando...</> : (editingPlanning ? 'Actualizar Asignación' : 'Confirmar Planeación')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningComponent;
