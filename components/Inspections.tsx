
import React, { useState, useMemo } from 'react';
import { VehicleInspection, Vehicle, User, AppSetting } from '../types';
import { SortableTh, useSortableData } from '../utils/tableSort';

interface InspectionsProps {
  inspections: VehicleInspection[];
  vehicles: Vehicle[];
  onAddInspection: (i: Omit<VehicleInspection, 'id'>) => Promise<void>;
  onUpdateInspection: (i: VehicleInspection) => Promise<void>;
  currentUser: User | null;
  settings?: AppSetting[];
}

const toDateTimeLocalValue = (value: unknown, fallback = ''): string => {
  if (!value) return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 16);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return fallback;
  const localDate = new Date(parsed.getTime() - (parsed.getTimezoneOffset() * 60000));
  return localDate.toISOString().slice(0, 16);
};

const toDateInputValue = (value: Date): string => {
  const localDate = new Date(value.getTime() - (value.getTimezoneOffset() * 60000));
  return localDate.toISOString().slice(0, 10);
};

const DAILY_REVISION_RUBRICS = [
  'Motor',
  'Transmision',
  'Clutch',
  'Frenos',
  'Direccion',
  'Suspension',
  'Amortiguadores',
  'Llantas',
  'Bateria',
  'Luces',
  'Limpiadores',
  'Claxon',
  'Palanca de Velocidades',
  'Velocimetro',
  'Medidor de Temperatura',
  'Medidor de Aceite'
];

