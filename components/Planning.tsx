
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Planning, Vehicle, Driver, Area, AppSetting } from '../types';

interface PlanningProps {
  plannings: Planning[];
  vehicles: Vehicle[];
  drivers: Driver[];
  areas: Area[];
  settings?: AppSetting[];
  onAddPlanning: (p: Omit<Planning, 'id'>) => Promise<void>;
  onUpdatePlanning: (p: Planning) => Promise<void>;
  onAddArea: (a: Omit<Area, 'id'>) => Promise<void>;
  onDeleteArea: (id: string) => Promise<void>;
}

type ViewMode = 'week' | 'day' | 'month';

// Helper para formato de hora 12h (AM/PM)
const formatTime = (time: string | undefined) => {
  if (!time) return '';
  
  // Si viene en formato ISO (ej. 1899-12-30T14:05:00.000Z)
  if (time.includes('T')) {
    try {
      const date = new Date(time);
      // Usamos en-US para forzar formato 12h con AM/PM limpiamente, aunque el resto de la app sea es-ES
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
      return time;
    }
  }

  // Si viene en formato HH:MM
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

const PlanningComponent: React.FC<PlanningProps> = ({ plannings, vehicles, drivers, areas, settings = [], onAddPlanning, onUpdatePlanning, onAddArea, onDeleteArea }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [showModal, setShowModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingArea, setIsSavingArea] = useState(false);
  const [editingPlanning, setEditingPlanning] = useState<Planning | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    (settings || []).forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicleId: '',
    driverId: '',
    areaId: '',
    notes: '',
    departureTime: '',
    arrivalTime: '',
    destination: '',
    status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled'
  });

  const [areaFormData, setAreaFormData] = useState({ name: '', description: '' });

  // --- Lógica de Fechas ---

  const navigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction * 7));
    } else if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay(); // 0 is Sunday
    // Ajustar para que la semana empiece el día actual o mantener lógica de Domingo a Sábado
    // Mantenemos lógica de centrar o iniciar en la fecha seleccionada
    const diff = start.getDate() - day; 
    start.setDate(diff); // Set to Sunday of this week
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate, viewMode]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 Sunday

    const days = [];
    // Padding inicial
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    // Días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentDate]);

  const getDayPlannings = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return plannings.filter(p => p.date.split('T')[0] === dateStr).sort((a, b) => (a.departureTime || '').localeCompare(b.departureTime || ''));
  };

  const getDateLabel = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }
    // Week
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} de ${start.toLocaleDateString('es-ES', { month: 'long' })}`;
    }
    return `${start.getDate()} ${start.toLocaleDateString('es-ES', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'short' })}`;
  };

  // --- Handlers ---

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
      notes: p.notes || '',
      departureTime: p.departureTime || '',
      arrivalTime: p.arrivalTime || '',
      destination: p.destination || '',
      status: p.status || 'scheduled'
    });
    setShowModal(true);
  };

  const handleDayClickInCalendar = (date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
  };

  const resetForm = () => {
    setEditingPlanning(null);
    setFormData({ 
      date: new Date().toISOString().split('T')[0], 
      vehicleId: '', 
      driverId: '', 
      areaId: '', 
      notes: '',
      departureTime: '',
      arrivalTime: '',
      destination: '',
      status: 'scheduled'
    });
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

  const handleDeleteArea = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta área?')) return;
    try {
      await onDeleteArea(id);
    } catch (err) {
      alert("Error al eliminar área");
    }
  };

  // --- Variables para Impresión ---
  // Normalizar la ruta del logo (convertir rutas relativas a absolutas)
  const rawLogo = settingsMap['APP_LOGO'] || '/images/logo-dif.png';
  const appLogo = rawLogo.startsWith('./') ? rawLogo.replace('./', '/') : rawLogo;
  const directorName = settingsMap['INSTITUTION_HEAD_NAME'] || 'Director General';
  const vehicleManager = settingsMap['VEHICLE_MANAGER_NAME'] || 'Encargado del Parque Vehicular';
  const adminCoordinator = settingsMap['ADMIN_COORDINATOR_NAME'] || 'Coordinador Administrativo';

  // --- Render Helpers ---

  const renderPlanningCard = (p: Planning, minimal = false) => {
    const area = areas.find(a => a.id === p.areaId);
    const driver = drivers.find(d => d.id === p.driverId);
    const vehicle = vehicles.find(v => v.id === p.vehicleId);
    const status = p.status || 'scheduled';

    const statusStyles = {
      scheduled: 'border-slate-100 bg-slate-50 hover:bg-white',
      completed: 'border-green-100 bg-green-50/50 hover:bg-green-50',
      cancelled: 'border-rose-100 bg-rose-50/50 hover:bg-rose-50 opacity-75'
    };

    const statusIcon = {
      scheduled: null,
      completed: <span className="material-symbols-outlined text-sm text-green-600 font-bold" title="Completado">check_circle</span>,
      cancelled: <span className="material-symbols-outlined text-sm text-rose-600 font-bold" title="Cancelado">cancel</span>
    };

    return (
      <div key={p.id} className={`p-3 rounded-xl border group hover:shadow-md transition-all ${statusStyles[status]} hover:border-[#135bec]/30`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-100 text-[#135bec] text-[9px] font-black uppercase tracking-widest rounded">{area?.name || p.areaId}</span>
            {statusIcon[status]}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
            className="opacity-0 group-hover:opacity-100 size-6 rounded-lg hover:bg-slate-200/50 text-slate-400 hover:text-primary flex items-center justify-center transition-all"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
        </div>
        
        {(p.departureTime || p.arrivalTime) && (
          <div className={`mb-2 flex items-center gap-1.5 ${status === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-500'}`}>
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            <span className="text-[10px] font-bold">
              {formatTime(p.departureTime) || '--:--'} - {formatTime(p.arrivalTime) || '--:--'}
            </span>
          </div>
        )}

        <p className={`text-[11px] font-black leading-tight mb-1 ${status === 'cancelled' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{driver?.name || p.driverId}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5"><span className="material-symbols-outlined text-xs">local_shipping</span>{vehicle?.model || p.vehicleId}</p>
        
        {!minimal && p.destination && (
          <div className="mt-2 pt-2 border-t border-slate-200/50">
              <p className={`text-[9px] font-bold uppercase line-clamp-2 ${status === 'cancelled' ? 'text-rose-400' : 'text-slate-500'}`}>
                {status === 'cancelled' ? '(CANCELADO) ' : ''}{p.destination}
              </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <style>{`
        /* ========================================
           PRINT STYLES - WEEKLY PLANNING REPORT
           FORMAL DOCUMENT DESIGN
           ======================================== */
        @media print {
          /* Page Setup - Letter Landscape */
          @page {
            size: letter landscape;
            margin: 1.0cm;
          }
          
          /* CRITICAL: RESTORE PAGINATION FLOW */
          html, body {
            overflow: visible !important;
            height: auto !important;
            width: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Robust Hiding Strategy */
          body > *:not(#print-portal) { display: none !important; }
          
          /* Show and flatten the print path */
          #print-portal {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 9999 !important;
          }

          /* The modal container needs to be static */
          #planning-print-modal {
            display: block !important;
            position: static !important;
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            background: white !important;
            inset: auto !important;
          }

          /* Hide non-printable sticky header inside modal */
          #planning-print-modal > .sticky,
          .no-print {
            display: none !important;
          }

          /* The printable content itself */
          #planning-printable {
            display: block !important;
            position: static !important; /* NO ABSOLUTE */
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            overflow: visible !important;
            visibility: visible !important;
          }

          #planning-printable * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .no-print { display: none !important; }
          
          /* ========================================
             TYPOGRAPHY - FORMAL DOCUMENT STANDARDS
             ======================================== */
          #planning-printable h1,
          #planning-printable h2,
          #planning-printable h3,
          #planning-printable h4 {
            page-break-after: avoid;
            orphans: 3;
            widows: 3;
          }
          
          #planning-printable p {
            orphans: 3;
            widows: 3;
          }
          
          /* ========================================
             PAGE BREAK CONTROLS
             ======================================== */
          #planning-printable .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* ========================================
             OVERFLOW HANDLING - CONTENT VALIDATION
             ======================================== */
          #planning-printable .overflow-truncate,
          #planning-printable .print-truncate {
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          #planning-printable .overflow-wrap {
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            max-width: 200px;
          }
          
          /* Long text cells */
          #planning-printable .text-wrap {
            white-space: normal;
            word-wrap: break-word;
            max-width: 250px;
          }
          
          /* ========================================
             TABLE STYLING - FORMAL DOCUMENT
             ======================================== */
          #planning-printable table {
            width: 100% !important;
            font-size: 9pt !important;
            border-collapse: collapse;
            page-break-inside: auto;
          }
          
          #planning-printable thead {
            display: table-header-group;
          }
          
          #planning-printable tfoot {
            display: table-footer-group;
          }
          
          #planning-printable tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          #planning-printable th,
          #planning-printable td {
            padding: 8px 10px !important;
            border: 1px solid #cbd5e1 !important;
            vertical-align: middle;
          }
          
          #planning-printable th {
            background-color: #f1f5f9 !important;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 8pt;
            letter-spacing: 0.05em;
          }
          
          /* Day header rows */
          #planning-printable .day-header {
            background-color: #e2e8f0 !important;
            font-weight: 800;
          }
          
          /* ========================================
             FORMAL DOCUMENT ELEMENTS
             ======================================== */
          /* Header styling */
          #planning-printable .print-header {
            border-bottom: 3px solid #1e293b;
            padding-bottom: 1rem;
            margin-bottom: 1.5rem;
          }
          
          /* Section titles */
          #planning-printable .section-title {
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
          
           /* ========================================
              SIGNATURE SECTION - FLOWING WITH CONTENT
              ======================================== */
           #planning-printable .signature-section {
             page-break-inside: avoid;
             margin-top: 2rem;
           }
           
           #planning-printable .signature-line {
             border-top: 2px solid #1e293b;
             padding-top: 0.5rem;
             min-width: 150px;
           }
          
          /* ========================================
             FOOTER STYLING
             ======================================== */
          #planning-printable .print-footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 0.5rem;
            font-size: 7pt;
            color: #94a3b8;
            text-align: center;
          }
          
          /* ========================================
             ZEBRA STRIPING FOR READABILITY
             ======================================== */
          #planning-printable tbody tr:nth-child(even):not(.day-header) {
            background-color: #f8fafc !important;
          }
        }
      `}</style>
      
      {/* HEADER DE CONTROLES */}
      <div>
          <h2 className="page-title">Planeación Operativa</h2>
          <p className="page-subtitle">Asignación de recursos y logística</p>
        </div>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
           {/* Selector de Vista */}
           <div className="flex bg-slate-100 p-1 rounded-lg">
<button onClick={() => setViewMode('day')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'day' ? 'bg-white text-primary' : 'text-slate-500 hover:text-slate-700'}`}>Día</button>
                <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'week' ? 'bg-white text-primary' : 'text-slate-500 hover:text-slate-700'}`}>Semana</button>
                <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'month' ? 'bg-white text-primary' : 'text-slate-500 hover:text-slate-700'}`}>Mes</button>
           </div>

           {/* Navegación de Fecha */}
           <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 w-full sm:w-auto justify-between sm:justify-start">
             <button onClick={() => navigate(-1)} className="size-9 flex items-center justify-center hover:bg-slate-50 text-slate-400 rounded-lg transition-colors">
               <span className="material-symbols-outlined">chevron_left</span>
             </button>
             <div className="px-4 text-[11px] font-black uppercase tracking-widest text-slate-700 min-w-[180px] text-center">
               {getDateLabel()}
             </div>
             <button onClick={() => navigate(1)} className="size-9 flex items-center justify-center hover:bg-slate-50 text-slate-400 rounded-lg transition-colors">
               <span className="material-symbols-outlined">chevron_right</span>
             </button>
           </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAreaModal(true)}
            className="btn btn-secondary"
          >
            <span className="material-symbols-outlined text-lg">layers</span>
            Áreas
          </button>
          
          <button 
            onClick={() => setShowPrintPreview(true)}
            className="btn btn-secondary"
          >
            <span className="material-symbols-outlined text-lg">print</span>
            Imprimir Semana
          </button>
          
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="btn btn-primary"
          >
            <span className="material-symbols-outlined text-xl">event_available</span>
            <span className="hidden sm:inline">Asignar</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL SEGÚN VISTA */}
      
      {/* --- VISTA SEMANAL --- */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 no-print">
          {weekDays.map((day, idx) => {
            const dayPlannings = getDayPlannings(day);
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={idx} className={`flex flex-col min-h-[400px] bg-white rounded-2xl border transition-all ${isToday ? 'border-[#135bec] ring-1 ring-blue-500/10' : 'border-slate-200'}`}>
                <div className={`p-4 border-b text-center ${isToday ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{day.toLocaleDateString('es-ES', { weekday: 'long' })}</p>
                  <p className={`text-xl font-black mt-0.5 ${isToday ? 'text-blue-700' : 'text-slate-800'}`}>{day.getDate()}</p>
                </div>
                <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[500px] custom-scrollbar">
                  {dayPlannings.map(p => renderPlanningCard(p, true))}
                  {dayPlannings.length === 0 && (
                    <div className="h-full flex items-center justify-center opacity-20">
                      <span className="material-symbols-outlined text-3xl">event_busy</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- VISTA DÍA (AGENDA) --- */}
      {viewMode === 'day' && (
        <div className="card overflow-hidden min-h-[500px] no-print">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-end">
             <div>
                <h3 className="text-3xl font-black text-slate-900 capitalize tracking-tighter">{currentDate.toLocaleDateString('es-ES', { weekday: 'long' })}</h3>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
             </div>
             <div className="text-right">
                <span className="text-4xl font-black text-primary">{getDayPlannings(currentDate).length}</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividades</p>
             </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {getDayPlannings(currentDate).map(p => renderPlanningCard(p))}
            </div>
            {getDayPlannings(currentDate).length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                   <span className="material-symbols-outlined text-4xl">event_note</span>
                </div>
                <p className="text-sm font-black uppercase tracking-widest">No hay actividades programadas para este día</p>
                <button onClick={() => { setFormData({...formData, date: currentDate.toISOString().split('T')[0]}); setShowModal(true); }} className="mt-4 text-primary text-xs font-bold hover:underline">Programar Actividad</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- VISTA MES (CALENDARIO) --- */}
      {viewMode === 'month' && (
        <div className="card overflow-hidden no-print">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 grid-rows-5 lg:grid-rows-auto min-h-[600px]">
             {calendarDays.map((date, idx) => {
               if (!date) return <div key={idx} className="bg-slate-50/30 border-r border-b border-slate-100"></div>;
               
               const dayPlannings = getDayPlannings(date);
               const isToday = date.toDateString() === new Date().toDateString();
               const isSelected = date.toDateString() === currentDate.toDateString();

               return (
                 <div 
                    key={idx} 
                    onClick={() => handleDayClickInCalendar(date)}
                    className={`min-h-[100px] p-2 border-r border-b border-slate-100 relative group cursor-pointer transition-all hover:bg-blue-50/30 ${isSelected ? 'bg-blue-50/50' : ''}`}
                 >
                    <div className={`size-7 flex items-center justify-center rounded-lg text-xs font-black mb-2 ${isToday ? 'bg-[#135bec] text-white' : 'text-slate-700'}`}>
                      {date.getDate()}
                    </div>
                    
                    <div className="space-y-1">
                      {dayPlannings.slice(0, 3).map((p, i) => {
                         const area = areas.find(a => a.id === p.areaId);
                         return (
                           <div key={i} className={`text-[9px] px-1.5 py-1 rounded font-bold truncate border transition-colors ${p.status === 'cancelled' ? 'bg-rose-50 text-rose-400 border-rose-100 line-through' : p.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-600 border-slate-200 group-hover:border-blue-200 group-hover:text-blue-700'}`}>
                              {p.departureTime && <span className="mr-1 opacity-70">{formatTime(p.departureTime)}</span>}
                              {area?.name || '---'}
                           </div>
                         )
                      })}
                      {dayPlannings.length > 3 && (
                        <div className="text-[9px] font-black text-slate-400 text-center uppercase tracking-wide">
                          + {dayPlannings.length - 3} más
                        </div>
                      )}
                    </div>
                 </div>
               );
             })}
          </div>
        </div>
      )}

      {/* --- MODALES --- */}

      {/* MODAL IMPRESIÓN SEMANAL */}
      {showPrintPreview && document.getElementById('print-portal') && createPortal(
        <div id="planning-print-modal" className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
           <div className="sticky top-0 bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg no-print">
             <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/20 transition-all">Cerrar</button>
             <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
               <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Planeación Semanal
             </button>
           </div>
           <div className="flex-1 bg-slate-100 p-10 flex justify-center print:bg-white print:p-0 print:block">
              <div id="planning-printable" className="bg-white w-[27.94cm] min-h-[21.59cm] p-[1.5cm] shadow-2xl relative text-slate-900 print:shadow-none print:w-full print:p-0 print:m-0 break-after-auto">
                
                {/* Header Institucional - Formal Design */}
                <div className="print-header flex justify-between items-center mb-8 border-b-4 border-slate-900 pb-6">
                  <div className="flex items-center gap-6">
                     <img src="/images/logo-dif.png" alt="Logo" className="w-24 object-contain" />
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-slate-900 uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                      <span className="text-lg font-black text-slate-900 uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                      <span className="text-[8pt] font-bold uppercase text-slate-400 mt-2 tracking-[0.2em]">Parque Vehicular</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                        Programación Semanal
                    </div>
                    <p className="text-[9pt] text-slate-400 font-bold mt-1 uppercase">
                      Semana: {weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - {weekDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-[8pt] text-slate-300 font-bold mt-1">
                      Generado: {new Date().toLocaleDateString('es-ES', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}
                    </p>
                  </div>
                </div>

                {/* Tabla de Planeación - Formal Table */}
                <div className="mb-8">
                  <table className="w-full border-collapse border border-slate-300">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border border-slate-300 px-3 py-3 text-[8pt] font-black uppercase text-slate-600 w-24">Fecha</th>
                        <th className="border border-slate-300 px-3 py-3 text-[8pt] font-black uppercase text-slate-600 w-20">Horario</th>
                        <th className="border border-slate-300 px-3 py-3 text-[8pt] font-black uppercase text-slate-600">Unidad / Chofer</th>
                        <th className="border border-slate-300 px-3 py-3 text-[8pt] font-black uppercase text-slate-600">Destino / Actividad</th>
                        <th className="border border-slate-300 px-3 py-3 text-[8pt] font-black uppercase text-slate-600 w-28">Estado</th>
                        <th className="border border-slate-300 px-3 py-3 text-[8pt] font-black uppercase text-slate-600 w-32">Área Solicitante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekDays.map(day => {
                        const dayPlans = getDayPlannings(day);
                        if (dayPlans.length === 0) return null;

                        return (
                          <React.Fragment key={day.toISOString()}>
                            {/* Header del día para separar visualmente */}
                            <tr className="day-header bg-slate-200/50 border-b border-slate-300">
                              <td colSpan={6} className="px-3 py-2 text-[8pt] font-black uppercase text-slate-900">
                                {day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </td>
                            </tr>
                            {dayPlans.map((plan, planIdx) => {
                              const vehicle = vehicles.find(v => v.id === plan.vehicleId);
                              const driver = drivers.find(d => d.id === plan.driverId);
                              const area = areas.find(a => a.id === plan.areaId);
                              const statusLabel = plan.status === 'completed' ? 'COMPLETADO' : plan.status === 'cancelled' ? 'CANCELADO' : 'PROGRAMADO';
                              const statusClass = plan.status === 'completed' ? 'text-green-700 bg-green-50' : plan.status === 'cancelled' ? 'text-rose-700 bg-rose-50 line-through' : 'text-slate-700 bg-slate-50';
                              
                              return (
                                <tr key={plan.id} className={`border-b border-slate-300 ${planIdx % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                                  <td className="px-3 py-2 text-[8pt] font-bold text-center text-slate-500">
                                    {day.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                                  </td>
                                  <td className="px-3 py-2 text-[8pt] font-bold text-center">
                                    {formatTime(plan.departureTime)}
                                  </td>
                                  <td className="px-3 py-2 text-[8pt]">
                                    <div className="font-black text-slate-900 print-truncate" style={{maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{vehicle?.model || '---'}</div>
                                    <div className="text-[7pt] uppercase text-slate-500">{driver?.name || '---'}</div>
                                  </td>
                                  <td className="px-3 py-2 text-[8pt]">
                                    <div className="font-bold text-slate-800 uppercase overflow-wrap" style={{maxWidth: '300px', wordWrap: 'break-word'}}>{plan.destination}</div>
                                    {plan.notes && <div className="text-[7pt] italic text-slate-500">{plan.notes}</div>}
                                  </td>
                                  <td className={`px-3 py-2 text-[7pt] font-black text-center uppercase ${statusClass}`}>
                                    {statusLabel}
                                  </td>
                                  <td className="px-3 py-2 text-[8pt] font-bold text-center uppercase">
                                    {area?.name || '---'}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                      {weekDays.every(day => getDayPlannings(day).length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-[9pt] font-bold text-slate-400 uppercase italic">
                            Sin actividades programadas para esta semana.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                  {/* Signature Section - Three Signatures */}
                  {/* <div className="signature-section absolute bottom-[1.5cm] left-[1.5cm] right-[1.5cm]"> */}
                      {/* <div className="grid grid-cols-3 gap-8 text-center">
                        <div className="signature-line border-t-2 border-slate-900 pt-4">
                            <p className="text-[9pt] font-black uppercase text-slate-900">{vehicleManager}</p>
                            <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Encargado del Parque Vehicular</p>
                            <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Realizó</p>
                        </div>
                        <div className="signature-line border-t-2 border-slate-900 pt-4">
                            <p className="text-[9pt] font-black uppercase text-slate-900">{adminCoordinator}</p>
                            <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Coordinador Administrativo</p>
                            <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Vo. Bo.</p>
                        </div>
                        <div className="signature-line border-t-2 border-slate-900 pt-4">
                            <p className="text-[9pt] font-black uppercase text-slate-900">{directorName}</p>
                            <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Director General</p>
                            <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Autorizó</p>
                        </div>
                      </div> */}
                      {/* <div className="print-footer text-center mt-8 border-t border-slate-200 pt-3">
                          <div className="flex justify-between items-center text-[7pt] text-slate-400">
                              <span>Sistema de Gestion de Parque Vehicular</span>
                              <span className="font-black uppercase tracking-[0.2em]">DIF Municipal La Paz B.C.S.</span>
                          </div>
                      </div> */}
                  {/* </div> */}
              </div>
           </div>
        </div>
      , document.getElementById('print-portal')!)}

      {showAreaModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Catálogo de Áreas</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Zonas y sectores de operación</p>
              </div>
              <button onClick={() => !isSavingArea && setShowAreaModal(false)} disabled={isSavingArea} className="size-10 rounded-full hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-slate-400" aria-label="Cerrar">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
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
                    <button 
                      onClick={() => handleDeleteArea(a.id)}
                      className="size-8 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                      title="Eliminar área"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
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
              <button onClick={() => !isSaving && setShowModal(false)} disabled={isSaving} className="size-10 rounded-full hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-slate-400" aria-label="Cerrar">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hora Salida</label>
                  <input type="time" disabled={isSaving} className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none disabled:opacity-50" value={formData.departureTime} onChange={e => setFormData({...formData, departureTime: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hora Llegada (Estimada)</label>
                  <input type="time" disabled={isSaving} className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none disabled:opacity-50" value={formData.arrivalTime} onChange={e => setFormData({...formData, arrivalTime: e.target.value})} />
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
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Destino / Lugar</label>
                 <input disabled={isSaving} className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none disabled:opacity-50 uppercase" placeholder="Ej. CENTRO DE SALUD..." value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Notas (Opcional)</label>
                <input disabled={isSaving} className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none disabled:opacity-50" placeholder="Observaciones..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estado del Viaje</label>
                <select 
                    disabled={isSaving}
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none disabled:opacity-50"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                    <option value="scheduled">PROGRAMADO</option>
                    <option value="completed">COMPLETADO</option>
                    <option value="cancelled">CANCELADO</option>
                </select>
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