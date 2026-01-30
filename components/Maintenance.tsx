
import React, { useState, useMemo } from 'react';
import { MaintenanceRecord, Vehicle, AppSetting, MaintenanceType } from '../types';

interface MaintenanceProps {
  records: MaintenanceRecord[];
  vehicles: Vehicle[];
  maintenanceTypes?: MaintenanceType[];
  settings?: AppSetting[];
  onAddRecord: (record: Omit<MaintenanceRecord, 'id'>) => Promise<void>;
  onUpdateRecord: (record: MaintenanceRecord) => Promise<void>;
  onAddMaintenanceType?: (name: string) => Promise<void>;
  onSync: () => void;
}

const Maintenance: React.FC<MaintenanceProps> = ({ records = [], vehicles = [], maintenanceTypes = [], settings = [], onAddRecord, onUpdateRecord, onAddMaintenanceType, onSync }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  
  // Print States
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    (settings || []).forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

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
    serviceType: '',
    description: '',
    quoteNumber: '',
    quoteCost: '',
    invoiceNumber: '',
    invoiceAmount: '',
    odometer: '',
    provider: '', // Nombre Comercial
    providerContact: '', // Encargado
    entryDate: new Date().toISOString().slice(0, 16),
    exitDate: '',
    estimatedDeliveryDate: '',
    internalDocumentNumber: '',
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
      serviceType: record.serviceType || '',
      description: record.description || '',
      quoteNumber: record.quoteNumber || '',
      quoteCost: (record.quoteCost || 0).toString(),
      invoiceNumber: record.invoiceNumber || '',
      invoiceAmount: (record.invoiceAmount || 0).toString(),
      odometer: (record.odometer || 0).toString(),
      provider: record.provider || '',
      providerContact: record.providerContact || '',
      entryDate: record.entryDate || new Date().toISOString().slice(0, 16),
      exitDate: record.exitDate || '',
      estimatedDeliveryDate: record.estimatedDeliveryDate || '',
      internalDocumentNumber: record.internalDocumentNumber || '',
      status: record.status || 'scheduled'
    });
    setShowModal(true);
  };

  const handlePrintRequest = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setShowPrintPreview(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.provider) return;

    setIsSaving(true);
    try {
      const recordData = {
        date: formData.date,
        vehicleId: formData.vehicleId,
        serviceType: formData.serviceType || 'Mantenimiento General',
        description: formData.description,
        quoteNumber: formData.quoteNumber,
        quoteCost: Number(formData.quoteCost) || 0,
        invoiceNumber: formData.invoiceNumber || undefined,
        invoiceAmount: formData.invoiceAmount ? Number(formData.invoiceAmount) : undefined,
        odometer: Number(formData.odometer) || 0,
        provider: formData.provider,
        providerContact: formData.providerContact || undefined,
        entryDate: formData.entryDate,
        exitDate: formData.exitDate || undefined,
        estimatedDeliveryDate: formData.estimatedDeliveryDate || undefined,
        internalDocumentNumber: formData.internalDocumentNumber || undefined,
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

  const handleCreateType = async () => {
    if (!newTypeName.trim() || !onAddMaintenanceType) return;
    try {
        await onAddMaintenanceType(newTypeName);
        setFormData({ ...formData, serviceType: newTypeName.toUpperCase() }); // Auto select
        setNewTypeName('');
        setIsAddingType(false);
    } catch (e) {
        alert("Error al agregar tipo");
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setFormData({ 
      date: new Date().toISOString().split('T')[0], 
      vehicleId: '', 
      serviceType: '', 
      description: '', 
      quoteNumber: '', 
      quoteCost: '', 
      invoiceNumber: '', 
      invoiceAmount: '', 
      odometer: '', 
      provider: '',
      providerContact: '',
      entryDate: new Date().toISOString().slice(0, 16), 
      exitDate: '',
      estimatedDeliveryDate: '',
      internalDocumentNumber: '',
      status: 'scheduled' 
    });
  };

  const statusMap: Record<string, string> = {
    scheduled: 'PROGRAMADO',
    'in-progress': 'EN TALLER',
    completed: 'COMPLETADO',
    cancelled: 'CANCELADO'
  };

  // Variables institucionales para impresión
  // Normalizar la ruta del logo (convertir rutas relativas a absolutas)
  const rawLogo = settingsMap['APP_LOGO'] || '/images/logo-dif.png';
  const appLogo = rawLogo.startsWith('./') ? rawLogo.replace('./', '/') : rawLogo;
  const directorName = settingsMap['INSTITUTION_HEAD_NAME'] || 'Director General';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <style>{`
        /* ========================================
           PRINT STYLES - MAINTENANCE SERVICE ORDER
           FORMAL DOCUMENT DESIGN
           ======================================== */
        @media print {
          /* Page Setup - Letter Portrait */
          @page {
            size: letter portrait;
            margin: 1.5cm 1.5cm 2.5cm 1.5cm;
          }
          
          /* Hide everything except printable area */
          body * {
            visibility: hidden;
          }
          
          #maintenance-printable, #maintenance-printable * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          #maintenance-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: white !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 10pt;
            line-height: 1.4;
          }
          
          .no-print { display: none !important; }
          
          /* ========================================
             TYPOGRAPHY - FORMAL DOCUMENT STANDARDS
             ======================================== */
          #maintenance-printable h1,
          #maintenance-printable h2,
          #maintenance-printable h3,
          #maintenance-printable h4 {
            page-break-after: avoid;
            orphans: 3;
            widows: 3;
          }
          
          #maintenance-printable p {
            orphans: 3;
            widows: 3;
          }
          
          /* ========================================
             PAGE BREAK CONTROLS
             ======================================== */
          #maintenance-printable .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* ========================================
             OVERFLOW HANDLING - CONTENT VALIDATION
             ======================================== */
          #maintenance-printable .overflow-truncate,
          #maintenance-printable .print-truncate {
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          #maintenance-printable .overflow-wrap {
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            max-width: 250px;
          }
          
          /* Long text cells */
          #maintenance-printable .text-wrap {
            white-space: normal;
            word-wrap: break-word;
            max-width: 300px;
          }
          
          /* ========================================
             TABLE STYLING - FORMAL DOCUMENT
             ======================================== */
          #maintenance-printable table {
            width: 100% !important;
            border-collapse: collapse;
            page-break-inside: avoid;
          }
          
          #maintenance-printable th,
          #maintenance-printable td {
            padding: 8px 12px !important;
            border: 1px solid #e2e8f0 !important;
            vertical-align: middle;
          }
          
          #maintenance-printable th {
            background-color: #f8fafc !important;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 8pt;
            letter-spacing: 0.05em;
          }
          
          /* ========================================
             FORMAL DOCUMENT ELEMENTS
             ======================================== */
          /* Header styling */
          #maintenance-printable .print-header {
            border-bottom: 3px solid #1e293b;
            padding-bottom: 1rem;
            margin-bottom: 1.5rem;
          }
          
          /* Section titles */
          #maintenance-printable .section-title {
            background-color: #1e293b !important;
            color: white !important;
            padding: 6px 12px;
            font-size: 9pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 1rem;
            display: inline-block;
          }
          
          /* Info boxes */
          #maintenance-printable .info-box {
            border: 1px solid #e2e8f0 !important;
            background-color: #f8fafc !important;
            padding: 16px !important;
            border-radius: 8px;
          }
          
          /* ========================================
             SIGNATURE SECTION - FIXED POSITION
             ======================================== */
          #maintenance-printable .signature-section {
            position: fixed;
            bottom: 2cm;
            left: 1.5cm;
            right: 1.5cm;
            page-break-inside: avoid;
          }
          
          #maintenance-printable .signature-line {
            border-top: 2px solid #1e293b;
            padding-top: 0.5rem;
            min-width: 200px;
          }
          
          /* ========================================
             FOOTER STYLING
             ======================================== */
          #maintenance-printable .print-footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 0.5rem;
            font-size: 7pt;
            color: #94a3b8;
            text-align: center;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <MaintStat label="Gasto Total (Facturado)" value={`$${(stats.totalInvoiced || 0).toLocaleString()}`} icon="payments" color="blue" />
        <MaintStat label="Presupuesto en Curso" value={`$${(stats.totalQuoted || 0).toLocaleString()}`} icon="request_quote" color="amber" />
        <MaintStat label="Unidades en Taller" value={(stats.inWorkshop || 0).toString()} icon="car_repair" color="rose" />
        <MaintStat label="Servicios Finalizados" value={(stats.completed || 0).toString()} icon="task_alt" color="green" />
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col no-print">
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
                const serviceLabel = record.serviceType || 'OTRO';
                const statusLabel = statusMap[record.status] || (record.status || 'PENDIENTE').toUpperCase();

                return (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-900 text-[13px] tracking-tight">{serviceLabel}</p>
                      {record.internalDocumentNumber && <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wider mt-0.5">OFICIO: {record.internalDocumentNumber}</p>}
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{new Date(record.date).toLocaleDateString()}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-900 text-[13px] tracking-tight">{vehicle?.plate || 'S/P'} - {vehicle?.model || 'Desconocido'}</p>
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest overflow-truncate">{record.provider}</p>
                      {record.providerContact && <p className="text-[9px] text-slate-400 font-bold uppercase">Enc: {record.providerContact}</p>}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        record.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                        record.status === 'in-progress' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        record.status === 'scheduled' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {statusLabel}
                      </span>
                      {record.status === 'in-progress' && record.estimatedDeliveryDate && (
                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                          Entr. Est.: {new Date(record.estimatedDeliveryDate).toLocaleDateString()}
                        </p>
                      )}
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
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handlePrintRequest(record)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Imprimir Orden">
                            <span className="material-symbols-outlined text-xl">file_present</span>
                        </button>
                        <button onClick={() => handleEdit(record)} className="p-2 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-xl transition-all" title="Editar">
                            <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                      </div>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
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
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Número de Oficio (Control Interno)</label>
                        <input disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase" placeholder="Ej. 135/2023" value={formData.internalDocumentNumber} onChange={e => setFormData({...formData, internalDocumentNumber: e.target.value})} />
                    </div>
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
                      <div className="flex gap-2">
                        <select required disabled={isSaving} className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})}>
                            <option value="">Seleccionar tipo...</option>
                            {maintenanceTypes.map(t => (
                                <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                        </select>
                        <button 
                            type="button" 
                            disabled={isSaving}
                            onClick={() => setIsAddingType(!isAddingType)}
                            className="bg-[#135bec] text-white size-12 rounded-2xl flex items-center justify-center shadow-lg hover:opacity-90 transition-all"
                            title="Agregar nuevo tipo"
                        >
                            <span className="material-symbols-outlined text-xl">{isAddingType ? 'close' : 'add'}</span>
                        </button>
                      </div>
                      
                      {isAddingType && (
                        <div className="animate-in slide-in-from-top-2 pt-2 flex gap-2">
                            <input 
                                className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2 text-sm font-bold outline-none uppercase" 
                                placeholder="NOMBRE DEL NUEVO TIPO"
                                value={newTypeName}
                                onChange={e => setNewTypeName(e.target.value)}
                            />
                            <button 
                                type="button" 
                                onClick={handleCreateType}
                                className="bg-green-500 text-white px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 transition-all"
                            >
                                Guardar
                            </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descripción del Problema</label>
                      <textarea rows={2} disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Control de Taller</h4>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Comercial (Taller)</label>
                      <input required disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" placeholder="Ej. Taller Mecánico Especializado" value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre del Encargado (Contacto)</label>
                      <input disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" placeholder="Ej. Juan Pérez" value={formData.providerContact} onChange={e => setFormData({...formData, providerContact: e.target.value})} />
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
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha de Entrega Estimada</label>
                        <input type="date" disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={formData.estimatedDeliveryDate} onChange={e => setFormData({...formData, estimatedDeliveryDate: e.target.value})} />
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

      {/* VISTA DE IMPRESIÓN (FORMATO DE SERVICIO) */}
      {showPrintPreview && selectedRecord && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col no-print overflow-y-auto">
           <div className="sticky top-0 bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg">
             <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/20 transition-all">Cerrar</button>
             <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
               <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Formato PDF
             </button>
           </div>
           <div className="flex-1 bg-slate-100 p-10 flex justify-center">
              <div id="maintenance-printable" className="bg-white w-[21.59cm] min-h-[27.94cm] p-[1.5cm] shadow-2xl relative text-slate-900 border border-slate-200">
                
                {/* Header Institucional - Formal Design */}
                <div className="print-header flex justify-between items-center mb-8 border-b-4 border-slate-900 pb-6">
                  <div className="flex items-center gap-6">
                    <img src={appLogo} alt="Logo" className="h-24 w-auto object-contain" />
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-slate-900 uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                      <span className="text-lg font-black text-slate-900 uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                      <span className="text-[8pt] font-bold uppercase text-slate-400 mt-2 tracking-[0.2em]">Coordinación de Parque Vehicular • Solicitud de Servicio</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                        Autorización de Cotización
                    </div>
                    <p className="text-xs font-bold text-slate-600">FOLIO INTERNO: <span className="font-black text-slate-900 text-lg ml-1">{(selectedRecord.internalDocumentNumber || 'S/N').toUpperCase()}</span></p>
                    <p className="text-[9pt] text-slate-400 font-bold mt-1">Fecha: {new Date(selectedRecord.date).toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
                    <p className="text-[8pt] text-slate-300 font-bold mt-1">Generado: {new Date().toLocaleDateString('es-ES', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
                  </div>
                </div>

                {/* Datos del Vehículo - Formal Table */}
                <div className="mb-8 mt-6 break-inside-avoid">
                    <div className="section-title bg-slate-900 text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">
                        Datos de Identificación del Vehículo
                    </div>
                    <table className="w-full border-collapse">
                        <tbody>
                            <tr className="border-b border-slate-200">
                                <td className="py-3 text-[9pt] font-black text-slate-400 uppercase w-48">Unidad / Marca</td>
                                <td className="py-3 text-[11pt] font-bold text-slate-900 overflow-wrap" style={{maxWidth: '200px', wordWrap: 'break-word'}}>{vehicles.find(v => v.id === selectedRecord.vehicleId)?.model || '---'}</td>
                                <td className="py-3 text-[9pt] font-black text-slate-400 uppercase w-32 text-right pr-4">Placas</td>
                                <td className="py-3 text-[14pt] font-black text-slate-900 tracking-widest">{vehicles.find(v => v.id === selectedRecord.vehicleId)?.plate || '---'}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                                <td className="py-3 text-[9pt] font-black text-slate-400 uppercase">Kilometraje</td>
                                <td className="py-3 text-[11pt] font-bold text-slate-900">{(Number(selectedRecord.odometer) || 0).toLocaleString()} km</td>
                                <td className="py-3 text-[9pt] font-black text-slate-400 uppercase text-right pr-4">Fecha Ingreso</td>
                                <td className="py-3 text-[11pt] font-bold text-slate-900">{selectedRecord.entryDate ? new Date(selectedRecord.entryDate).toLocaleDateString('es-ES', {day: '2-digit', month: 'short', year: 'numeric'}) : '---'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Datos del Proveedor y Cotización - Info Box */}
                <div className="mb-8 info-box bg-slate-50 border border-slate-200 rounded-lg p-6 break-inside-avoid">
                   <div className="grid grid-cols-2 gap-8">
                      <div>
                         <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Taller / Proveedor</p>
                         <p className="text-[12pt] font-black text-slate-900 uppercase overflow-wrap" style={{maxWidth: '250px', wordWrap: 'break-word'}}>{selectedRecord.provider}</p>
                         <p className="text-[9pt] font-bold text-slate-500 uppercase mt-1">Contacto: {selectedRecord.providerContact || 'Gerencia'}</p>
                      </div>
                      <div className="text-right border-l border-slate-200 pl-8">
                         <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Monto de Cotización</p>
                         <p className="text-[20pt] font-black text-primary tracking-tighter">${(Number(selectedRecord.quoteCost) || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                         <p className="text-[9pt] font-bold text-slate-500 uppercase mt-1">Ref. Cotización: {selectedRecord.quoteNumber || 'S/N'}</p>
                      </div>
                   </div>
                </div>

                {/* Descripción del Servicio - With Overflow Handling */}
                <div className="space-y-2 mb-12 break-inside-avoid">
                   <div className="section-title bg-slate-900 text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">
                       Descripción de la Falla / Servicio Solicitado
                   </div>
                   <div className="bg-white p-4 rounded-lg min-h-[120px] max-h-[200px] border border-slate-200 overflow-hidden">
                     <p className="text-[10pt] font-bold text-slate-900 uppercase mb-2 block">{selectedRecord.serviceType}</p>
                     <p className="text-[10pt] text-slate-700 leading-relaxed text-wrap" style={{wordWrap: 'break-word', overflowWrap: 'break-word', maxHeight: '140px', overflow: 'hidden'}}>
                        {selectedRecord.description || 'Sin descripción detallada.'}
                     </p>
                   </div>
                </div>

                {/* Firmas - Formal Signature Section */}
                <div className="signature-section">
                    <div className="grid grid-cols-2 gap-24 text-center">
                      <div className="signature-line border-t-2 border-slate-900 pt-4">
                          <p className="text-[9pt] font-black uppercase text-slate-900">Jefe de Recursos Materiales</p>
                          <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Revisión y Validación</p>
                      </div>
                      <div className="signature-line border-t-2 border-slate-900 pt-4">
                          <p className="text-[9pt] font-black uppercase text-slate-900">{directorName}</p>
                          <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Autorización / Visto Bueno</p>
                      </div>
                    </div>
                    <div className="print-footer text-center mt-8 border-t border-slate-200 pt-3">
                        <div className="flex justify-between items-center text-[7pt] text-slate-400">
                            <span>Sistema de Control Flota Pro</span>
                            <span className="font-black uppercase tracking-[0.2em]">DIF Municipal La Paz B.C.S.</span>
                            <span>Documento válido con firmas autógrafas</span>
                        </div>
                    </div>
                </div>
              </div>
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
