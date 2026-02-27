
import React, { useState, useMemo } from 'react';
import { VehicleInspection, Vehicle, User, AppSetting } from '../types';

interface InspectionsProps {
  inspections: VehicleInspection[];
  vehicles: Vehicle[];
  onAddInspection: (i: Omit<VehicleInspection, 'id'>) => Promise<void>;
  onUpdateInspection: (i: VehicleInspection) => Promise<void>;
  currentUser: User | null;
  settings?: AppSetting[];
}

const Inspections: React.FC<InspectionsProps> = ({ inspections, vehicles, onAddInspection, onUpdateInspection, currentUser, settings = [] }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<VehicleInspection | null>(null);
  const [editingInspection, setEditingInspection] = useState<VehicleInspection | null>(null);

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    (settings || []).forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

  const initialFormState = {
    date: new Date().toISOString().slice(0, 16), // datetime-local format
    vehicleId: '',
    inspectorName: currentUser?.name || '',
    odometer: '',
    observations: '',
    engineStatus: 'Bien', clutchStatus: 'Bien', transmissionStatus: 'Bien', shifterStatus: 'Bien',
    steeringStatus: 'Bien', suspensionStatus: 'Bien', tempGaugeStatus: 'Bien', oilGaugeStatus: 'Bien',
    tiresStatus: 'Bien', shocksStatus: 'Bien', brakesStatus: 'Bien', batteryStatus: 'Bien',
    lightsStatus: 'Bien', hornStatus: 'Bien', wipersStatus: 'Bien', speedoStatus: 'Bien',
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.inspectorName) return;

    setIsSaving(true);
    try {
      const inspectionData = {
        ...formData,
        date: new Date(formData.date).toISOString(), // Ensure ISO format for storage
        odometer: Number(formData.odometer) || 0
      };

      if (editingInspection) {
        await onUpdateInspection({
          ...editingInspection,
          ...inspectionData
        });
      } else {
        await onAddInspection(inspectionData);
      }

      setShowModal(false);
      setEditingInspection(null);
      setFormData({ ...initialFormState, date: new Date().toISOString().slice(0, 16), inspectorName: currentUser?.name || '' });
    } catch (err) {
      alert("Error al guardar la revisión");
    } finally {
      setIsSaving(false);
    }
  };

  const sortedInspections = useMemo(() => {
    return [...inspections].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [inspections]);

  // Helper para formato de hora
  const formatDateTime = (isoDate: string) => {
    if (!isoDate) return '---';
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return isoDate; }
  };

  const handleEdit = (insp: VehicleInspection) => {
    setEditingInspection(insp);
    setFormData({
      ...initialFormState,
      ...insp,
      date: new Date(insp.date).toISOString().slice(0, 16), // Convert to datetime-local format
      odometer: String(insp.odometer),
    });
    setShowModal(true);
  };

  const handlePrintRequest = (insp: VehicleInspection) => {
    setSelectedInspection(insp);
    setShowPrintPreview(true);
  };

  // Variables institucionales
  // Normalizar la ruta del logo (convertir rutas relativas a absolutas)
  const rawLogo = settingsMap['APP_LOGO'] || '/images/logo-dif.png';
  const appLogo = rawLogo.startsWith('./') ? rawLogo.replace('./', '/') : rawLogo;
  const managerName = settingsMap['VEHICLE_MANAGER_NAME'] || 'ENCARGADO DE PARQUE VEHICULAR';
  const managerPos = settingsMap['VEHICLE_MANAGER_POS'] || 'VALIDACIÓN TÉCNICA';

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <style>{`
        /* ========================================
           PRINT STYLES - VEHICLE INSPECTION REPORT
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
          
          #inspection-printable, #inspection-printable * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          #inspection-printable {
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
          #inspection-printable h1,
          #inspection-printable h2,
          #inspection-printable h3,
          #inspection-printable h4 {
            page-break-after: avoid;
            orphans: 3;
            widows: 3;
          }
          
          #inspection-printable p {
            orphans: 3;
            widows: 3;
          }
          
          /* ========================================
             PAGE BREAK CONTROLS
             ======================================== */
          #inspection-printable .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* ========================================
             OVERFLOW HANDLING - CONTENT VALIDATION
             ======================================== */
          #inspection-printable .overflow-truncate,
          #inspection-printable .print-truncate {
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          #inspection-printable .overflow-wrap {
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            max-width: 250px;
          }
          
          /* Long text cells */
          #inspection-printable .text-wrap {
            white-space: normal;
            word-wrap: break-word;
            max-width: 300px;
          }
          
          /* ========================================
             TABLE STYLING - FORMAL DOCUMENT
             ======================================== */
          #inspection-printable table {
            width: 100% !important;
            border-collapse: collapse;
            page-break-inside: avoid;
          }
          
          #inspection-printable th,
          #inspection-printable td {
            padding: 8px 12px !important;
            border: 1px solid #e2e8f0 !important;
            vertical-align: middle;
          }
          
          #inspection-printable th {
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
          #inspection-printable .print-header {
            border-bottom: 3px solid #1e293b;
            padding-bottom: 1rem;
            margin-bottom: 1.5rem;
          }
          
          /* Section titles */
          #inspection-printable .section-title {
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
          
          /* Checklist grid */
          #inspection-printable .checklist-grid {
            border: 2px solid #e2e8f0 !important;
            padding: 16px !important;
            border-radius: 8px;
            page-break-inside: avoid;
          }
          
          /* Status indicators */
          #inspection-printable .status-indicator {
            width: 12px !important;
            height: 12px !important;
            border-radius: 50%;
            display: inline-block;
          }
          
           /* ========================================
              SIGNATURE SECTION - FLOWING WITH CONTENT
              ======================================== */
           #inspection-printable .signature-section {
             page-break-inside: avoid;
             margin-top: 2rem;
           }
          
          #inspection-printable .signature-line {
            border-top: 2px solid #1e293b;
            padding-top: 0.5rem;
            min-width: 200px;
          }
          
          /* ========================================
             FOOTER STYLING
             ======================================== */
          #inspection-printable .print-footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 0.5rem;
            font-size: 7pt;
            color: #94a3b8;
            text-align: center;
          }
          
           /* ========================================
              OBSERVATIONS BOX
              ======================================== */
           #inspection-printable .observations-box {
             background-color: #f8fafc !important;
             border: 1px solid #e2e8f0 !important;
             padding: 16px !important;
             border-radius: 8px;
             min-height: 100px;
           }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="page-title">Revisiones Técnicas</h2>
          <p className="page-subtitle">Historial de inspecciones y estado físico de unidades</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
        >
          <span className="material-symbols-outlined">fact_check</span>
          Nueva Revisión
        </button>
      </div>

      <div className="card flex flex-col no-print">
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Últimas Revisiones</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table-professional">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Unidad</th>
                <th>Inspector</th>
                <th className="text-right">Odómetro</th>
                <th className="text-center">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {sortedInspections.map((insp) => {
                const vehicle = vehicles.find(v => v.id === insp.vehicleId);
                return (
                  <tr key={insp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-900 text-sm">{formatDateTime(insp.date)}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-900 text-sm">{vehicle?.plate || insp.vehicleId}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{vehicle?.model || 'Desconocido'}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-bold text-slate-700 uppercase">{insp.inspectorName}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <p className="text-[11px] font-black text-slate-500">{(Number(insp.odometer) || 0).toLocaleString()} km</p>
                    </td>
                     <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handlePrintRequest(insp)}
                            className="size-9 bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-blue-200 rounded-xl transition-all flex items-center justify-center shadow-sm"
                          >
                            <span className="material-symbols-outlined text-lg">description</span>
                          </button>
                          <button 
                            onClick={() => handleEdit(insp)}
                            className="size-9 bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-blue-200 rounded-xl transition-all flex items-center justify-center shadow-sm"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                        </div>
                     </td>
                  </tr>
                );
              })}
              {sortedInspections.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center opacity-30">
                    <span className="material-symbols-outlined text-4xl block mb-2">content_paste_off</span>
                    <p className="text-xs font-black uppercase tracking-widest">No hay revisiones registradas</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-xl w-full max-w-4xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <div className="flex items-center gap-3">
                 <div className="size-10 bg-amber-100 rounded-lg flex items-center justify-center">
                   <span className="material-symbols-outlined text-amber-600" aria-hidden="true">health_and_safety</span>
                 </div>
                 <div>
                   <h3 className="text-lg font-black text-slate-900">{editingInspection ? 'Editar Revisión' : 'Registrar Revisión'}</h3>
                 </div>
               </div>
               <button onClick={() => !isSaving && setShowModal(false)} disabled={isSaving} className="size-9 rounded-md hover:bg-white transition-all flex items-center justify-center text-slate-400 disabled:opacity-50" aria-label="Cerrar modal">
                 <span className="material-symbols-outlined" aria-hidden="true">close</span>
               </button>
             </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha y Hora</label>
                  <input required disabled={isSaving} type="datetime-local" className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Inspector</label>
                  <input required disabled={isSaving} className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all uppercase" placeholder="Nombre completo" value={formData.inspectorName} onChange={e => setFormData({...formData, inspectorName: e.target.value})} />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vehículo</label>
                   <select required disabled={isSaving} className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all" value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})}>
                   <option value="">Seleccionar...</option>
                   {vehicles.map(v => (<option key={v.id} value={v.id}>{v.plate} - {v.model}</option>))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Odómetro Actual (Km)</label>
                  <input type="number" required disabled={isSaving} className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all" placeholder="0" value={formData.odometer} onChange={e => setFormData({...formData, odometer: e.target.value})} />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-primary uppercase tracking-wider">Puntos de Revisión (16 Puntos)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ConditionSelect label="1. Motor" value={formData.engineStatus} onChange={v => setFormData({...formData, engineStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="2. transmisión" value={formData.transmissionStatus} onChange={v => setFormData({...formData, transmissionStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="3. Clutch" value={formData.clutchStatus} onChange={v => setFormData({...formData, clutchStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="4. Frenos" value={formData.brakesStatus} onChange={v => setFormData({...formData, brakesStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="5. Dirección" value={formData.steeringStatus} onChange={v => setFormData({...formData, steeringStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="6. Suspensión" value={formData.suspensionStatus} onChange={v => setFormData({...formData, suspensionStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="7. Amortiguadores" value={formData.shocksStatus} onChange={v => setFormData({...formData, shocksStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="8. Llantas" value={formData.tiresStatus} onChange={v => setFormData({...formData, tiresStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="9. Batería" value={formData.batteryStatus} onChange={v => setFormData({...formData, batteryStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="10. Luces" value={formData.lightsStatus} onChange={v => setFormData({...formData, lightsStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="11. Limpiadores" value={formData.wipersStatus} onChange={v => setFormData({...formData, wipersStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="12. Claxon" value={formData.hornStatus} onChange={v => setFormData({...formData, hornStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="13. Palanca Vel." value={formData.shifterStatus} onChange={v => setFormData({...formData,shifterStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="14. Velocímetro" value={formData.speedoStatus} onChange={v => setFormData({...formData, speedoStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="15. Medidor Temp." value={formData.tempGaugeStatus} onChange={v => setFormData({...formData, tempGaugeStatus: v})} disabled={isSaving} />
                  <ConditionSelect label="16. Medidor Aceite" value={formData.oilGaugeStatus} onChange={v => setFormData({...formData, oilGaugeStatus: v})} disabled={isSaving} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observaciones Generales</label>
                <textarea rows={3} disabled={isSaving} className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all resize-none" placeholder="Detalles adicionales..." value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" disabled={isSaving} onClick={() => setShowModal(false)} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-md transition-all disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-[2] py-3 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-md hover:opacity-90 transition-all disabled:opacity-80 flex items-center justify-center gap-2">
                  {isSaving ? <><span className="material-symbols-outlined animate-spin">sync</span> Guardando...</> : (editingInspection ? 'Guardar Cambios' : 'Registrar Revisión')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISTA DE IMPRESIÓN */}
      {showPrintPreview && selectedInspection && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
           <div className="sticky top-0 bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg no-print">
              <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/20 transition-all">Cerrar</button>
              <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Reporte PDF
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-10 flex justify-center">
               <div id="inspection-printable" className="bg-white w-[21.59cm] min-h-[27.94cm] p-[1.5cm] shadow-2xl relative text-slate-900">
                
                {/* Header Institucional - Formal Design */}
                <div className="print-header flex justify-between items-center mb-8 border-b-4 border-slate-900 pb-6">
                  <div className="flex items-center gap-6">
                    <img src="/images/logo-dif.png" alt="Logo" className="w-24 object-contain" />
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-slate-900 uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                      <span className="text-lg font-black text-slate-900 uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                      <span className="text-[8pt] font-bold uppercase text-slate-400 mt-2 tracking-[0.2em]">Coordinación de Parque Vehicular • Inspecciones Técnicas</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                        Reporte de Revisión
                    </div>
                    <p className="text-xs font-bold text-slate-600">FOLIO: <span className="font-black text-slate-900 text-lg ml-1">{(selectedInspection.id || '---').slice(-6).toUpperCase()}</span></p>
                    <p className="text-[9pt] text-slate-400 font-bold mt-1">Fecha: {new Date(selectedInspection.date).toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
                    <p className="text-[8pt] text-slate-300 font-bold mt-1">Generado: {new Date().toLocaleDateString('es-ES', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
                  </div>
                </div>

                {/* Datos Principales - Formal Table */}
                <div className="mb-8 mt-6 break-inside-avoid">
                    <div className="bg-slate-900 text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">
                        Datos del Vehículo
                    </div>
                    <table className="w-full border-collapse">
                        <tbody>
                            <tr className="border-b border-slate-200">
                                <td className="py-3 text-[9pt] font-black text-slate-400 uppercase w-48">Placas</td>
                                <td className="py-3 text-[16pt] font-black text-slate-900 tracking-widest">{vehicles.find(v => v.id === selectedInspection.vehicleId)?.plate || '---'}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                                <td className="py-3 text-[9pt] font-black text-slate-400 uppercase">Unidad / Modelo</td>
                                <td className="py-3 text-[11pt] font-bold text-slate-900 overflow-wrap" style={{maxWidth: '300px', wordWrap: 'break-word'}}>{vehicles.find(v => v.id === selectedInspection.vehicleId)?.model || '---'}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                                <td className="py-3 text-[9pt] font-black text-slate-400 uppercase">Inspector Responsable</td>
                                <td className="py-3 text-[11pt] font-bold text-slate-900">{selectedInspection.inspectorName}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                                <td className="py-3 text-[9pt] font-black text-slate-400 uppercase">Kilometraje Registrado</td>
                                <td className="py-3 text-[11pt] font-bold text-slate-900">{(Number(selectedInspection.odometer) || 0).toLocaleString()} km</td>
                            </tr>
                            <tr>
                                <td className="py-3 text-[9pt] font-black text-slate-400 uppercase">Hora de Inspección</td>
                                <td className="py-3 text-[11pt] font-bold text-slate-900">{new Date(selectedInspection.date).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit', hour12: true})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Checklist Diagnostico - Formal Grid */}
                <div className="mb-8 break-inside-avoid">
                   <div className="bg-slate-900 text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">
                       Evaluación de Componentes (16 Puntos)
                   </div>
                   <div className="checklist-grid grid grid-cols-4 gap-y-4 gap-x-6 border-2 border-slate-100 p-6 rounded-xl">
                      <ConditionPrint label="1. Motor" status={selectedInspection.engineStatus} />
                      <ConditionPrint label="2. Transmisión" status={selectedInspection.transmissionStatus} />
                      <ConditionPrint label="3. Clutch" status={selectedInspection.clutchStatus} />
                      <ConditionPrint label="4. Frenos" status={selectedInspection.brakesStatus} />
                      
                      <ConditionPrint label="5. Dirección" status={selectedInspection.steeringStatus} />
                      <ConditionPrint label="6. Suspensión" status={selectedInspection.suspensionStatus} />
                      <ConditionPrint label="7. Amortiguadores" status={selectedInspection.shocksStatus} />
                      <ConditionPrint label="8. Llantas" status={selectedInspection.tiresStatus} />
                      
                      <ConditionPrint label="9. Batería" status={selectedInspection.batteryStatus} />
                      <ConditionPrint label="10. Luces" status={selectedInspection.lightsStatus} />
                      <ConditionPrint label="11. Limpiadores" status={selectedInspection.wipersStatus} />
                      <ConditionPrint label="12. Claxon" status={selectedInspection.hornStatus} />
                      
                      <ConditionPrint label="13. Palanca Vel." status={selectedInspection.shifterStatus} />
                      <ConditionPrint label="14. Velocímetro" status={selectedInspection.speedoStatus} />
                      <ConditionPrint label="15. Medidor Temp." status={selectedInspection.tempGaugeStatus} />
                      <ConditionPrint label="16. Medidor Aceite" status={selectedInspection.oilGaugeStatus} />
                   </div>
                </div>

                 {/* Observations - With Overflow Handling */}
                 <div className="space-y-2 mb-12 break-inside-avoid">
                    <div className="bg-slate-900 text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">
                        Observaciones del Inspector
                    </div>
                    <div className="observations-box bg-slate-50 p-6 rounded-lg min-h-[80px] border border-slate-100">
                      <p className="text-[10pt] text-slate-700 leading-relaxed italic" style={{wordWrap: 'break-word', overflowWrap: 'break-word'}}>
                         {selectedInspection.observations || 'Sin observaciones particulares registradas durante la inspección.'}
                      </p>
                    </div>
                 </div>

                  {/* Signature Section - Flowing with Content */}
                  <div className="signature-section break-inside-avoid">
                      <div className="grid grid-cols-2 gap-24 text-center">
                        <div className="signature-line border-t-2 border-slate-900 pt-4">
                            <p className="text-[9pt] font-black uppercase text-slate-900">{selectedInspection.inspectorName}</p>
                            <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Inspector Técnico</p>
                            <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Revisión</p>
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
    </div>
  );
};

const getStatusColorClass = (status: string) => {
  const s = (status || 'Bien').toUpperCase();
  if (s === 'BIEN') return 'bg-green-500';
  if (s === 'REGULAR') return 'bg-amber-500';
  if (s === 'MAL') return 'bg-orange-600';
  if (s === 'MUY MAL') return 'bg-rose-700';
  return 'bg-slate-300';
};

const ConditionSelect = ({ label, value, onChange, disabled }: any) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 ml-1">
       <div className={`size-2 rounded-full ${getStatusColorClass(value)}`}></div>
       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
    </div>
    <select 
      disabled={disabled}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" 
      value={value} 
      onChange={e => onChange(e.target.value)}
    >
      <option value="Bien">Bien</option>
      <option value="Regular">Regular</option>
      <option value="Mal">Mal</option>
      <option value="Muy Mal">Muy Mal</option>
    </select>
  </div>
);

const ConditionPrint = ({ label, status }: any) => {
  const colorClass = getStatusColorClass(status);
  return (
    <div className="flex items-center gap-3">
       <div className={`size-3 rounded-full border border-slate-200 ${colorClass} print:border-0`} style={{printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact'}}></div>
       <div className="flex flex-col">
         <span className="text-[7pt] font-black uppercase text-slate-400 leading-none">{label}</span>
         <span className="text-[8pt] font-bold text-slate-900 uppercase leading-tight">{status || 'BIEN'}</span>
       </div>
    </div>
  );
};

export default Inspections;