const Inspections: React.FC<InspectionsProps> = ({ inspections, vehicles, onAddInspection, onUpdateInspection, currentUser, settings = [] }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<VehicleInspection | null>(null);
  const [editingInspection, setEditingInspection] = useState<VehicleInspection | null>(null);
  const [showDailyRevisionModal, setShowDailyRevisionModal] = useState(false);
  const [showDailyRevisionPrint, setShowDailyRevisionPrint] = useState(false);
  const [dailyRevisionDate, setDailyRevisionDate] = useState(() => new Date());
  const [dailyRevisionDateInput, setDailyRevisionDateInput] = useState(() => toDateInputValue(new Date()));
  const [dailyRevisionVehicleId, setDailyRevisionVehicleId] = useState('');
  const [formError, setFormError] = useState('');

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
    setFormError('');
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
      setFormError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar la revisión";
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  };

  type InspectionSortKey = 'date' | 'unit' | 'inspector' | 'odometer';
  const inspectionSortAccessors = useMemo<Record<InspectionSortKey, (inspection: VehicleInspection) => unknown>>(() => ({
    date: inspection => inspection.date,
    unit: inspection => {
      const vehicle = vehicles.find(v => v.id === inspection.vehicleId);
      return `${vehicle?.plate || ''} ${vehicle?.model || ''}`;
    },
    inspector: inspection => inspection.inspectorName,
    odometer: inspection => inspection.odometer
  }), [vehicles]);
  const {
    sortedItems: sortedInspections,
    sortConfig,
    requestSort
  } = useSortableData(inspections, inspectionSortAccessors, { key: 'date', direction: 'desc' });

  // Helper para formato de hora
  const formatDateTime = (isoDate: string) => {
    if (!isoDate) return '---';
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return isoDate; }
  };

  const handleEdit = (insp: VehicleInspection) => {
    setFormError('');
    setEditingInspection(insp);
    setFormData({
      ...initialFormState,
      ...insp,
      date: toDateTimeLocalValue(insp.date, new Date().toISOString().slice(0, 16)),
      vehicleId: String(insp.vehicleId ?? '').trim(),
      inspectorName: String(insp.inspectorName ?? ''),
      odometer: insp.odometer !== undefined && insp.odometer !== null ? String(insp.odometer) : '',
    });
    setShowModal(true);
  };

  const handlePrintRequest = (insp: VehicleInspection) => {
    setSelectedInspection(insp);
    setShowPrintPreview(true);
  };

  const availableDailyRevisionVehicles = useMemo(() => {
    return [...vehicles]
      .filter(v => v.status !== 'inactive')
      .sort((a, b) => String(a.plate || '').localeCompare(String(b.plate || ''), 'es'))
  }, [vehicles]);

  const dailyRevisionVehicle = useMemo(
    () => availableDailyRevisionVehicles.find(v => v.id === dailyRevisionVehicleId) || null,
    [availableDailyRevisionVehicles, dailyRevisionVehicleId]
  );

  const dailyRevisionRows = useMemo(() => {
    if (!dailyRevisionVehicle) return [];
    return [{ rowNumber: 1, vehicle: dailyRevisionVehicle }];
  }, [dailyRevisionVehicle]);

  const handleOpenDailyRevisionModal = () => {
    if (!availableDailyRevisionVehicles.length) return;
    setDailyRevisionVehicleId(availableDailyRevisionVehicles[0].id);
    setDailyRevisionDateInput(toDateInputValue(new Date()));
    setShowDailyRevisionModal(true);
  };

  const handleDailyRevisionGenerate = () => {
    if (!dailyRevisionVehicleId || !dailyRevisionDateInput) return;
    const parsedDate = new Date(`${dailyRevisionDateInput}T12:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return;
    setDailyRevisionDate(parsedDate);
    setShowDailyRevisionModal(false);
    setShowDailyRevisionPrint(true);
  };

  const dailyRevisionDateLabel = useMemo(
    () => dailyRevisionDate.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: '2-digit' }).toUpperCase(),
    [dailyRevisionDate]
  );
  const dailyRevisionDateShort = useMemo(
    () => dailyRevisionDate.toLocaleDateString('es-MX'),
    [dailyRevisionDate]
  );

  // Variables institucionales
  // Normalizar la ruta del logo (convertir rutas relativas a absolutas)
  const rawLogo = String(settingsMap['APP_LOGO'] || '').trim();
  const normalizedLogo = rawLogo.replace(/\\/g, '/');
  const appLogo = normalizedLogo
    ? (normalizedLogo.startsWith('./') ? normalizedLogo.replace('./', '/') : normalizedLogo.startsWith('images/') ? `/${normalizedLogo}` : normalizedLogo)
    : '/images/logo-dif.png';
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
          
          #inspection-printable, #inspection-printable *,
          #daily-revision-printable, #daily-revision-printable * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          #inspection-printable,
          #daily-revision-printable {
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
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenDailyRevisionModal}
            disabled={!availableDailyRevisionVehicles.length}
            className="btn btn-secondary"
          >
            <span className="material-symbols-outlined ui-icon">fact_check</span>
            Bitacora Revision
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <span className="material-symbols-outlined">fact_check</span>
            Nueva Revisión
          </button>
        </div>
      </div>

      <div className="card flex flex-col no-print">
        <div className="px-8 py-5 border-b border-border flex items-center justify-between bg-surface-subtle/50">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Últimas Revisiones</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table-professional">
            <thead>
              <tr>
                <SortableTh label="Fecha / Hora" sortKey="date" sortConfig={sortConfig} onSort={requestSort} />
                <SortableTh label="Unidad" sortKey="unit" sortConfig={sortConfig} onSort={requestSort} />
                <SortableTh label="Inspector" sortKey="inspector" sortConfig={sortConfig} onSort={requestSort} />
                <SortableTh label="Odómetro" sortKey="odometer" sortConfig={sortConfig} onSort={requestSort} className="text-right" align="right" />
                <th className="text-center">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {sortedInspections.map((insp) => {
                const vehicle = vehicles.find(v => v.id === insp.vehicleId);
                return (
                  <tr key={insp.id} className="hover:bg-surface-subtle/50 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="font-black text-text text-sm">{formatDateTime(insp.date)}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-black text-text text-sm">{vehicle?.plate || insp.vehicleId}</p>
                      <p className="text-[10px] text-text-muted font-bold uppercase">{vehicle?.model || 'Desconocido'}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-bold text-text uppercase">{insp.inspectorName}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <p className="text-[11px] font-black text-text-muted">{(Number(insp.odometer) || 0).toLocaleString()} km</p>
                    </td>
                     <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handlePrintRequest(insp)}
                            className="size-9 bg-surface border border-border text-text-muted hover:text-primary hover:border-blue-200 rounded-xl transition-all flex items-center justify-center shadow-sm"
                          >
                            <span className="material-symbols-outlined text-lg">description</span>
                          </button>
                          <button 
                            onClick={() => handleEdit(insp)}
                            className="size-9 bg-surface border border-border text-text-muted hover:text-primary hover:border-blue-200 rounded-xl transition-all flex items-center justify-center shadow-sm"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-secondary/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-surface rounded-xl w-full max-w-4xl border border-border overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-subtle">
               <div className="flex items-center gap-3">
                 <div className="size-10 bg-amber-100 rounded-lg flex items-center justify-center">
                   <span className="material-symbols-outlined text-amber-600" aria-hidden="true">health_and_safety</span>
                 </div>
                 <div>
                   <h3 className="text-lg font-black text-text">{editingInspection ? 'Editar Revisión' : 'Registrar Revisión'}</h3>
                 </div>
               </div>
               <button onClick={() => !isSaving && setShowModal(false)} disabled={isSaving} className="size-9 rounded-md hover:bg-surface transition-all flex items-center justify-center text-text-muted disabled:opacity-50" aria-label="Cerrar modal">
                 <span className="material-symbols-outlined" aria-hidden="true">close</span>
               </button>
             </div>
            
            <form onSubmit={handleSubmit} autoComplete="off" className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Fecha y Hora</label>
                  <input required disabled={isSaving} type="datetime-local" className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Inspector</label>
                  <input required disabled={isSaving} className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all uppercase" placeholder="Nombre completo" value={formData.inspectorName} onChange={e => setFormData({...formData, inspectorName: e.target.value})} />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Vehículo</label>
                   <select required disabled={isSaving} className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all" value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})}>
                   <option value="">Seleccionar...</option>
                   {vehicles.map(v => (<option key={v.id} value={v.id}>{v.plate} - {v.model}</option>))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Odómetro Actual (Km)</label>
                  <input type="number" required disabled={isSaving} className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all" placeholder="0" value={formData.odometer} onChange={e => setFormData({...formData, odometer: e.target.value})} />
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
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
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Observaciones Generales</label>
                <textarea rows={3} disabled={isSaving} className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all resize-none" placeholder="Detalles adicionales..." value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} />
              </div>

              {formError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" disabled={isSaving} onClick={() => setShowModal(false)} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-text-muted hover:bg-surface-subtle rounded-md transition-all disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-[2] py-3 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-md hover:opacity-90 transition-all disabled:opacity-80 flex items-center justify-center gap-2">
                  {isSaving ? <><span className="material-symbols-outlined animate-spin">sync</span> Guardando...</> : (editingInspection ? 'Guardar Cambios' : 'Registrar Revisión')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDailyRevisionModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-secondary/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-surface rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-surface-subtle/50">
              <div>
                <h3 className="text-xl font-black text-text tracking-tight">Bitacora de Revision</h3>
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mt-1">Selecciona unidad y fecha</p>
              </div>
              <button onClick={() => setShowDailyRevisionModal(false)} className="size-10 rounded-full hover:bg-surface hover:shadow-md transition-all flex items-center justify-center text-text-muted">
                <span className="material-symbols-outlined ui-icon">close</span>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Vehiculo</label>
                <select
                  className="w-full bg-surface-subtle border border-border rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                  value={dailyRevisionVehicleId}
                  onChange={e => setDailyRevisionVehicleId(e.target.value)}
                >
                  <option value="">Seleccionar vehículo...</option>
                  {availableDailyRevisionVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Fecha de revisión</label>
                <input
                  type="date"
                  className="w-full bg-surface-subtle border border-border rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                  value={dailyRevisionDateInput}
                  onChange={e => setDailyRevisionDateInput(e.target.value)}
                />
              </div>
              {dailyRevisionVehicle && (
                <div className="bg-surface-subtle p-4 rounded-2xl border border-border flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-surface flex items-center justify-center text-primary shadow-sm">
                    <span className="material-symbols-outlined ui-icon">directions_car</span>
                  </div>
                  <div>
                    <p className="font-bold text-text leading-tight">{dailyRevisionVehicle.model}</p>
                    <p className="text-xs font-mono text-text-muted">{dailyRevisionVehicle.plate} {dailyRevisionVehicle.economicNumber ? `- No. Eco: ${dailyRevisionVehicle.economicNumber}` : ''}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDailyRevisionModal(false)}
                  className="flex-1 py-3.5 text-[11px] font-black uppercase tracking-widest text-text-muted hover:bg-surface-subtle rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDailyRevisionGenerate}
                  disabled={!dailyRevisionVehicleId || !dailyRevisionDateInput}
                  className="flex-[2] py-3.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined ui-icon">description</span>
                  Abrir Bitacora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA PREVIA DE BITACORA DE REVISION MECANICA */}
      {showDailyRevisionPrint && dailyRevisionRows.length > 0 && (
        <div id="daily-revision-preview-screen" className="fixed inset-0 z-[210] bg-surface flex flex-col overflow-y-auto">
          <div className="sticky top-0 bg-secondary p-4 flex justify-between items-center text-white shadow-lg no-print">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowDailyRevisionPrint(false)} className="size-10 flex items-center justify-center hover:bg-surface/10 rounded-full transition-colors">
                <span className="material-symbols-outlined ui-icon">arrow_back</span>
              </button>
              <div>
                <p className="text-sm font-black uppercase tracking-widest">Bitacora de Revision Mecanica</p>
                <p className="text-xs text-text-muted">{dailyRevisionDateLabel}</p>
                {dailyRevisionVehicle && (
                  <p className="text-xs text-text-muted">{dailyRevisionVehicle.plate} - {dailyRevisionVehicle.model}</p>
                )}
              </div>
            </div>
            <button onClick={() => window.print()} className="bg-primary px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-lg hover:opacity-90 transition-all">
              <span className="material-symbols-outlined ui-icon">picture_as_pdf</span> Imprimir / Descargar PDF
            </button>
          </div>

          <style>{`
            #daily-revision-printable .daily-revision-sheet {
              margin-bottom: 1.5rem;
            }
            @media print {
              @page { margin: 0; size: letter landscape; }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
              }
              #daily-revision-preview-screen {
                position: static !important;
                inset: auto !important;
                overflow: visible !important;
                height: auto !important;
                display: block !important;
                background: white !important;
              }
              #daily-revision-preview-content {
                padding: 0 !important;
                background: white !important;
                overflow: visible !important;
                display: block !important;
              }
              #daily-revision-printable {
                display: block !important;
                width: 100% !important;
              }
              #daily-revision-printable .daily-revision-sheet {
                margin: 0 !important;
                box-shadow: none !important;
                width: 27.94cm !important;
                height: 21.59cm !important;
                min-height: 0 !important;
                padding: 0.55cm 0.8cm !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                page-break-after: always;
                break-after: page;
              }
              #daily-revision-printable .daily-revision-sheet:last-child {
                page-break-after: auto;
                break-after: auto;
              }
            }
          `}</style>

          <div id="daily-revision-preview-content" className="flex-1 bg-surface-subtle p-6 flex justify-center overflow-auto">
            <div id="daily-revision-printable" className="w-full">
              {dailyRevisionRows.map((row, idx) => (
                <div key={`${row.vehicle.id}-${idx}`} className="daily-revision-sheet mx-auto bg-surface shadow-2xl relative text-text" style={{ width: '27.94cm', minHeight: '21.59cm', padding: '0.8cm 1cm', boxSizing: 'border-box' }}>
                  <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-3">
                    <div className="flex items-center gap-4">
                      <img
                        src={appLogo}
                        alt="Logo"
                        className="w-24 object-contain"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = '/images/logo-dif.png';
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-[10pt] font-black text-text uppercase leading-none tracking-tight">{settingsMap['INSTITUTION_NAME'] || 'SISTEMA DIF MUNICIPAL LA PAZ'}</span>
                        <span className="text-[7pt] font-bold uppercase text-text-muted mt-1 tracking-[0.2em]">Parque Vehicular - Revision Mecanica Diaria</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-block bg-secondary text-white px-3 py-1 font-black text-[8pt] uppercase tracking-widest rounded-sm mb-1">
                        Bitacora de Revision Mecanica
                      </div>
                      <p className="text-[8pt] text-text-muted font-bold">Fecha: {dailyRevisionDateShort}</p>
                      <p className="text-[7pt] text-slate-300 font-bold">Hoja {idx + 1} de {dailyRevisionRows.length}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-x-3 gap-y-1.5 text-[8pt] mb-3">
                    <div className="flex items-center gap-1 col-span-6">
                      <span className="font-black text-text-muted uppercase whitespace-nowrap">Unidad:</span>
                      <span className="font-bold text-text border-b border-slate-300 flex-1 pb-0.5">{[row.vehicle.brand, row.vehicle.model, row.vehicle.year].filter(Boolean).join(' ') || row.vehicle.model || '---'}</span>
                    </div>
                    <div className="flex items-center gap-1 col-span-6">
                      <span className="font-black text-text-muted uppercase whitespace-nowrap">Fecha de revisión:</span>
                      <span className="font-bold text-text border-b border-slate-300 flex-1 pb-0.5">{dailyRevisionDateLabel}</span>
                    </div>
                    <div className="flex items-center gap-1 col-span-6">
                      <span className="font-black text-text-muted uppercase whitespace-nowrap">Odometro:</span>
                      <span className="font-bold text-text border-b border-slate-300 flex-1 pb-0.5">&nbsp;</span>
                      <span className="font-black text-text-muted uppercase whitespace-nowrap">km</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-6">
                      <span className="font-black text-text-muted uppercase whitespace-nowrap">Nivel Combustible:</span>
                      <div className="relative flex-1 min-w-[200px]">
                        <div className="absolute left-3 right-3 top-[7px] h-[2px] bg-slate-300"></div>
                        <div className="relative flex items-start justify-between">
                          {['E', '1/4', '1/2', '3/4', 'F'].map((level) => (
                            <div key={level} className="flex flex-col items-center">
                              <span className="size-4 rounded-full border-2 border-slate-500 bg-surface"></span>
                              <span className="text-[7pt] font-black text-text mt-0.5">{level}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 col-span-12">
                      <span className="font-black text-text-muted uppercase whitespace-nowrap">Nombre de quien reviso:</span>
                      <span className="font-bold text-text border-b border-slate-300 flex-1 pb-1">&nbsp;</span>
                    </div>
                  </div>

                  <div className="border border-slate-400 rounded overflow-hidden">
                    <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                      <thead>
                        <tr className="bg-[#9e1b32] text-white">
                          <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase border-r border-slate-600 text-center" style={{ width: '8%' }}>#</th>
                          <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase border-r border-slate-600 text-center" style={{ width: '48%' }}>Rubro</th>
                          <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase border-r border-slate-600 text-center" style={{ width: '11%' }}>Bien</th>
                          <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase border-r border-slate-600 text-center" style={{ width: '11%' }}>Regular</th>
                          <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase border-r border-slate-600 text-center" style={{ width: '11%' }}>Mal</th>
                          <th className="py-1.5 px-1 text-[6.5pt] font-black uppercase text-center" style={{ width: '11%' }}>Muy Mal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DAILY_REVISION_RUBRICS.map((rubro, rubroIndex) => (
                          <tr key={`${row.vehicle.id}-${rubroIndex}`} className={`${rubroIndex % 2 === 0 ? 'bg-surface' : 'bg-surface-subtle/50'} border-t border-slate-300`}>
                            <td className="py-1.5 px-1 border-r border-border text-center text-[7pt] font-black text-text">{rubroIndex + 1}</td>
                            <td className="py-1.5 px-1 border-r border-border text-[7pt] font-bold text-text">{rubro}</td>
                            <td className="py-1.5 px-1 border-r border-border text-center text-[7pt] text-text-muted">[ ]</td>
                            <td className="py-1.5 px-1 border-r border-border text-center text-[7pt] text-text-muted">[ ]</td>
                            <td className="py-1.5 px-1 border-r border-border text-center text-[7pt] text-text-muted">[ ]</td>
                            <td className="py-1.5 px-1 text-center text-[7pt] text-text-muted">[ ]</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 border border-slate-300 rounded p-2">
                    <p className="text-[7pt] font-black text-text-muted uppercase mb-1">Observaciones Generales</p>
                    <div className="h-14 border border-border rounded bg-surface">&nbsp;</div>
                  </div>

                  <div className="mt-2 flex justify-between items-end">
                    <div className="text-[7pt] text-text-muted">
                      <p className="font-bold">* Formato diario: una hoja por vehículo.</p>
                      <p className="font-bold">* Reportar de inmediato cualquier condición marcada como MAL o MUY MAL.</p>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VISTA DE IMPRESIÓN */}
      {showPrintPreview && selectedInspection && (
        <div className="fixed inset-0 z-[200] bg-surface flex flex-col overflow-y-auto">
           <div className="sticky top-0 bg-secondary p-4 flex justify-between items-center text-white shadow-lg no-print">
              <button onClick={() => setShowPrintPreview(false)} className="bg-surface/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-surface/20 transition-all">Cerrar</button>
              <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Reporte PDF
              </button>
            </div>
            <div className="flex-1 bg-surface-subtle p-10 flex justify-center">
               <div id="inspection-printable" className="bg-surface w-[21.59cm] min-h-[27.94cm] p-[1.5cm] shadow-2xl relative text-text">
                
                {/* Header Institucional - Formal Design */}
                <div className="print-header flex justify-between items-center mb-8 border-b-4 border-slate-900 pb-6">
                  <div className="flex items-center gap-6">
                    <img
                      src={appLogo}
                      alt="Logo"
                      className="w-24 object-contain"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = '/images/logo-dif.png';
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-text uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                      <span className="text-lg font-black text-text uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                      <span className="text-[8pt] font-bold uppercase text-text-muted mt-2 tracking-[0.2em]">Coordinación de Parque Vehicular • Inspecciones Técnicas</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-secondary text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                        Reporte de Revisión
                    </div>
                    <p className="text-xs font-bold text-text-muted">FOLIO: <span className="font-black text-text text-lg ml-1">{(selectedInspection.id || '---').slice(-6).toUpperCase()}</span></p>
                    <p className="text-[9pt] text-text-muted font-bold mt-1">Fecha: {new Date(selectedInspection.date).toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
                    <p className="text-[8pt] text-slate-300 font-bold mt-1">Generado: {new Date().toLocaleDateString('es-ES', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
                  </div>
                </div>

                {/* Datos Principales - Formal Table */}
                <div className="mb-8 mt-6 break-inside-avoid">
                    <div className="bg-secondary text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">
                        Datos del Vehículo
                    </div>
                    <table className="w-full border-collapse">
                        <tbody>
                            <tr className="border-b border-border">
                                <td className="py-3 text-[9pt] font-black text-text-muted uppercase w-48">Placas</td>
                                <td className="py-3 text-[16pt] font-black text-text tracking-widest">{vehicles.find(v => v.id === selectedInspection.vehicleId)?.plate || '---'}</td>
                            </tr>
                            <tr className="border-b border-border">
                                <td className="py-3 text-[9pt] font-black text-text-muted uppercase">Unidad / Modelo</td>
                                <td className="py-3 text-[11pt] font-bold text-text overflow-wrap" style={{maxWidth: '300px', wordWrap: 'break-word'}}>{vehicles.find(v => v.id === selectedInspection.vehicleId)?.model || '---'}</td>
                            </tr>
                            <tr className="border-b border-border">
                                <td className="py-3 text-[9pt] font-black text-text-muted uppercase">Inspector Responsable</td>
                                <td className="py-3 text-[11pt] font-bold text-text">{selectedInspection.inspectorName}</td>
                            </tr>
                            <tr className="border-b border-border">
                                <td className="py-3 text-[9pt] font-black text-text-muted uppercase">Kilometraje Registrado</td>
                                <td className="py-3 text-[11pt] font-bold text-text">{(Number(selectedInspection.odometer) || 0).toLocaleString()} km</td>
                            </tr>
                            <tr>
                                <td className="py-3 text-[9pt] font-black text-text-muted uppercase">Hora de Inspección</td>
                                <td className="py-3 text-[11pt] font-bold text-text">{new Date(selectedInspection.date).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit', hour12: true})}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Checklist Diagnostico - Formal Grid */}
                <div className="mb-8 break-inside-avoid">
                   <div className="bg-secondary text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">
                       Evaluación de Componentes (16 Puntos)
                   </div>
                   <div className="checklist-grid grid grid-cols-4 gap-y-4 gap-x-6 border-2 border-border p-6 rounded-xl">
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
                    <div className="bg-secondary text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">
                        Observaciones del Inspector
                    </div>
                    <div className="observations-box bg-surface-subtle p-6 rounded-lg min-h-[80px] border border-border">
                      <p className="text-[10pt] text-text leading-relaxed italic" style={{wordWrap: 'break-word', overflowWrap: 'break-word'}}>
                         {selectedInspection.observations || 'Sin observaciones particulares registradas durante la inspección.'}
                      </p>
                    </div>
                 </div>

                  {/* Signature Section - Flowing with Content */}
                  <div className="signature-section break-inside-avoid">
                      <div className="grid grid-cols-2 gap-24 text-center">
                        <div className="signature-line border-t-2 border-slate-900 pt-4">
                            <p className="text-[9pt] font-black uppercase text-text">{selectedInspection.inspectorName}</p>
                            <p className="text-[7pt] font-bold text-text-muted mt-1 uppercase tracking-widest">Inspector Técnico</p>
                            <p className="text-[7pt] font-bold text-text-muted uppercase tracking-widest">Revisión</p>
                        </div>
                        <div className="signature-line border-t-2 border-slate-900 pt-4">
                            <p className="text-[9pt] font-black uppercase text-text">{managerName}</p>
                            <p className="text-[7pt] font-bold text-text-muted mt-1 uppercase tracking-widest">{managerPos}</p>
                            <p className="text-[7pt] font-bold text-text-muted uppercase tracking-widest">Validación</p>
                        </div>
                      </div>
                      <div className="text-center mt-8 border-t border-border pt-2">
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
       <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">{label}</label>
    </div>
    <select 
      disabled={disabled}
      className="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" 
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
       <div className={`size-3 rounded-full border border-border ${colorClass} print:border-0`} style={{printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact'}}></div>
       <div className="flex flex-col">
         <span className="text-[7pt] font-black uppercase text-text-muted leading-none">{label}</span>
         <span className="text-[8pt] font-bold text-text uppercase leading-tight">{status || 'BIEN'}</span>
       </div>
    </div>
  );
};

export default Inspections;
