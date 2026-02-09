
import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Vehicle, FuelEntry, MaintenanceRecord, Incident, AppSetting } from '../types';
import { usePDF } from 'react-to-pdf';

interface ReportsProps {
  vehicles: Vehicle[];
  fuelEntries: FuelEntry[];
  maintenanceRecords: MaintenanceRecord[];
  incidents: Incident[];
  settings?: AppSetting[];
}

type ReportType = 'financial' | 'operations' | 'incidents';

const Reports: React.FC<ReportsProps> = ({ vehicles, fuelEntries, maintenanceRecords, incidents, settings = [] }) => {
  // Filtros
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // Primer día del mes
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');
  const [activeReport, setActiveReport] = useState<ReportType>('financial');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

  // --- OPCIONES DE PDF ---
  const { targetRef, toPDF } = usePDF({
    filename: `Reporte_Flota_${new Date().toISOString().split('T')[0]}.pdf`,
    page: {
      format: 'letter',
      orientation: 'portrait',
      margin: 1.5 // 1.5 cm de margen
    }
  });

  // --- FILTRADO DE DATOS ---
    
  const filteredData = useMemo(() => {
    const start = new Date(dateRange.start).getTime();
    const end = new Date(dateRange.end).getTime() + (24 * 60 * 60 * 1000); // Incluir el día final completo

    const filterDate = (dateStr: string) => {
      const d = new Date(dateStr).getTime();
      return d >= start && d < end;
    };

    const filterVehicle = (vId: string) => selectedVehicleId === 'all' || vId === selectedVehicleId;

    return {
      fuel: fuelEntries.filter(f => filterDate(f.date) && filterVehicle(f.vehicleId)),
      maintenance: maintenanceRecords.filter(m => filterDate(m.date) && filterVehicle(m.vehicleId)),
      incidents: incidents.filter(i => filterDate(i.date) && filterVehicle(i.vehicleId))
    };
  }, [dateRange, selectedVehicleId, fuelEntries, maintenanceRecords, incidents]);

  // --- PAGE SPLITTING LOGIC ---
  const calculatePageCount = () => {
    const baseHeight = 600;
    const tableRowHeight = 30;
    let tableRows = 0;
    
    if (activeReport === 'financial') {
      tableRows = filteredData.fuel.length + filteredData.maintenance.length;
    } else if (activeReport === 'incidents') {
      tableRows = filteredData.incidents.length;
    }
    
    const totalContentHeight = baseHeight + (tableRows * tableRowHeight);
    const pageHeight = 1000;
    const estimatedPages = Math.ceil(totalContentHeight / pageHeight);
    
    return estimatedPages > 0 ? estimatedPages : 1;
  };

  const pageCount = calculatePageCount();

  // --- CÁLCULOS KPI ---

  const kpis = useMemo(() => {
    const totalFuelCost = filteredData.fuel.reduce((acc, f) => acc + (Number(f.cost) || 0), 0);
    const totalMaintenanceCost = filteredData.maintenance.reduce((acc, m) => acc + (Number(m.invoiceAmount || m.quoteCost) || 0), 0);
    const totalCost = totalFuelCost + totalMaintenanceCost;
    
    const totalLiters = filteredData.fuel.reduce((acc, f) => acc + (Number(f.liters) || 0), 0);
    const incidentCount = filteredData.incidents.length;
    
    // KPIs específicos por tipo de reporte
    const efficiencyLitersPerFill = filteredData.fuel.length > 0 
      ? (totalLiters / filteredData.fuel.length).toFixed(1) 
      : '0';
    
    return { 
      totalFuelCost, 
      totalMaintenanceCost, 
      totalCost, 
      totalLiters, 
      incidentCount,
      efficiencyLitersPerFill
    };
  }, [filteredData]);

  // KPIs contextuales según el tipo de reporte
  const getContextualKpis = () => {
    switch (activeReport) {
      case 'financial':
        return (
          <>
            <KPICard title="Gasto Total" value={`${kpis.totalCost.toLocaleString()}`} subtext="Combustible + Mantenimiento" color="blue" />
            <KPICard title="Combustible" value={`${kpis.totalFuelCost.toLocaleString()}`} subtext={`${kpis.totalLiters.toLocaleString()} Litros consumidos`} color="green" />
            <KPICard title="Mantenimiento" value={`${kpis.totalMaintenanceCost.toLocaleString()}`} subtext="Servicios Facturados/Cotizados" color="rose" />
            <KPICard title="Incidencias" value={kpis.incidentCount} subtext="Reportes en periodo" color="blue" />
          </>
        );
      case 'operations':
        return (
          <>
            <KPICard title="Litros Totales" value={`${kpis.totalLiters.toLocaleString()} L`} subtext="Consumo total" color="green" />
            <KPICard title="Promedio por Carga" value={`${kpis.efficiencyLitersPerFill} L`} subtext="Por carga de combustible" color="blue" />
            <KPICard title="Gasto Combustible" value={`${kpis.totalFuelCost.toLocaleString()}`} subtext="Período seleccionado" color="rose" />
            <KPICard title="Incidencias" value={kpis.incidentCount} subtext="Reportes registrados" color="blue" />
          </>
        );
      case 'incidents':
        return (
          <>
            <KPICard title="Total Incidencias" value={kpis.incidentCount} subtext="En el período" color="blue" />
            <KPICard title="Mecánicas" value={incidentTypeData.find(i => i.name === 'Mecánica')?.value || 0} subtext="Fallas técnicas" color="green" />
            <KPICard title="Tráfico" value={incidentTypeData.find(i => i.name === 'Tráfico')?.value || 0} subtext="Infracciones" color="amber" />
            <KPICard title="Gasto Total" value={`${kpis.totalCost.toLocaleString()}`} subtext="Comb. + Mantenimiento" color="rose" />
          </>
        );
    }
  };

  // --- PREPARACIÓN DE GRÁFICAS ---

  // 1. Costos por Vehículo (Bar Chart)
  const costByVehicleData = useMemo(() => {
    const data: Record<string, { name: string, fuel: number, maintenance: number }> = {};
    
    // Inicializar con vehículos filtrados
    const targetVehicles = selectedVehicleId === 'all' ? vehicles : vehicles.filter(v => v.id === selectedVehicleId);
    
    targetVehicles.forEach(v => {
      data[v.id] = { name: v.plate, fuel: 0, maintenance: 0 };
    });

    filteredData.fuel.forEach(f => {
      if (data[f.vehicleId]) data[f.vehicleId].fuel += (Number(f.cost) || 0);
    });

    filteredData.maintenance.forEach(m => {
      if (data[m.vehicleId]) data[m.vehicleId].maintenance += (Number(m.invoiceAmount || m.quoteCost) || 0);
    });

    return Object.values(data).sort((a, b) => (b.fuel + b.maintenance) - (a.fuel + a.maintenance)).slice(0, 10);
  }, [filteredData, vehicles, selectedVehicleId]);

  // 2. Rendimiento Combustible (Line Chart simple)
  const efficiencyData = useMemo(() => {
    const data: any[] = [];
    const groupedByDate: Record<string, { liters: number, cost: number }> = {};

    filteredData.fuel.forEach(f => {
      const dateKey = new Date(f.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      if (!groupedByDate[dateKey]) groupedByDate[dateKey] = { liters: 0, cost: 0 };
      groupedByDate[dateKey].liters += Number(f.liters);
      groupedByDate[dateKey].cost += Number(f.cost);
    });

    return Object.entries(groupedByDate).map(([date, val]) => ({
      date,
      costPerLiter: val.liters > 0 ? (val.cost / val.liters).toFixed(2) : 0,
      totalCost: val.cost
    })).sort((a, b) => {
        return a.date.localeCompare(b.date);
    });
  }, [filteredData]);

  // 3. Distribución de Incidencias (Pie Chart)
  const incidentTypeData = useMemo(() => {
    const counts: Record<string, number> = { mechanical: 0, traffic: 0, accident: 0, theft: 0 };
    filteredData.incidents.forEach(i => {
      if (counts[i.type] !== undefined) counts[i.type]++;
    });
    const mapLabels: any = { mechanical: 'Mecánica', traffic: 'Tráfico', accident: 'Accidente', theft: 'Robo' };
    const colors: any = { mechanical: '#3b82f6', traffic: '#f59e0b', accident: '#ef4444', theft: '#8b5cf6' };

    return Object.entries(counts)
      .filter(([_, val]) => val > 0)
      .map(([key, val]) => ({ name: mapLabels[key], value: val, color: colors[key] }));
  }, [filteredData]);


  // --- COMPONENTES UI ---

   const KPICard = ({ title, value, subtext, color }: any) => (
    <div className={`bg-white p-4 border-l-4 ${color === 'blue' ? 'border-l-blue-500' : color === 'green' ? 'border-l-emerald-500' : 'border-l-rose-500'} border-y border-r border-slate-200 shadow-sm`}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{value}</p>
      {subtext && <p className="text-xs font-bold text-slate-500 mt-1">{subtext}</p>}
    </div>
   );

  // Normalizar la ruta del logo (convertir rutas relativas a absolutas)
  const rawLogo = settingsMap['APP_LOGO'] || '/images/logo-dif.png';
  const appLogo = rawLogo.startsWith('./') ? rawLogo.replace('./', '/') : rawLogo;
  const containerClass = "space-y-8 animate-in fade-in duration-500 pb-20";
  const contentClass = "w-full";

  return (
    <div className={containerClass}>
       <style>{`
          /* ========================================
             PRINT STYLES - FORMAL DOCUMENT DESIGN
             ======================================== */
          @media print {
            /* Page Setup - Letter Portrait */
            @page {
              size: letter portrait;
              margin: 1.5cm 1.5cm 2cm 1.5cm;
            }
            
            /* Hide everything except printable area */
            body * {
              visibility: hidden;
            }
            
            #report-printable, #report-printable * {
              visibility: visible;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            #report-printable {
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
            #report-printable h1,
            #report-printable h2,
            #report-printable h3,
            #report-printable h4 {
              page-break-after: avoid;
              orphans: 3;
              widows: 3;
            }
            
            #report-printable p {
              orphans: 3;
              widows: 3;
            }
            
            /* ========================================
               CHARTS - RESPONSIVE PRINT SIZING
               ======================================== */
            #report-printable .recharts-wrapper {
              overflow: visible !important;
              max-width: 100% !important;
            }
            
            #report-printable .recharts-wrapper svg {
              max-width: 100% !important;
              height: auto !important;
            }
            
            /* ========================================
               TABLES - FORMAL DOCUMENT STYLING
               ======================================== */
            #report-printable table {
              width: 100% !important;
              font-size: 9pt !important;
              border-collapse: collapse;
              page-break-inside: auto;
            }
            
            #report-printable thead {
              display: table-header-group;
            }
            
            #report-printable tfoot {
              display: table-footer-group;
            }
            
            #report-printable tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            #report-printable th,
            #report-printable td {
              padding: 6px 8px !important;
              border: 1px solid #e2e8f0 !important;
              vertical-align: middle;
            }
            
            #report-printable th {
              background-color: #f8fafc !important;
              font-weight: 800;
              text-transform: uppercase;
              font-size: 8pt;
              letter-spacing: 0.05em;
            }
            
            /* ========================================
               OVERFLOW HANDLING - CONTENT VALIDATION
               ======================================== */
            #report-printable .overflow-truncate,
            #report-printable .print-truncate {
              max-width: 180px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            
            #report-printable .overflow-wrap {
              word-wrap: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
              max-width: 200px;
            }
            
            /* Long text cells */
            #report-printable td.text-wrap {
              white-space: normal;
              word-wrap: break-word;
              max-width: 250px;
            }
            
            /* ========================================
               PAGE BREAK CONTROLS
               ======================================== */
            #report-printable .break-inside-avoid,
            #report-printable .print-section {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            #report-printable .break-before {
              page-break-before: always;
              break-before: page;
            }
            
            #report-printable .break-after {
              page-break-after: always;
              break-after: page;
            }
            
            /* Keep KPIs together */
            #report-printable .kpi-grid {
              page-break-inside: avoid;
              break-inside: avoid;
              display: grid !important;
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 0.5rem !important;
              margin-bottom: 1rem !important;
            }
            
            #report-printable .kpi-grid > div {
              padding: 0.5rem !important;
            }
            
            #report-printable .kpi-grid .text-\[8px\] {
              font-size: 7px !important;
            }
            
            #report-printable .kpi-grid .text-xl {
              font-size: 1.25rem !important;
              line-height: 1.25rem !important;
              margin-top: 0.25rem !important;
            }
            
            #report-printable .kpi-grid .text-\[7px\] {
              font-size: 6px !important;
            }
            
            /* Charts grid - force 2 columns in print */
            #report-printable .charts-grid,
            .print-preview-container .charts-grid {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 0.75rem !important;
            }
            
            #report-printable .charts-grid > div,
            .print-preview-container .charts-grid > div {
              page-break-inside: avoid;
              break-inside: avoid;
              padding: 0.5rem !important;
            }
            
            #report-printable .charts-grid .h-\[220px\],
            .print-preview-container .charts-grid .h-\[220px\] {
              height: 160px !important;
            }
            
            /* ========================================
               FORMAL DOCUMENT ELEMENTS
               ======================================== */
            /* Header styling */
            #report-printable .print-header {
              border-bottom: 3px solid #1e293b;
              padding-bottom: 0.75rem;
              margin-bottom: 1rem;
              page-break-inside: avoid;
            }
            
            /* Footer styling */
            #report-printable .print-footer {
              border-top: 1px solid #e2e8f0;
              padding-top: 0.5rem;
              margin-top: 1.5rem;
              font-size: 8pt;
              color: #94a3b8;
              page-break-inside: avoid;
            }
            
            /* Signature lines */
            #report-printable .signature-line {
              border-top: 2px solid #1e293b;
              padding-top: 0.5rem;
              min-width: 200px;
            }
            
            /* Section titles */
            #report-printable .section-title {
              background-color: #1e293b !important;
              color: white !important;
              padding: 6px 12px;
              font-size: 9pt;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin-bottom: 0.75rem;
              display: inline-block;
            }
            
            /* ========================================
               KPI CARDS - PRINT OPTIMIZATION
               ======================================== */
            #report-printable .kpi-card {
              border: 1px solid #e2e8f0 !important;
              border-left-width: 4px !important;
              padding: 10px 14px !important;
              background: white !important;
              border-radius: 0 !important;
            }
            
            /* ========================================
               CHART CONTAINERS - FIXED DIMENSIONS
               ======================================== */
            #report-printable .chart-container {
              max-height: 280px !important;
              overflow: hidden;
            }
            
            /* ========================================
               DATA TABLES - MULTI-PAGE SUPPORT
               ======================================== */
            #report-printable .data-table {
              page-break-inside: auto;
              border-radius: 0 !important;
            }
            
            #report-printable .data-table tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            #report-printable .data-table thead {
              display: table-header-group;
            }
            
            #report-printable .data-table tfoot {
              display: table-footer-group;
            }
            
            /* Zebra striping for readability */
            #report-printable .data-table tbody tr:nth-child(even) {
              background-color: #f8fafc !important;
            }
            
            /* ========================================
               PAGE NUMBERING
               ======================================== */
            @page {
              @bottom-right {
                content: "Página " counter(page) " de " counter(pages);
                font-size: 8pt;
                color: #94a3b8;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              }
            }
            
          }
          
          /* ========================================
             PREVIEW MODE - FIXED PAGE DIMENSIONS
             (Outside @media print to apply on screen)
             ======================================== */
          .print-preview-container {
            width: 21.59cm; /* Letter width */
            min-height: 27.94cm; /* Letter height */
            background: white;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin: 0 auto;
            position: relative;
            padding: 1.5cm;
            box-sizing: border-box;
          }
          
          .print-preview-page {
            width: 100%;
            min-height: calc(27.94cm - 3.5cm); /* Subtract margins */
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Charts grid - force 2 columns in preview */
          .print-preview-container .charts-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.5rem !important;
          }
          
          .print-preview-container .charts-grid > div {
            padding: 0.5rem !important;
          }
          
          .print-preview-container .charts-grid .h-\[220px\] {
            height: 150px !important;
          }
          
          /* KPI grid - force 4 columns in preview */
          .print-preview-container .kpi-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 0.5rem !important;
          }
        `}</style>

       {/* HEADER & CONTROLS */}
        <div className="">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight break-words">Reportes Dinámicos</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1 break-words">Análisis de vehiculos.</p>
        </div>
       <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 no-print">
         <div className="flex flex-col sm:flex-row gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center gap-2 px-2">
             <span className="text-[10px] font-black text-slate-400 uppercase">Desde</span>
             <input 
               type="date" 
               className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-primary"
               value={dateRange.start}
               onChange={e => setDateRange({...dateRange, start: e.target.value})}
             />
           </div>
           <div className="flex items-center gap-2 px-2">
             <span className="text-[10px] font-black text-slate-400 uppercase">Hasta</span>
             <input 
               type="date" 
               className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-primary"
               value={dateRange.end}
               onChange={e => setDateRange({...dateRange, end: e.target.value})}
             />
           </div>
           <div className="w-[1px] bg-slate-200 hidden sm:block"></div>
           <select 
             className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-primary uppercase min-w-[150px]"
             value={selectedVehicleId}
             onChange={e => setSelectedVehicleId(e.target.value)}
           >
             <option value="all">Toda la Flota</option>
             {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
           </select>
         </div>

         <div className="flex gap-2">
           <button onClick={() => setShowPrintPreview(true)} className="bg-blue-600 text-white px-3 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
             <span className="material-symbols-outlined text-lg">print</span>
             Generar reporte
           </button>
         </div>
       </div>

       {/* REPORT CONTENT */}
       <div ref={targetRef} id="report-printable" className={contentClass}>
         {/* PRINT ONLY HEADER */}
         <div className="hidden print:flex print-header justify-between items-center mb-8 border-b-4 border-slate-900 pb-6">
             <div className="flex items-center gap-6">
               <img src="/images/logo-dif.png" alt="Logo" className="w-24 object-contain" />
               <div className="flex flex-col">
                 <span className="text-xl font-black text-slate-900 uppercase leading-none tracking-tight">Reporte de Analisis de Vehiculos</span>
                 <span className="text-lg font-black text-slate-900 uppercase leading-tight tracking-tight">Sistema DIF Municipal La Paz B.C.S.</span>
                 <span className="text-[8pt] font-bold uppercase text-slate-400 mt-2 tracking-[0.2em]">Gestión de Parque Vehicular</span>
               </div>
             </div>
             <div className="text-right">
                 <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                     Reporte Ejecutivo
                 </div>
                 <p className="text-[9pt] font-black text-slate-400 uppercase tracking-widest">Periodo del Reporte</p>
                 <p className="text-lg font-black text-slate-900">
                     {new Date(dateRange.start).toLocaleDateString('es-ES', {day: '2-digit', month: 'short', year: 'numeric'})} — {new Date(dateRange.end).toLocaleDateString('es-ES', {day: '2-digit', month: 'short', year: 'numeric'})}
                 </p>
                 <p className="text-[8pt] text-slate-400 font-bold mt-1">
                     Generado: {new Date().toLocaleDateString('es-ES', {day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'})}
                 </p>
             </div>
         </div>

         {/* TABS */}
         <div className="flex gap-2 mb-6 no-print overflow-x-auto">
             <button onClick={() => setActiveReport('financial')} className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeReport === 'financial' ? 'bg-[#135bec] text-white shadow-lg shadow-blue-500/30' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Financiero</button>
             <button onClick={() => setActiveReport('operations')} className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeReport === 'operations' ? 'bg-[#135bec] text-white shadow-lg shadow-blue-500/30' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Operativo</button>
             <button onClick={() => setActiveReport('incidents')} className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeReport === 'incidents' ? 'bg-[#135bec] text-white shadow-lg shadow-blue-500/30' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Incidencias</button>
         </div>

          {/* KPI SUMMARY */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 kpi-grid">
             <KPICard title="Gasto Total" value={`$${kpis.totalCost.toLocaleString()}`} subtext="Combustible + Mantenimiento" color="blue" />
             <KPICard title="Combustible" value={`$${kpis.totalFuelCost.toLocaleString()}`} subtext={`${kpis.totalLiters.toLocaleString()} Litros consumidos`} color="green" />
             <KPICard title="Mantenimiento" value={`$${kpis.totalMaintenanceCost.toLocaleString()}`} subtext="Servicios Facturados/Cotizados" color="rose" />
             <KPICard title="Incidencias" value={kpis.incidentCount} subtext="Reportes en periodo" color="blue" />
         </div>

           {/* GRAPHS SECTION */}
           <div className="grid grid-cols-2 gap-6 mb-6 break-inside-avoid charts-grid">
              
             {/* GRAPH 1: COSTOS POR VEHICULO */}
             {activeReport === 'financial' || activeReport === 'operations' ? (
                 <div className="bg-white p-5 border border-slate-200 shadow-sm break-inside-avoid">
                     <h3 className="text-lg font-black text-slate-900 mb-4 tracking-tight">Top 10 Costos por Vehículo</h3>
                     <div className="h-[300px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={costByVehicleData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                 <XAxis type="number" hide />
                                 <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fontWeight: 700}} />
                                 <Tooltip 
                                     cursor={{fill: '#f8fafc'}}
                                     contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                 />
                                 <Legend wrapperStyle={{fontSize: '10px', fontWeight: 700, textTransform: 'uppercase'}} />
                                 <Bar dataKey="fuel" name="Combustible" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={20} />
                                 <Bar dataKey="maintenance" name="Mantenimiento" stackId="a" fill="#f59e0b" radius={[0, 10, 10, 0]} barSize={20} />
                             </BarChart>
                         </ResponsiveContainer>
                     </div>
                 </div>
             ) : null}

             {/* GRAPH 2: TENDENCIA DIARIA */}
             {activeReport === 'financial' || activeReport === 'operations' ? (
                 <div className="bg-white p-5 border border-slate-200 shadow-sm break-inside-avoid">
                     <h3 className="text-lg font-black text-slate-900 mb-4 tracking-tight">Gasto Diario de Combustible</h3>
                     <div className="h-[300px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                             <LineChart data={efficiencyData}>
                                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                 <XAxis dataKey="date" tick={{fontSize: 10}} />
                                 <YAxis tick={{fontSize: 10}} />
                                 <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                                 <Line type="monotone" dataKey="totalCost" stroke="#10b981" strokeWidth={3} dot={false} />
                             </LineChart>
                         </ResponsiveContainer>
                     </div>
                 </div>
             ) : null}

            {/* GRAPH 3: INCIDENCIAS */}
            {activeReport === 'incidents' || activeReport === 'operations' ? (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm break-inside-avoid">
                    <h3 className="text-lg font-black text-slate-900 mb-6 tracking-tight">Distribución de Incidencias</h3>
                    <div className="h-[300px] w-full flex">
                        <ResponsiveContainer width="60%" height="100%">
                            <PieChart>
                                <Pie
                                    data={incidentTypeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {incidentTypeData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 flex flex-col justify-center gap-2">
                            {incidentTypeData.map((d: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="size-3 rounded-full" style={{backgroundColor: d.color}}></div>
                                    <span className="text-xs font-bold text-slate-600 uppercase">{d.name}: {d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}
       </div>

       {/* DETAILED TABLES FOR PRINT */}
       <div className="space-y-8 print-section">
           {/* Tabla de Gastos */}
           <div className="break-inside-avoid">
               <div className="section-title bg-slate-900 text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">
                   Desglose Financiero Detallado
               </div>
               <table className="w-full text-left border-collapse data-table">
                   <thead>
                       <tr className="bg-slate-100 text-slate-600">
                           <th className="p-3 text-[9px] font-black uppercase border border-slate-200">Vehículo</th>
                           <th className="p-3 text-[9px] font-black uppercase text-right border border-slate-200">Combustible</th>
                           <th className="p-3 text-[9px] font-black uppercase text-right border border-slate-200">Mantenimiento</th>
                           <th className="p-3 text-[9px] font-black uppercase text-right border border-slate-200">Total</th>
                       </tr>
                   </thead>
                   <tbody>
                       {costByVehicleData.map((item, idx) => (
                           <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                               <td className="p-3 text-[10px] font-bold border border-slate-200 print-truncate max-w-[150px]">{item.name}</td>
                               <td className="p-3 text-[10px] text-right font-mono border border-slate-200">${item.fuel.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                               <td className="p-3 text-[10px] text-right font-mono border border-slate-200">${item.maintenance.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                               <td className="p-3 text-[10px] text-right font-black font-mono border border-slate-200 bg-slate-50">${(item.fuel + item.maintenance).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                           </tr>
                       ))}
                       {/* Total Row */}
                       <tr className="bg-slate-900 text-white font-black">
                           <td className="p-3 text-[10px] font-black uppercase border border-slate-700">Total General</td>
                           <td className="p-3 text-[10px] text-right font-mono border border-slate-700">${kpis.totalFuelCost.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                           <td className="p-3 text-[10px] text-right font-mono border border-slate-700">${kpis.totalMaintenanceCost.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                           <td className="p-3 text-[10px] text-right font-black font-mono border border-slate-700">${kpis.totalCost.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                       </tr>
                   </tbody>
               </table>
           </div>
       </div>

         {/* FOOTER - FORMAL DOCUMENT */}
       <div className="hidden print:block print-footer mt-12 pt-4 border-t-2 border-slate-200">
           <div className="flex justify-between items-center text-[8pt] text-slate-400">
               <div>
                   <p className="font-bold">Sistema de Gestión de Parque Vehicular</p>
                   <p>DIF Municipal La Paz B.C.S.</p>
               </div>
               <div className="text-center">
                   <p className="font-black uppercase tracking-[0.2em]">Documento Generado Automáticamente</p>
                   <p>Este documento es válido sin firma para fines informativos</p>
               </div>
               <div className="text-right">
                   <p className="font-bold">
                       Página <span className="page-number">1</span> de <span className="page-count">{pageCount}</span>
                   </p>
                   <p>{new Date().toLocaleDateString('es-ES', {day: '2-digit', month: 'long', year: 'numeric'})}</p>
               </div>
           </div>
       </div>

      </div>

      {/* Print Preview Modal - EXACT COPY OF PRINT CONTENT */}
       {showPrintPreview && (
         <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
            <div className="p-4 bg-slate-900 flex justify-between items-center text-white sticky top-0 z-50 shadow-md no-print">
            <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/20 transition-all">
              Cerrar
            </button>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir PDF
              </button>
            </div>
          </div>
           <div className="flex-1 bg-slate-100 p-10 flex justify-center">
             <div id="report-printable-preview" className="print-preview-container">
              {/* PRINT ONLY HEADER - COMPACT */}
              <div className="flex print-header justify-between items-center mb-4 pb-4 border-b-2 border-slate-900">
                <div className="flex items-center gap-6">
                  <img src="/images/logo-dif.png" alt="Logo" className="w-24 object-contain" />
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-slate-900 uppercase leading-none tracking-tight">Reporte de Analisis de Vehiculos</span>
                    <span className="text-lg font-black text-slate-900 uppercase leading-tight tracking-tight">Sistema DIF Municipal La Paz B.C.S.</span>
                    <span className="text-[8pt] font-bold uppercase text-slate-400 mt-2 tracking-[0.2em]">Gestión de Parque Vehicular</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                    Reporte Ejecutivo
                  </div>
                  <p className="text-[9pt] font-black text-slate-400 uppercase tracking-widest">Periodo del Reporte</p>
                  <p className="text-lg font-black text-slate-900">
                    {new Date(dateRange.start).toLocaleDateString('es-ES', {day: '2-digit', month: 'short', year: 'numeric'})} — {new Date(dateRange.end).toLocaleDateString('es-ES', {day: '2-digit', month: 'short', year: 'numeric'})}
                  </p>
                  <p className="text-[8pt] text-slate-400 font-bold mt-1">
                    Generado: {new Date().toLocaleDateString('es-ES', {day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'})}
                  </p>
                </div>
              </div>

              {/* KPI SUMMARY - COMPACT FOR PRINT */}
              <div className="grid grid-cols-4 gap-3 mb-4 kpi-grid print:kpi-grid">
                <div className="bg-white p-2 border-l-4 border-l-blue-500 border border-slate-200 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Gasto Total</p>
                  <p className="text-xl font-black text-slate-900 mt-1 tracking-tight">${kpis.totalCost.toLocaleString()}</p>
                  <p className="text-[7px] font-bold text-slate-500 mt-0.5">Comb. + Mant.</p>
                </div>
                <div className="bg-white p-2 border-l-4 border-l-emerald-500 border border-slate-200 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Combustible</p>
                  <p className="text-xl font-black text-slate-900 mt-1 tracking-tight">${kpis.totalFuelCost.toLocaleString()}</p>
                  <p className="text-[7px] font-bold text-slate-500 mt-0.5">{kpis.totalLiters.toLocaleString()} L</p>
                </div>
                <div className="bg-white p-2 border-l-4 border-l-rose-500 border border-slate-200 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Mantenimiento</p>
                  <p className="text-xl font-black text-slate-900 mt-1 tracking-tight">${kpis.totalMaintenanceCost.toLocaleString()}</p>
                  <p className="text-[7px] font-bold text-slate-500 mt-0.5">Facturado</p>
                </div>
                <div className="bg-white p-2 border-l-4 border-l-blue-500 border border-slate-200 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Incidencias</p>
                  <p className="text-xl font-black text-slate-900 mt-1 tracking-tight">{kpis.incidentCount}</p>
                  <p className="text-[7px] font-bold text-slate-500 mt-0.5">Reportes</p>
                </div>
              </div>

              {/* GRAPHS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 break-inside-avoid charts-grid">
                {/* GRAPH 1: COSTOS POR VEHICULO */}
                <div className="bg-white p-4 border border-slate-200 shadow-sm break-inside-avoid">
                  <h3 className="text-base font-black text-slate-900 mb-3 tracking-tight">Top 10 Costos por Vehículo</h3>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costByVehicleData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 9, fontWeight: 700}} />
                        <Tooltip 
                          cursor={{fill: '#f8fafc'}}
                          contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        />
                        <Legend wrapperStyle={{fontSize: '9px', fontWeight: 700, textTransform: 'uppercase'}} />
                        <Bar dataKey="fuel" name="Combustible" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={16} />
                        <Bar dataKey="maintenance" name="Mantenimiento" stackId="a" fill="#f59e0b" radius={[0, 8, 8, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* GRAPH 2: GASTO DIARIO DE COMBUSTIBLE */}
                <div className="bg-white p-4 border border-slate-200 shadow-sm break-inside-avoid">
                  <h3 className="text-base font-black text-slate-900 mb-3 tracking-tight">Gasto Diario de Combustible</h3>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={efficiencyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{fontSize: 9}} />
                        <YAxis tick={{fontSize: 9}} />
                        <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                        <Line type="monotone" dataKey="totalCost" stroke="#10b981" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* DETAILED FINANCIAL TABLE FOR PRINT - COMPACT */}
              <div className="space-y-4 print-section">
                <div className="break-inside-avoid">
                  <div className="section-title bg-slate-900 text-white px-3 py-1 text-[8pt] font-black uppercase tracking-widest mb-3 inline-block rounded-sm">
                    Desglose Financiero Detallado
                  </div>
                  <table className="w-full text-left border-collapse data-table">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600">
                        <th className="p-2 text-[8px] font-black uppercase border border-slate-200">Vehículo</th>
                        <th className="p-2 text-[8px] font-black uppercase text-right border border-slate-200">Combustible</th>
                        <th className="p-2 text-[8px] font-black uppercase text-right border border-slate-200">Mantenimiento</th>
                        <th className="p-2 text-[8px] font-black uppercase text-right border border-slate-200">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costByVehicleData.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="p-2 text-[9px] font-bold border border-slate-200 print-truncate max-w-[100px]">{item.name}</td>
                          <td className="p-2 text-[9px] text-right font-mono border border-slate-200">${item.fuel.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                          <td className="p-2 text-[9px] text-right font-mono border border-slate-200">${item.maintenance.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                          <td className="p-2 text-[9px] text-right font-black font-mono border border-slate-200 bg-slate-50">${(item.fuel + item.maintenance).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-900 text-white font-black">
                        <td className="p-2 text-[8px] font-black uppercase border border-slate-700">Total General</td>
                        <td className="p-2 text-[8px] text-right font-mono border border-slate-700">${kpis.totalFuelCost.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                        <td className="p-2 text-[8px] text-right font-mono border border-slate-700">${kpis.totalMaintenanceCost.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                        <td className="p-2 text-[8px] text-right font-black font-mono border border-slate-700">${kpis.totalCost.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FOOTER - FORMAL DOCUMENT */}
              <div className="hidden print:block print-footer mt-6 pt-3 border-t border-slate-200">
                <div className="flex justify-between items-center text-[8pt] text-slate-400">
                  <div>
                    <p className="font-bold">Sistema de Gestión de Parque Vehicular</p>
                    <p>DIF Municipal La Paz B.C.S.</p>
                  </div>
                  <div className="text-center">
                    <p className="font-black uppercase tracking-[0.2em]">Documento Generado Automáticamente</p>
                    <p>Este documento es válido sin firma para fines informativos</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      Página <span className="page-number">1</span> de <span className="page-count">{pageCount}</span>
                    </p>
                    <p>{new Date().toLocaleDateString('es-ES', {day: '2-digit', month: 'long', year: 'numeric'})}</p>
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

export default Reports;
