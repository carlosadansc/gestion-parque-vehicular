
import React, { useState, useMemo } from 'react';
import { MaintenanceRecord, Vehicle, AppSetting } from '../types';

interface MaintenanceProps {
  records: MaintenanceRecord[];
  vehicles: Vehicle[];
  settings?: AppSetting[];
  onAddRecord: (record: Omit<MaintenanceRecord, 'id'>) => Promise<void>;
  onUpdateRecord: (record: MaintenanceRecord) => Promise<void>;
  onSync: () => void;
}

const Maintenance: React.FC<MaintenanceProps> = ({ records = [], vehicles = [], settings = [], onAddRecord, onUpdateRecord, onSync }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  const stats = useMemo(() => {
    const totalInvoiced = records.reduce((acc, curr) => acc + (Number(curr.invoiceAmount) || 0), 0);
    const totalQuoted = records.reduce((acc, curr) => acc + (Number(curr.quoteCost) || 0), 0);
    const inWorkshop = records.filter(r => r.status === 'in-progress').length;
    const completed = records.filter(r => r.status === 'completed').length;
    return { totalInvoiced, totalQuoted, inWorkshop, completed, balance: totalQuoted - totalInvoiced };
  }, [records]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicleId: '',
    serviceType: 'tuning' as any,
    description: '',
    quoteNumber: '',
    quoteCost: '',
    invoiceNumber: '',
    invoiceAmount: '',
    odometer: '',
    provider: '',
    entryDate: new Date().toISOString().slice(0, 16),
    exitDate: '',
    status: 'scheduled' as any
  });

  const filteredRecords = useMemo(() => {
    return records
      .filter(r => filterStatus === 'todos' || r.status === filterStatus)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, filterStatus]);

  const handleEdit = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setFormData({
      date: record.date ? record.date.split('T')[0] : new Date().toISOString().split('T')[0],
      vehicleId: record.vehicleId || '',
      serviceType: record.serviceType || 'tuning',
      description: record.description || '',
      quoteNumber: record.quoteNumber || '',
      quoteCost: (record.quoteCost || 0).toString(),
      invoiceNumber: record.invoiceNumber || '',
      invoiceAmount: (record.invoiceAmount || 0).toString(),
      odometer: (record.odometer || 0).toString(),
      provider: record.provider || '',
      entryDate: record.entryDate || new Date().toISOString().slice(0, 16),
      exitDate: record.exitDate || '',
      status: record.status || 'scheduled'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.provider) return;

    setIsSaving(true);
    try {
      const recordData = {
        date: formData.date,
        vehicleId: formData.vehicleId,
        serviceType: formData.serviceType,
        description: formData.description,
        quoteNumber: formData.quoteNumber,
        quoteCost: Number(formData.quoteCost) || 0,
        invoiceNumber: formData.invoiceNumber || undefined,
        invoiceAmount: formData.invoiceAmount ? Number(formData.invoiceAmount) : undefined,
        odometer: Number(formData.odometer) || 0,
        provider: formData.provider,
        entryDate: formData.entryDate,
        exitDate: formData.exitDate || undefined,
        status: formData.status
      };

      if (editingRecord) {
        await onUpdateRecord({ ...recordData, id: editingRecord.id });
      } else {
        await onAddRecord(recordData);
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      alert("Error al guardar mantenimiento");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setFormData({ 
      date: new Date().toISOString().split('T')[0], 
      vehicleId: '', 
      serviceType: 'tuning', 
      description: '', 
      quoteNumber: '', 
      quoteCost: '', 
      invoiceNumber: '', 
      invoiceAmount: '', 
      odometer: '', 
      provider: '', 
      entryDate: new Date().toISOString().slice(0, 16), 
      exitDate: '', 
      status: 'scheduled' 
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Mantenimiento</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Control de servicios, presupuestos y facturación.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue-500/20"
        >
          <span className="material-symbols-outlined text-xl">build</span>
          Registrar Servicio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MaintStat label="Gasto Total (Facturado)" value={`$${(stats.totalInvoiced || 0).toLocaleString()}`} icon="payments" color="blue" />
        <MaintStat label="Presupuesto en Curso" value={`$${(stats.totalQuoted || 0).toLocaleString()}`} icon="request_quote" color="amber" />
        <MaintStat label="Unidades en Taller" value={(stats.inWorkshop || 0).toString()} icon="car_repair" color="rose" />
        <MaintStat label="Servicios Finalizados" value={(stats.completed || 0).toString()} icon="task_alt" color="green" />
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button onClick={() => setFilterStatus('todos')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === 'todos' ? 'bg-primary text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}`}>Todos</button>
            <button onClick={() => setFilterStatus('in-progress')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === 'in-progress' ? 'bg-rose-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}`}>En Proveedor</button>
            <button onClick={() => setFilterStatus('scheduled')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === 'scheduled' ? 'bg-amber-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}`}>Programados</button>
            <button onClick={() => setFilterStatus('completed')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === 'completed' ? 'bg-green-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}`}>Completados</button>
          </div>
          <button onClick={onSync} className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all">
            <span className="material-symbols-outlined text-sm">sync</span> Actualizar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Servicio / Fecha</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Vehículo / Proveedor</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Estado</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-right">Cotización</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-right">Factura</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record) => {
                const vehicle = vehicles.find(v => v.id === record.vehicleId);
                return (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-900 text-[13px] tracking-tight">{(record.serviceType || 'OTRO').toUpperCase()}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{new Date(record.date).toLocaleDateString()}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-900 text-[13px] tracking-tight">{vehicle?.plate || 'S/P'} - {vehicle?.model || 'Desconocido'}</p>
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{record.provider}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        record.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                        record.status === 'in-progress' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        record.status === 'scheduled' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {record.status === 'in-progress' ? 'En Taller' : (record.status || 'PENDIENTE').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-bold text-slate-500 text-xs">
                      ${(record.quoteCost || 0).toLocaleString()}
                      {record.quoteNumber && <p className="text-[9px] font-black text-slate-300">#{record.quoteNumber}</p>}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {record.invoiceAmount ? (
                        <div>
                          <p className="font-black text-slate-900 text-sm">${(record.invoiceAmount || 0).toLocaleString()}</p>
                          <p className="text-[9px] font-black text-green-600 uppercase">Factura: {record.invoiceNumber}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-bold italic">Pendiente</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => handleEdit(record)} className="p-2 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-xl transition-all">
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center opacity-40">
                    <span className="material-symbols-outlined text-4xl block mb-2">inventory_2</span>
                    <p className="text-xs font-black uppercase tracking-widest">No hay registros de mantenimiento</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {editingRecord ? 'Actualizar Reporte de Servicio' : 'Nuevo Registro de Mantenimiento'}
                </h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Control de ingresos y facturación de taller</p>
              </div>
              <button onClick={() => !isSaving && setShowModal(false)} disabled={isSaving} className="size-10 rounded-full hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[80vh] custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* SECCIÓN BÁSICA */}
                <div className="space-y-6">
                  <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Información de la Unidad</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vehículo</label>
                        <select required disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})}>
                          <option value="">Seleccionar...</option>
                          {vehicles.map(v => (<option key={v.id} value={v.id}>{v.plate} - {v.model}</option>))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kilometraje (Km)</label>
                        <input type="number" required disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={formData.odometer} onChange={e => setFormData({...formData, odometer: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Servicio</label>
                      <select required disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value as any})}>
                        <option value="tuning">Afinación Mayor</option>
                        <option value="oil">Cambio de Aceite</option>
                        <option value="tires">Llantas</option>
                        <option value="brakes">Frenos</option>
                        <option value="suspension">Suspensión</option>
                        <option value="electrical">Eléctrico</option>
                        <option value="other">Otro / Reparación</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descripción del Problema</label>
                      <textarea rows={2} disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Control de Taller</h4>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre del Proveedor / Taller</label>
                      <input required disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" placeholder="Ej. Taller Mecánico Especializado" value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estado de la Orden</label>
                        <select required disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                          <option value="scheduled">Programado</option>
                          <option value="in-progress">En Proveedor</option>
                          <option value="completed">Completado</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha de Ingreso</label>
                        <input type="datetime-local" required disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={formData.entryDate} onChange={e => setFormData({...formData, entryDate: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN FINANCIERA */}
                <div className="space-y-6">
                  <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100 space-y-4">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Presupuesto (Cotización)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">N° de Cotización</label>
                        <input disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={formData.quoteNumber} onChange={e => setFormData({...formData, quoteNumber: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Monto Cotizado ($)</label>
                        <input type="number" required disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black outline-none" value={formData.quoteCost} onChange={e => setFormData({...formData, quoteCost: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50/30 p-6 rounded-3xl border border-green-100 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-black text-green-700 uppercase tracking-[0.2em]">Facturación (Liquidación)</h4>
                      <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded uppercase">Obligatorio al completar</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">N° de Factura</label>
                        <input disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Monto Facturado ($)</label>
                        <input type="number" disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black outline-none" value={formData.invoiceAmount} onChange={e => setFormData({...formData, invoiceAmount: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha de Salida Real</label>
                      <input type="date" disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={formData.exitDate} onChange={e => setFormData({...formData, exitDate: e.target.value})} />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-3xl text-white">
                    <div className="flex justify-between items-center px-4">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Variación Presupuestaria</p>
                      <p className={`text-xl font-black ${(Number(formData.quoteCost) - Number(formData.invoiceAmount || 0)) < 0 ? 'text-rose-400' : 'text-green-400'}`}>
                        ${(Number(formData.quoteCost) - Number(formData.invoiceAmount || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-10 flex gap-4">
                <button 
                  type="button" disabled={isSaving}
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-2xl transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={isSaving}
                  className="flex-[2] py-4 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 hover:opacity-90 transition-all disabled:opacity-80 flex items-center justify-center gap-3"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                      Sincronizando...
                    </>
                  ) : (
                    editingRecord ? 'Actualizar Registro' : 'Confirmar Ingreso a Taller'
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

const MaintStat: React.FC<{ label: string, value: string, icon: string, color: string }> = ({ label, value, icon, color }) => {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    green: 'bg-green-50 text-green-600 border-green-100'
  };
  return (
    <div className={`bg-white p-6 rounded-3xl border shadow-sm group hover:scale-[1.02] transition-all duration-300 ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{label}</p>
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <p className="text-slate-900 text-2xl font-black tracking-tighter">{value}</p>
    </div>
  );
};

export default Maintenance;
