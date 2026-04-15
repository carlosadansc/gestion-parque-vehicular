
import React, { useMemo, useState } from 'react';
import { Incident, Vehicle, Driver, AppSetting, IncidentType } from '../types';
import { SortableTh, useSortableData } from '../utils/tableSort';

const CUSTOM_INCIDENT_TYPE_VALUE = '__custom_incident_type__';
const DEFAULT_INCIDENT_TYPES = [
  { value: 'mechanical', label: 'Mecánica' },
  { value: 'traffic', label: 'Tránsito / Multa' },
  { value: 'accident', label: 'Accidente' },
  { value: 'theft', label: 'Robo' }
];
const DEFAULT_INCIDENT_TYPE_VALUES = new Set(DEFAULT_INCIDENT_TYPES.map(item => item.value));
const normalizeIncidentTypeName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

interface IncidentsProps {
  incidents: Incident[];
  incidentTypes?: IncidentType[];
  searchQuery: string;
  onAddIncident: (newIncident: Omit<Incident, 'id'>) => Promise<void>;
  onUpdateIncident: (incident: Incident) => Promise<void>;
  onAddIncidentType?: (name: string) => Promise<void>;
  vehicles?: Vehicle[];
  drivers?: Driver[];
  settings?: AppSetting[];
}

const Incidents: React.FC<IncidentsProps> = ({ incidents, incidentTypes = [], searchQuery, onAddIncident, onUpdateIncident, onAddIncidentType, vehicles = [], drivers = [], settings = [] }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [formError, setFormError] = useState('');
  const [customIncidentType, setCustomIncidentType] = useState('');

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    (settings || []).forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

  const [formData, setFormData] = useState({
    type: 'mechanical',
    title: '',
    description: '',
    vehicleId: '',
    driverId: '',
    status: 'pending' as 'critical' | 'pending' | 'resolved' | 'in-workshop' | 'in-resolution'
  });

  const filteredIncidents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return incidents.filter((incident) => {
      const vehicle = vehicles.find(v => v.id === incident.vehicleId);
      const driver = drivers.find(d => d.id === incident.driverId);
      return String(incident.title || '').toLowerCase().includes(query) ||
             String(incident.description || '').toLowerCase().includes(query) ||
             String(vehicle?.plate || '').toLowerCase().includes(query) ||
             String(driver?.name || '').toLowerCase().includes(query);
    });
  }, [incidents, vehicles, drivers, searchQuery]);

  const resetForm = () => {
    setFormError('');
    setEditingIncident(null);
    setCustomIncidentType('');
    setFormData({ type: 'mechanical', title: '', description: '', vehicleId: '', driverId: '', status: 'pending' });
  };

  const handleEdit = (incident: Incident) => {
    setFormError('');
    setEditingIncident(incident);
    setCustomIncidentType(DEFAULT_INCIDENT_TYPE_VALUES.has(incident.type) ? '' : incident.type);
    setFormData({
        type: incident.type,
        title: incident.title,
        description: incident.description,
        vehicleId: incident.vehicleId,
        driverId: incident.driverId,
        status: incident.status
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const isNewIncidentType = formData.type === CUSTOM_INCIDENT_TYPE_VALUE;
    const resolvedType = isNewIncidentType
      ? customIncidentType.trim().toUpperCase()
      : String(formData.type || '').trim();
    if (!resolvedType) {
      setFormError('Debes seleccionar o escribir un tipo de incidencia.');
      return;
    }
    if (!formData.title || !formData.vehicleId || !formData.driverId) return;

    const payload = {
      ...formData,
      type: resolvedType
    };

    setIsSaving(true);
    try {
      if (isNewIncidentType && onAddIncidentType) {
        const normalizedType = normalizeIncidentTypeName(resolvedType);
        const existsInCatalog = incidentTypeOptions.some(option => normalizeIncidentTypeName(option.value) === normalizedType);
        if (!existsInCatalog) {
          await onAddIncidentType(resolvedType);
        }
      }
      if (editingIncident) {
        await onUpdateIncident({
            ...editingIncident,
            ...payload
        });
      } else {
        await onAddIncident({
            ...payload,
            date: new Date().toISOString()
        });
      }
      resetForm();
      setShowModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar incidencia";
      setFormError(message);
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
  const coordName = settingsMap['ADMINISTRATIVE_COORDINATOR_NAME'] || '';
  const coordPos = settingsMap['ADMINISTRATIVE_COORDINATOR_POS'] || 'COORDINADOR ADMINISTRATIVO';
  // Normalizar la ruta del logo (convertir rutas relativas a absolutas)
  const rawLogo = settingsMap['APP_LOGO'] || '/images/logo-dif.png';
  const appLogo = rawLogo.startsWith('./') ? rawLogo.replace('./', '/') : rawLogo;

  const reportVehicle = selectedIncident ? vehicles.find(v => v.id === selectedIncident.vehicleId) : null;
  const reportDriver = selectedIncident ? drivers.find(d => d.id === selectedIncident.driverId) : null;

  const typeMap: Record<string, string> = {
    mechanical: 'Mecánica',
    traffic: 'Tránsito',
    accident: 'Accidente',
    theft: 'Robo / Asalto'
  };

  const incidentTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    const options = [
      ...DEFAULT_INCIDENT_TYPES,
      ...incidentTypes.map(type => ({
        value: String(type.value || type.name || '').trim(),
        label: String(type.name || type.value || '').trim()
      }))
    ];

    return options
      .filter(option => {
        if (!option.value || !option.label) return false;
        const normalized = normalizeIncidentTypeName(option.value);
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'es-MX', { sensitivity: 'base' }));
  }, [incidentTypes]);
  const catalogIncidentTypeValues = useMemo(() => new Set(incidentTypeOptions.map(option => option.value)), [incidentTypeOptions]);
  const legacyIncidentTypeOptions = useMemo(() => {
    const seen = new Set(catalogIncidentTypeValues);
    return incidents
      .map(incident => String(incident.type || '').trim())
      .filter(type => {
        if (!type || seen.has(type)) return false;
        seen.add(type);
        return true;
      })
      .map(type => ({ value: type, label: typeMap[type] || type }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es-MX', { sensitivity: 'base' }));
  }, [catalogIncidentTypeValues, incidents]);
  const allIncidentTypeOptions = useMemo(
    () => [...incidentTypeOptions, ...legacyIncidentTypeOptions],
    [incidentTypeOptions, legacyIncidentTypeOptions]
  );
  const selectedTypeIsCustom = formData.type === CUSTOM_INCIDENT_TYPE_VALUE || !allIncidentTypeOptions.some(option => option.value === formData.type);
  const incidentTypeSelectValue = selectedTypeIsCustom
    ? CUSTOM_INCIDENT_TYPE_VALUE
    : formData.type;

  const statusMap: Record<string, string> = {
    'critical': 'Crítica / Urgente',
    'pending': 'Pendiente',
    'resolved': 'Resuelta',
    'in-workshop': 'En Taller',
    'in-resolution': 'En Resolución'
  };

  const typeBadgeClasses: Record<string, string> = {
    mechanical: 'bg-blue-50 text-blue-700 border-blue-100',
    traffic: 'bg-amber-50 text-amber-700 border-amber-100',
    accident: 'bg-rose-50 text-rose-700 border-rose-100',
    theft: 'bg-purple-50 text-purple-700 border-purple-100'
  };

  const statusBadgeClasses: Record<string, string> = {
    critical: 'bg-rose-50 text-rose-700 border-rose-100',
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'in-workshop': 'bg-blue-50 text-blue-700 border-blue-100',
    'in-resolution': 'bg-indigo-50 text-indigo-700 border-indigo-100'
  };

  type IncidentSortKey = 'folio' | 'date' | 'type' | 'title' | 'driver' | 'status';
  const incidentSortAccessors = useMemo<Record<IncidentSortKey, (incident: Incident) => unknown>>(() => ({
    folio: incident => incident.consecutiveNumber ?? incident.id,
    date: incident => incident.date,
    type: incident => typeMap[incident.type] || incident.type,
    title: incident => incident.title,
    driver: incident => drivers.find(d => d.id === incident.driverId)?.name || incident.driverId,
    status: incident => statusMap[incident.status] || incident.status
  }), [drivers]);
  const {
    sortedItems: sortedIncidents,
    sortConfig,
    requestSort
  } = useSortableData(filteredIncidents, incidentSortAccessors, { key: 'date', direction: 'desc' });

  return (
    <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
       <style>{`
         @media print {
           body * { 
             visibility: hidden; 
           }
           #incident-printable, #incident-printable * { 
             visibility: visible; 
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
           }
           #incident-printable { 
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
            @page { margin: 0.5cm; size: letter portrait; }
           
            /* ========================================
               SIGNATURE SECTION - FLOWING WITH CONTENT
               ======================================== */
            #incident-printable .signature-section {
              page-break-inside: avoid;
              margin-top: 2rem;
            }
            
            #incident-printable .signature-line {
              border-top: 2px solid #1e293b;
              padding-top: 0.5rem;
              min-width: 200px;
            }
         }
       `}</style>

      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="page-title">Tablero de Incidencias</h1>
          <p className="page-subtitle">Monitoreo y gestión de eventos</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn btn-primary"
        >
          <span className="material-symbols-outlined ui-icon">add_circle</span>
          Reportar Incidencia
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 no-print">
        <SummaryCard label="Total Hoy" value={incidents.length.toString()} trend="+2.4%" color="green" />
        <SummaryCard label="Mecánicas" value={incidents.filter(i => i.type === 'mechanical').length.toString()} icon="handyman" color="blue" />
        <SummaryCard label="Tránsito" value={incidents.filter(i => i.type === 'traffic').length.toString()} icon="receipt_long" color="amber" />
        <SummaryCard label="Accidentes" value={incidents.filter(i => i.type === 'accident').length.toString()} icon="emergency" color="rose" />
        <SummaryCard label="Robos" value={incidents.filter(i => i.type === 'theft').length.toString()} icon="local_police" color="purple" />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden no-print">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Listado de incidencias</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">
              Mostrando {filteredIncidents.length} de {incidents.length} reportes.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <SortableTh label="Folio" sortKey="folio" sortConfig={sortConfig} onSort={requestSort} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400" />
                <SortableTh label="Fecha" sortKey="date" sortConfig={sortConfig} onSort={requestSort} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400" />
                <SortableTh label="Tipo" sortKey="type" sortConfig={sortConfig} onSort={requestSort} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400" />
                <SortableTh label="Incidencia" sortKey="title" sortConfig={sortConfig} onSort={requestSort} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400" />
                <SortableTh label="Conductor" sortKey="driver" sortConfig={sortConfig} onSort={requestSort} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400" />
                <SortableTh label="Estado" sortKey="status" sortConfig={sortConfig} onSort={requestSort} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400" />
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedIncidents.map((incident) => {
                const driver = drivers.find(d => d.id === incident.driverId);
                const typeLabel = typeMap[incident.type] || incident.type;
                const statusLabel = statusMap[incident.status] || incident.status;
                const folio = incident.consecutiveNumber != null
                  ? `INC-${String(incident.consecutiveNumber).padStart(4, '0')}`
                  : incident.id;

                return (
                  <tr key={incident.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 align-top">
                      <p className="text-xs font-black text-slate-900 tracking-tight whitespace-nowrap">{folio}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="text-xs font-bold text-slate-600 whitespace-nowrap">
                        {new Date(incident.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${typeBadgeClasses[incident.type] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {typeLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top max-w-[320px]">
                      <p className="text-sm font-black text-slate-900 leading-snug">{incident.title}</p>
                      <p className="text-xs font-medium text-slate-500 leading-relaxed mt-1 line-clamp-2">{incident.description}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="text-xs font-bold text-slate-700 max-w-[180px] truncate">{driver?.name || incident.driverId || '---'}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${statusBadgeClasses[incident.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(incident)}
                          className="btn-icon btn-icon-primary shrink-0"
                          title="Editar Incidencia"
                          aria-label="Editar incidencia"
                        >
                          <span className="material-symbols-outlined ui-icon">edit</span>
                        </button>
                        <button
                          onClick={() => handlePrintRequest(incident)}
                          className="btn-icon btn-icon-success shrink-0"
                          title="Imprimir Reporte"
                          aria-label="Imprimir reporte"
                        >
                          <span className="material-symbols-outlined ui-icon">description</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredIncidents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <span className="material-symbols-outlined text-slate-300 text-5xl mb-3">find_in_page</span>
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest">No hay incidencias para mostrar</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-xl w-full max-w-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-rose-100 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-rose-600" aria-hidden="true">warning</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{editingIncident ? 'Editar Incidencia' : 'Reportar Incidencia'}</h3>
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
            
            <form onSubmit={handleSubmit} autoComplete="off" className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Incidencia</label>
                  <select 
                    disabled={isSaving}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                    value={incidentTypeSelectValue}
                    onChange={e => {
                      const nextType = e.target.value;
                      if (nextType === CUSTOM_INCIDENT_TYPE_VALUE) {
                        setFormData({...formData, type: CUSTOM_INCIDENT_TYPE_VALUE});
                        setCustomIncidentType('');
                      } else {
                        setFormData({...formData, type: nextType});
                        setCustomIncidentType('');
                      }
                    }}
                  >
                    {allIncidentTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                    <option value={CUSTOM_INCIDENT_TYPE_VALUE}>Otro tipo...</option>
                  </select>
                  {incidentTypeSelectValue === CUSTOM_INCIDENT_TYPE_VALUE && (
                    <input
                      required
                      disabled={isSaving}
                      maxLength={80}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                      placeholder="Escribe el nuevo tipo"
                      value={customIncidentType}
                      onChange={e => setCustomIncidentType(e.target.value)}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prioridad / Estado</label>
                  <select 
                    disabled={isSaving}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in-resolution">En Resolución</option>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                  placeholder="Ej. Falla en frenos, Choque leve..."
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descripción detallada</label>
                <textarea 
                  rows={3} disabled={isSaving}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all resize-none disabled:opacity-50"
                  placeholder="Explica qué sucedió..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vehículo (Placa)</label>
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

              {formError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {formError}
                </p>
              )}

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
                      <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                      Guardando...
                    </>
                  ) : (
                    editingIncident ? 'Actualizar Reporte' : 'Guardar Reporte'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISTA PREVIA DE REPORTE FORMAL (ESTILO FICHA VEHICULO) */}
      {showPrintPreview && selectedIncident && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
           <div className="sticky top-0 bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg no-print">
             <div className="flex items-center gap-4">
                <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/20 transition-all">Cerrar</button>
                <h3 className="font-black text-sm uppercase tracking-widest">Vista Previa</h3>
             </div>
             <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
               <span className="material-symbols-outlined ui-icon">picture_as_pdf</span> Imprimir Reporte PDF
             </button>
          </div>
          
          <div className="flex-1 bg-slate-100 p-10 flex justify-center">
            <div id="incident-printable" className="bg-white w-[21.59cm] min-h-[27.94cm] p-[1.5cm] shadow-2xl relative text-slate-900">
              
              {/* Header Institucional */}
              <div className="flex justify-between items-center mb-8 border-b-4 border-slate-900 pb-6">
                <div className="flex items-center gap-6">
                  <img src="/images/logo-dif.png" alt="Logo" className="w-24 object-contain" />
                  <div className="flex flex-col">
                    <span className="text-lg font-black text-slate-900 uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                    <span className="text-lg font-black text-slate-900 uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                    <span className="text-[8pt] font-bold uppercase text-slate-400 mt-2 tracking-[0.2em]">Parque Vehicular • Incidencias</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                      Reporte de Incidencia Vehicular
                  </div>
                  <p className="text-xs font-bold text-slate-600">FOLIO: <span className="font-black text-slate-900 text-lg ml-1">INC-{String(selectedIncident.consecutiveNumber ?? 0).padStart(4, '0')}</span></p>
                  <p className="text-[9pt] text-slate-400 font-bold mt-1">Fecha de Emisión: {new Date().toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
                </div>
              </div>

              {/* Datos de Identificación (Tabla) */}
              <div className="mb-8 mt-6">
                  <h4 className="text-[9pt] font-black uppercase border-b-2 border-slate-200 pb-1 text-primary mb-4">Detalles del Evento</h4>
                  <table className="w-full border-collapse">
                      <tbody>
                          <tr className="border-b border-slate-200">
                              <td className="py-2 text-[9pt] font-black text-slate-400 uppercase w-48">Tipo de Incidencia</td>
                              <td className="py-2 text-[11pt] font-bold text-slate-900 uppercase">{typeMap[selectedIncident.type] || selectedIncident.type}</td>
                              <td className="py-2 text-[9pt] font-black text-slate-400 uppercase w-32 text-right pr-4">Fecha Evento</td>
                              <td className="py-2 text-[11pt] font-bold text-slate-900">{new Date(selectedIncident.date).toLocaleDateString('es-ES', {day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'})}</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                              <td className="py-2 text-[9pt] font-black text-slate-400 uppercase">Unidad Involucrada</td>
                              <td className="py-2 text-[11pt] font-bold text-slate-900">{reportVehicle?.model || '---'}</td>
                              <td className="py-2 text-[9pt] font-black text-slate-400 uppercase text-right pr-4">Placas</td>
                              <td className="py-2 text-[11pt] font-bold text-slate-900 uppercase tracking-widest">{reportVehicle?.plate || selectedIncident.vehicleId || '---'}</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                              <td className="py-2 text-[9pt] font-black text-slate-400 uppercase">Operador Responsable</td>
                              <td className="py-2 text-[11pt] font-bold text-slate-900">{reportDriver?.name || selectedIncident.driverId || '---'}</td>
                              <td className="py-2 text-[9pt] font-black text-slate-400 uppercase text-right pr-4">Estatus</td>
                              <td className="py-2 text-[11pt] font-bold text-slate-900 uppercase">{statusMap[selectedIncident.status] || selectedIncident.status}</td>
                          </tr>
                          <tr>
                              <td className="py-2 text-[9pt] font-black text-slate-400 uppercase">Resumen / Título</td>
                              <td colSpan={3} className="py-2 text-[11pt] font-bold text-slate-900 uppercase">{selectedIncident.title}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>

              {/* Descripción */}
              <div className="mb-12">
                 <h4 className="text-[9pt] font-black uppercase border-b-2 border-slate-200 pb-1 text-primary mb-4">Descripción de los Hechos</h4>
                 <div className="bg-slate-50 p-6 rounded-lg min-h-[200px] border border-slate-100">
                   <p className="text-[10pt] text-slate-700 leading-relaxed italic whitespace-pre-wrap text-justify">
                      {selectedIncident.description || 'Sin descripción detallada disponible.'}
                   </p>
                 </div>
                 <p className="text-[8pt] text-slate-400 mt-2 text-justify">
                    * El presente reporte describe los hechos acontecidos y sirve como constancia administrativa para el seguimiento correspondiente.
                 </p>
              </div>

               {/* Firmas - Formal Signature Section */}
               <div className="signature-section absolute bottom-[1.5cm] left-[1.5cm] right-[1.5cm]">
                   <div className={`grid gap-8 text-center ${coordName ? 'grid-cols-3' : 'grid-cols-2 gap-24'}`}>
                       <div className="signature-line border-t-2 border-slate-900 pt-4">
                           <p className="text-[9pt] font-black uppercase text-slate-900">{reportDriver?.name || 'OPERADOR RESPONSABLE'}</p>
                           <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Operador</p>
                           <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Aviso de Incidencia</p>
                       </div>
                       {coordName && (
                         <div className="signature-line border-t-2 border-slate-900 pt-4">
                             <p className="text-[9pt] font-black uppercase text-slate-900">{coordName}</p>
                             <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">{coordPos}</p>
                             <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Vo. Bo.</p>
                         </div>
                       )}
                       <div className="signature-line border-t-2 border-slate-900 pt-4">
                           <p className="text-[9pt] font-black uppercase text-slate-900">{managerName}</p>
                           <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">{managerPos}</p>
                           <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Validación</p>
                       </div>
                   </div>
                   <div className="text-center mt-8 border-t border-slate-200 pt-2">
                        <p className="text-[7pt] font-black text-slate-300 uppercase tracking-[0.3em]">Sistema de Gestión de Parque Vehicular • DIF Municipal La Paz</p>
                   </div>
               </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ label: string, value: string, trend?: string, icon?: string, color: string }> = ({ label, value, trend, icon, color }) => {
  const borderColors: any = { green: 'border-l-green-500', blue: 'border-l-blue-500', amber: 'border-l-amber-500', rose: 'border-l-rose-500', purple: 'border-l-purple-500' };
  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 border-l-4 ${borderColors[color]}`}>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">{label}</p>
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-3xl font-black tracking-tighter text-slate-900">{value}</span>
        {trend ? <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{trend}</span> : <span className="material-symbols-outlined text-slate-200 text-2xl">{icon}</span>}
      </div>
    </div>
  );
};

export default Incidents;
