
import React, { useState, useMemo } from 'react';
import { FuelEntry, FuelAcquisition, Vehicle, Driver, AppSetting, Area, Supplier } from '../types';

interface FuelProps {
  fuelHistory: FuelEntry[];
  fuelAcquisitions?: FuelAcquisition[];
  vehicles: Vehicle[];
  drivers: Driver[];
  areas?: Area[];
  suppliers?: Supplier[];
  onAddFuel: (entry: Omit<FuelEntry, 'id'>) => Promise<void>;
  onUpdateFuel: (entry: FuelEntry) => Promise<void>;
  onAddFuelAcquisition?: (entry: Omit<FuelAcquisition, 'id'>) => Promise<void>;
  onUpdateFuelAcquisition?: (entry: FuelAcquisition) => Promise<void>;
  onSync: () => void;
  settings?: AppSetting[];
}

const toDateInputValue = (value: unknown, fallback = ''): string => {
  if (!value) return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString().slice(0, 10);
};

const Fuel: React.FC<FuelProps> = ({
  fuelHistory = [],
  fuelAcquisitions = [],
  vehicles = [],
  drivers = [],
  areas = [],
  suppliers = [],
  onAddFuel,
  onUpdateFuel,
  onAddFuelAcquisition,
  onUpdateFuelAcquisition,
  onSync,
  settings = []
}) => {
  const [activeTab, setActiveTab] = useState<'loads' | 'acquisitions'>('loads');
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showAcquisitionPrintPreview, setShowAcquisitionPrintPreview] = useState(false);
  const [selectedAcquisition, setSelectedAcquisition] = useState<FuelAcquisition | null>(null);
  const [editingEntry, setEditingEntry] = useState<FuelEntry | null>(null);
  const [formError, setFormError] = useState('');
  const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);
  const [isSavingAcquisition, setIsSavingAcquisition] = useState(false);
  const [editingAcquisition, setEditingAcquisition] = useState<FuelAcquisition | null>(null);
  const [acquisitionError, setAcquisitionError] = useState('');
  const [acquisitionForm, setAcquisitionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    internalFolio: '',
    isQr: false,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    area: '',
    supplier: ''
  });
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicleId: '',
    driverId: '',
    liters: '',
    cost: '',
    odometer: ''
  });

  const handleEdit = (entry: FuelEntry) => {
    setFormError('');
    setEditingEntry(entry);
    setFormData({
      date: toDateInputValue(entry.date, new Date().toISOString().split('T')[0]),
      vehicleId: String(entry.vehicleId ?? '').trim(),
      driverId: String(entry.driverId ?? '').trim(),
      liters: entry.liters !== undefined && entry.liters !== null ? String(entry.liters) : '',
      cost: entry.cost !== undefined && entry.cost !== null ? String(entry.cost) : '',
      odometer: entry.odometer !== undefined && entry.odometer !== null ? String(entry.odometer) : ''
    });
    setShowModal(true);
  };

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    (settings || []).forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

  const areaOptions = useMemo(
    () => [...new Set((areas || []).map(item => String(item.name || '').trim()).filter(Boolean))],
    [areas]
  );
  const supplierOptions = useMemo(
    () => [...new Set((suppliers || []).map(item => String(item.name || '').trim()).filter(Boolean))],
    [suppliers]
  );

  const { processedHistory, globalAveragePerformance } = useMemo(() => {
    const entriesByVehicle: Record<string, FuelEntry[]> = {};
    fuelHistory.forEach(entry => {
      if (!entry.vehicleId) return;
      if (!entriesByVehicle[entry.vehicleId]) entriesByVehicle[entry.vehicleId] = [];
      entriesByVehicle[entry.vehicleId].push(entry);
    });

    const historyWithPerformance: (FuelEntry & { performance?: number })[] = [];
    let totalPerformanceSum = 0;
    let performanceCount = 0;

    Object.keys(entriesByVehicle).forEach(vehicleId => {
      const sorted = [...entriesByVehicle[vehicleId]].sort((a, b) => Number(a.odometer) - Number(b.odometer));
      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        const previous = i > 0 ? sorted[i - 1] : null;
        let performance: number | undefined = undefined;
        if (previous && Number(current.liters) > 0) {
          const distance = Number(current.odometer) - Number(previous.odometer);
          if (distance > 0) {
            performance = distance / Number(current.liters);
            totalPerformanceSum += performance;
            performanceCount++;
          }
        }
        historyWithPerformance.push({ ...current, performance });
      }
    });

    return {
      processedHistory: historyWithPerformance.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      }),
      globalAveragePerformance: performanceCount > 0 ? totalPerformanceSum / performanceCount : 0
    };
  }, [fuelHistory]);

  const totalCost = useMemo(() => fuelHistory.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0), [fuelHistory]);
  const totalLiters = useMemo(() => fuelHistory.reduce((acc, curr) => acc + (Number(curr.liters) || 0), 0), [fuelHistory]);
  const acquisitionTotals = useMemo(() => {
    const totalAmount = fuelAcquisitions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const qrCount = fuelAcquisitions.filter(item => item.isQr).length;
    return {
      totalAmount,
      qrCount,
      vouchersCount: fuelAcquisitions.length - qrCount
    };
  }, [fuelAcquisitions]);

  const nextAcquisitionConsecutive = useMemo(() => {
    if (fuelAcquisitions.length === 0) return 1;
    const maxNum = Math.max(...fuelAcquisitions.map(item => Number(item.consecutiveNumber) || 0));
    return maxNum + 1;
  }, [fuelAcquisitions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.vehicleId || !formData.liters || !formData.cost || !formData.driverId) return;

    setIsSaving(true);
    try {
      const entryData = {
        date: formData.date,
        vehicleId: formData.vehicleId,
        driverId: formData.driverId,
        liters: Number(formData.liters),
        cost: Number(formData.cost),
        odometer: Number(formData.odometer) || 0
      };

      if (editingEntry) {
        await onUpdateFuel({
          ...editingEntry,
          ...entryData
        });
      } else {
        await onAddFuel(entryData);
      }

      setFormData({ 
        date: new Date().toISOString().split('T')[0],
        vehicleId: '', 
        driverId: '', 
        liters: '', 
        cost: '', 
        odometer: '' 
      });
      setEditingEntry(null);
      setShowModal(false);
      setFormError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar registro de combustible";
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetAcquisitionForm = () => {
    setAcquisitionError('');
    setEditingAcquisition(null);
    setAcquisitionForm({
      date: new Date().toISOString().split('T')[0],
      internalFolio: '',
      isQr: false,
      validFrom: new Date().toISOString().split('T')[0],
      validTo: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      area: '',
      supplier: ''
    });
  };

  const handleEditAcquisition = (entry: FuelAcquisition) => {
    setAcquisitionError('');
    setEditingAcquisition(entry);
    setAcquisitionForm({
      date: toDateInputValue(entry.date, new Date().toISOString().split('T')[0]),
      internalFolio: String(entry.internalFolio || ''),
      isQr: Boolean(entry.isQr),
      validFrom: toDateInputValue(entry.validFrom, new Date().toISOString().split('T')[0]),
      validTo: toDateInputValue(entry.validTo, new Date().toISOString().split('T')[0]),
      description: String(entry.description || ''),
      amount: Number(entry.amount) ? String(entry.amount) : '',
      area: String(entry.area || ''),
      supplier: String(entry.supplier || '')
    });
    setShowAcquisitionModal(true);
  };

  const handleSubmitAcquisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddFuelAcquisition || !onUpdateFuelAcquisition) return;

    setAcquisitionError('');
    if (!acquisitionForm.description.trim() || !acquisitionForm.amount || !acquisitionForm.area.trim() || !acquisitionForm.supplier.trim()) {
      setAcquisitionError('Debes completar descripcion, monto, area y proveedor.');
      return;
    }
    if (!acquisitionForm.validFrom || !acquisitionForm.validTo) {
      setAcquisitionError('Debes capturar el rango de vigencia.');
      return;
    }
    if (new Date(acquisitionForm.validFrom).getTime() > new Date(acquisitionForm.validTo).getTime()) {
      setAcquisitionError('La fecha final no puede ser menor a la inicial.');
      return;
    }

    setIsSavingAcquisition(true);
    try {
      const payload = {
        consecutiveNumber: editingAcquisition?.consecutiveNumber || nextAcquisitionConsecutive,
        internalFolio: acquisitionForm.internalFolio || undefined,
        date: acquisitionForm.date,
        isQr: acquisitionForm.isQr,
        validFrom: acquisitionForm.validFrom,
        validTo: acquisitionForm.validTo,
        description: acquisitionForm.description,
        amount: Number(acquisitionForm.amount),
        area: acquisitionForm.area,
        supplier: acquisitionForm.supplier
      };

      if (editingAcquisition) {
        await onUpdateFuelAcquisition({ ...payload, id: editingAcquisition.id });
      } else {
        await onAddFuelAcquisition(payload);
      }

      setShowAcquisitionModal(false);
      resetAcquisitionForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar adquisicion de combustible';
      setAcquisitionError(message);
    } finally {
      setIsSavingAcquisition(false);
    }
  };

  const handlePrintAcquisition = (entry: FuelAcquisition) => {
    setSelectedAcquisition(entry);
    setShowAcquisitionPrintPreview(true);
  };

  // Variables institucionales para impresión
  // Normalizar la ruta del logo (convertir rutas relativas a absolutas)
  const defaultLogo = '/images/logo-dif.png';
  const rawLogo = String(settingsMap['APP_LOGO'] || defaultLogo).trim();
  const appLogo = (() => {
    if (!rawLogo) return defaultLogo;
    if (/^(https?:|data:|blob:)/i.test(rawLogo)) return rawLogo;
    if (rawLogo.startsWith('./')) return `/${rawLogo.slice(2)}`;
    if (rawLogo.startsWith('/')) return rawLogo;
    if (/^[a-zA-Z]:\\/.test(rawLogo) || rawLogo.startsWith('\\\\')) return defaultLogo;
    return `/${rawLogo.replace(/^\/+/, '')}`;
  })();
  const directorName = settingsMap['INSTITUTION_HEAD_NAME'] || 'Director General';
  const managerName = settingsMap['VEHICLE_MANAGER_NAME'] || 'Encargado del Parque Vehicular';
  const administrativeCoordinatorName = settingsMap['ADMINISTRATIVE_COORDINATOR_NAME'] || 'Coordinador Administrativo';
  const administrativeCoordinatorPos = settingsMap['ADMINISTRATIVE_COORDINATOR_POS'] || 'Coordinador Administrativo';

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
       <style>{`
         @media print {
            body * { 
              visibility: hidden; 
            }
            #fuel-printable,
            #fuel-printable *,
            #fuel-acquisition-printable,
            #fuel-acquisition-printable * { 
              visibility: visible; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #fuel-printable,
            #fuel-acquisition-printable { 
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
            @page { margin: 0.5cm; size: letter landscape; }
            /* Ensure tables fit on landscape page */
            #fuel-printable table,
            #fuel-acquisition-printable table {
              width: 100% !important;
              font-size: 8pt !important;
            }
           
            /* ========================================
               SIGNATURE SECTION - FLOWING WITH CONTENT
               ======================================== */
             #fuel-printable .signature-section,
             #fuel-acquisition-printable .signature-section {
               page-break-inside: avoid;
               margin-top: 2rem;
             }
             
             #fuel-printable .signature-line,
             #fuel-acquisition-printable .signature-line {
               border-top: 2px solid #1e293b;
               padding-top: 0.5rem;
               min-width: 200px;
             }
         }
       `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="page-title">Bitácora de Combustible</h2>
          <p className="page-subtitle">
            {activeTab === 'loads' ? 'Control de gastos y rendimiento por unidad' : 'Adquisiciones de vales y combustible QR'}
          </p>
        </div>
        <div className="flex gap-2">
            {activeTab === 'loads' && (
            <button 
                onClick={() => setShowPrintPreview(true)}
                className="btn btn-secondary"
            >
                <span className="material-symbols-outlined ui-icon">print</span>
                Vista Previa
            </button>
            )}
            <button 
            onClick={() => {
              if (activeTab === 'loads') {
                setShowModal(true);
              } else {
                resetAcquisitionForm();
                setShowAcquisitionModal(true);
              }
            }}
            className="btn btn-primary"
            >
            <span className="material-symbols-outlined ui-icon">{activeTab === 'loads' ? 'local_gas_station' : 'receipt_long'}</span>
            {activeTab === 'loads' ? 'Agregar Carga' : 'Nueva Adquisicion'}
            </button>
        </div>
      </div>

      <div className="no-print inline-flex rounded-xl border border-slate-200 bg-white p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('loads')}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'loads' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Cargas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('acquisitions')}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'acquisitions' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Adquisiciones
        </button>
      </div>

      {activeTab === 'loads' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
          <FuelStat label="Rendimiento Promedio" value={globalAveragePerformance > 0 ? globalAveragePerformance.toFixed(2) : "---"} unit="KM/L" icon="analytics" desc="Basado en historial de odometro" />
          <FuelStat label="Gasto Total" value={`$${(totalCost || 0).toLocaleString()}`} icon="attach_money" trend="+12%" isNegativeTrend />
          <FuelStat label="Litros Totales" value={(totalLiters || 0).toLocaleString()} unit="L" icon="water_drop" desc={`${(fuelHistory?.length || 0)} cargas registradas`} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
          <FuelStat label="Monto Total" value={`$${(acquisitionTotals.totalAmount || 0).toLocaleString()}`} icon="request_quote" />
          <FuelStat label="Compras QR" value={String(acquisitionTotals.qrCount)} icon="qr_code_2" desc="Registros con codigo QR" />
          <FuelStat label="Compras Vales" value={String(acquisitionTotals.vouchersCount)} icon="local_activity" desc="Registros con vales" />
        </div>
      )}

      <div className="card flex flex-col h-full no-print">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <div>
            <h3 className="section-title">{activeTab === 'loads' ? 'Historial de Consumo' : 'Adquisiciones de Combustible'}</h3>
            <p className="label mt-0.5">{activeTab === 'loads' ? 'Listado completo de cargas' : 'Registros de vales y combustible QR'}</p>
          </div>
          <button onClick={onSync} className="btn btn-ghost text-xs">
            <span className="material-symbols-outlined ui-icon">sync</span> Sincronizar
          </button>
        </div>
        
        <div className="overflow-x-auto flex-1">
          {activeTab === 'loads' ? (
          <table className="table-professional table-density-compact">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Vehículo</th>
                <th className="text-right">Odómetro</th>
                <th className="text-right">Litros</th>
                <th className="text-right">Rendimiento</th>
                <th className="text-right">Costo</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {processedHistory.map((entry) => {
                const vehicle = vehicles.find(v => v.id === entry.vehicleId);
                const driver = drivers.find(d => d.id === entry.driverId);
                return (
                  <tr key={entry.id}>
                    <td className="font-medium">
                      {entry.date ? new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                    </td>
                    <td>
                      <p className="font-medium text-slate-900">{vehicle?.plate || entry.vehicleId || 'S/P'}</p>
                      <p className="text-xs text-slate-400">{driver?.name || entry.driverId || '---'}</p>
                    </td>
                    <td className="text-right text-slate-500">{(Number(entry.odometer) || 0).toLocaleString()} km</td>
                    <td className="text-right font-medium">{entry.liters || 0} L</td>
                    <td className="text-right">
                      {entry.performance ? (
                        <span className="badge badge-info">
                          {entry.performance.toFixed(2)} KM/L
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Carga Inicial</span>
                      )}
                    </td>
                     <td className="text-right font-medium">${(Number(entry.cost) || 0).toFixed(2)}</td>
                     <td className="text-center">
                       <div className="table-actions">
                        <button 
                          onClick={() => handleEdit(entry)}
                          className="btn-icon btn-icon-primary"
                          aria-label="Editar"
                        >
                          <span className="material-symbols-outlined ui-icon">edit</span>
                        </button>
                       </div>
                     </td>
                  </tr>
                );
              })}
              {processedHistory.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 text-sm font-bold">Sin registros de cargas.</td>
                </tr>
              )}
            </tbody>
          </table>
          ) : (
          <table className="table-professional table-density-compact">
            <thead>
              <tr>
                <th>Consec.</th>
                <th>Folio Interno</th>
                <th>Modalidad</th>
                <th>Vigencia</th>
                <th>Descripcion</th>
                <th>Area</th>
                <th>Proveedor</th>
                <th className="text-right">Monto</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fuelAcquisitions.map((entry) => (
                <tr key={entry.id}>
                  <td className="font-black text-blue-700">{entry.consecutiveNumber || '---'}</td>
                  <td className="font-medium">{entry.internalFolio || 'S/N'}</td>
                  <td>
                    <span className={`badge ${entry.isQr ? 'badge-success' : 'badge-warning'}`}>
                      {entry.isQr ? 'QR' : 'VALES'}
                    </span>
                  </td>
                  <td className="text-xs font-bold text-slate-500">
                    {entry.validFrom ? new Date(entry.validFrom).toLocaleDateString() : '---'} - {entry.validTo ? new Date(entry.validTo).toLocaleDateString() : '---'}
                  </td>
                  <td className="font-medium">{entry.description}</td>
                  <td className="font-medium">{entry.area}</td>
                  <td className="font-medium">{entry.supplier}</td>
                  <td className="text-right font-black">${(Number(entry.amount) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  <td className="text-center">
                    <div className="table-actions">
                      <button
                        onClick={() => handlePrintAcquisition(entry)}
                        className="btn-icon btn-icon-success"
                        aria-label="Imprimir ticket de adquisicion"
                      >
                        <span className="material-symbols-outlined ui-icon">print</span>
                      </button>
                      <button
                        onClick={() => handleEditAcquisition(entry)}
                        className="btn-icon btn-icon-primary"
                        aria-label="Editar adquisicion"
                      >
                        <span className="material-symbols-outlined ui-icon">edit</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {fuelAcquisitions.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-slate-400 text-sm font-bold">Sin registros de adquisiciones.</td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-xl w-full max-w-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600" aria-hidden="true">local_gas_station</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{editingEntry ? 'Editar Carga' : 'Nueva Carga'}</h3>
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
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha de la Carga</label>
                <input 
                  type="date"
                  required disabled={isSaving}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vehículo</label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Litros Cargados</label>
                  <div className="relative">
                    <input 
                      required disabled={isSaving}
                      type="number" step="0.01"
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 pr-8 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                      placeholder="0.00"
                      value={formData.liters}
                      onChange={e => setFormData({...formData, liters: e.target.value})}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">L</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Costo Total ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                    <input 
                      required disabled={isSaving}
                      type="number" step="0.01"
                      className="w-full bg-slate-50 border border-slate-200 rounded-md pl-7 pr-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                      placeholder="0.00"
                      value={formData.cost}
                      onChange={e => setFormData({...formData, cost: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lectura del Odómetro (Km)</label>
                <input 
                  required disabled={isSaving}
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                  placeholder="Ej. 125400"
                  value={formData.odometer}
                  onChange={e => setFormData({...formData, odometer: e.target.value})}
                />
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
                      <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                      Guardando...
                    </>
                  ) : (
                    editingEntry ? 'Guardar Cambios' : 'Guardar Registro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISTA PREVIA DE IMPRESIÓN (REPORTE DE COMBUSTIBLE) */}
      {showAcquisitionModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600" aria-hidden="true">receipt_long</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{editingAcquisition ? 'Editar Adquisicion' : 'Nueva Adquisicion'}</h3>
                </div>
              </div>
              <button
                onClick={() => !isSavingAcquisition && setShowAcquisitionModal(false)}
                disabled={isSavingAcquisition}
                className="size-9 rounded-md hover:bg-white transition-all flex items-center justify-center text-slate-400 disabled:opacity-50"
                aria-label="Cerrar modal"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitAcquisition} autoComplete="off" className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Consecutivo</label>
                  <div className="w-full bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm font-black text-blue-700">
                    {editingAcquisition?.consecutiveNumber || nextAcquisitionConsecutive}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Folio Interno</label>
                  <input disabled={isSavingAcquisition} className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all uppercase" value={acquisitionForm.internalFolio} onChange={e => setAcquisitionForm({...acquisitionForm, internalFolio: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha de Registro</label>
                  <input type="date" required disabled={isSavingAcquisition} className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all" value={acquisitionForm.date} onChange={e => setAcquisitionForm({...acquisitionForm, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Modalidad</label>
                  <select required disabled={isSavingAcquisition} className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all" value={acquisitionForm.isQr ? 'qr' : 'voucher'} onChange={e => setAcquisitionForm({...acquisitionForm, isQr: e.target.value === 'qr'})}>
                    <option value="voucher">Vales</option>
                    <option value="qr">Codigo QR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rango Desde</label>
                  <input type="date" required disabled={isSavingAcquisition} className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all" value={acquisitionForm.validFrom} onChange={e => setAcquisitionForm({...acquisitionForm, validFrom: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rango Hasta</label>
                  <input type="date" required disabled={isSavingAcquisition} className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all" value={acquisitionForm.validTo} onChange={e => setAcquisitionForm({...acquisitionForm, validTo: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Area</label>
                  <select
                    required
                    disabled={isSavingAcquisition}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all"
                    value={acquisitionForm.area}
                    onChange={e => setAcquisitionForm({ ...acquisitionForm, area: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    {acquisitionForm.area && !areaOptions.includes(acquisitionForm.area) && (
                      <option value={acquisitionForm.area}>{acquisitionForm.area}</option>
                    )}
                    {areaOptions.map(name => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Proveedor</label>
                  <select
                    required
                    disabled={isSavingAcquisition}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all"
                    value={acquisitionForm.supplier}
                    onChange={e => setAcquisitionForm({ ...acquisitionForm, supplier: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    {acquisitionForm.supplier && !supplierOptions.includes(acquisitionForm.supplier) && (
                      <option value={acquisitionForm.supplier}>{acquisitionForm.supplier}</option>
                    )}
                    {supplierOptions.map(name => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Monto ($)</label>
                <input type="number" step="0.01" required disabled={isSavingAcquisition} className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all" value={acquisitionForm.amount} onChange={e => setAcquisitionForm({...acquisitionForm, amount: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descripcion</label>
                <textarea rows={3} required disabled={isSavingAcquisition} className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none resize-none focus:bg-white focus:border-primary transition-all" value={acquisitionForm.description} onChange={e => setAcquisitionForm({...acquisitionForm, description: e.target.value})} />
              </div>

              {acquisitionError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {acquisitionError}
                </p>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  disabled={isSavingAcquisition}
                  onClick={() => setShowAcquisitionModal(false)}
                  className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-md transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingAcquisition}
                  className="flex-[2] py-3 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-md hover:opacity-90 transition-all disabled:opacity-80 flex items-center justify-center gap-2"
                >
                  {isSavingAcquisition ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                      Guardando...
                    </>
                  ) : (
                    editingAcquisition ? 'Guardar Cambios' : 'Guardar Registro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAcquisitionPrintPreview && selectedAcquisition && (
        <div className="fixed inset-0 z-[210] bg-white flex flex-col overflow-y-auto">
          <div className="sticky top-0 bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg no-print">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAcquisitionPrintPreview(false)}
                className="bg-white/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/20 transition-all"
              >
                Cerrar
              </button>
              <h3 className="font-black uppercase tracking-widest text-sm">Vista Previa Ticket Adquisicion</h3>
            </div>
            <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-md font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Ticket PDF
            </button>
          </div>
          <div className="flex-1 bg-slate-100 p-10 flex justify-center">
            <div id="fuel-acquisition-printable" className="bg-white w-[21.59cm] min-h-[27.94cm] p-[1.5cm] shadow-2xl relative text-slate-900">
              <div className="flex justify-between items-center mb-8 border-b-4 border-slate-900 pb-6">
                <div className="flex items-center gap-6">
                  <img
                    src={appLogo}
                    alt="Logo"
                    className="w-24 object-contain"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.dataset.fallbackApplied === '1') return;
                      img.dataset.fallbackApplied = '1';
                      img.src = defaultLogo;
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-lg font-black text-slate-900 uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                    <span className="text-lg font-black text-slate-900 uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                    <span className="text-[8pt] font-bold uppercase text-slate-400 mt-2 tracking-[0.2em]">Ticket de Adquisicion de Combustible</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                    {selectedAcquisition.isQr ? 'Compra QR' : 'Vales de Gasolina'}
                  </div>
                  <p className="text-xs font-bold text-slate-600">
                    No. <span className="font-black text-blue-600 text-lg ml-1">{selectedAcquisition.consecutiveNumber || '---'}</span>
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    FOLIO INTERNO: <span className="font-black text-slate-900 text-lg ml-1">{(selectedAcquisition.internalFolio || 'S/N').toUpperCase()}</span>
                  </p>
                  <p className="text-[9pt] text-slate-400 font-bold mt-1">
                    Fecha: {selectedAcquisition.date ? new Date(selectedAcquisition.date).toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'}) : '---'}
                  </p>
                  <p className="text-[8pt] text-slate-300 font-bold mt-1">
                    Generado: {new Date().toLocaleDateString('es-ES', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-3 text-[9pt]">
                  <p><span className="font-black text-slate-500 uppercase tracking-wider">Fecha Registro:</span> <span className="font-bold text-slate-900">{selectedAcquisition.date ? new Date(selectedAcquisition.date).toLocaleDateString('es-ES') : '---'}</span></p>
                  <p><span className="font-black text-slate-500 uppercase tracking-wider">Area:</span> <span className="font-bold text-slate-900">{selectedAcquisition.area}</span></p>
                  <p><span className="font-black text-slate-500 uppercase tracking-wider">Rango Vigencia:</span> <span className="font-bold text-slate-900">{selectedAcquisition.validFrom ? new Date(selectedAcquisition.validFrom).toLocaleDateString('es-ES') : '---'} - {selectedAcquisition.validTo ? new Date(selectedAcquisition.validTo).toLocaleDateString('es-ES') : '---'}</span></p>
                  <p><span className="font-black text-slate-500 uppercase tracking-wider">Modalidad:</span> <span className="font-bold text-slate-900">{selectedAcquisition.isQr ? 'CODIGO QR' : 'VALES'}</span></p>
                </div>
              </div>

              <div className="mb-8 bg-slate-50 border border-slate-200 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Proveedor</p>
                    <p className="text-[12pt] font-black text-slate-900 uppercase break-words">{selectedAcquisition.supplier}</p>
                  </div>
                  <div className="text-right border-l border-slate-200 pl-8">
                    <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Monto de Adquisicion</p>
                    <p className="text-[20pt] font-black text-primary tracking-tighter">${(Number(selectedAcquisition.amount) || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-12">
                <div className="bg-slate-900 text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">
                  Descripcion / Concepto
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <p className="text-[10pt] text-slate-700 leading-relaxed break-words">
                    {selectedAcquisition.description || 'Sin descripcion.'}
                  </p>
                </div>
              </div>

              <div className="signature-section">
                <div className="grid grid-cols-3 gap-12 text-center">
                  <div className="signature-line border-t-2 border-slate-900 pt-4">
                    <p className="text-[9pt] font-black uppercase text-slate-900">{administrativeCoordinatorName}</p>
                    <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">{administrativeCoordinatorPos}</p>
                    <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Vo. Bo.</p>
                  </div>
                  <div className="signature-line border-t-2 border-slate-900 pt-4">
                    <p className="text-[9pt] font-black uppercase text-slate-900">{directorName}</p>
                    <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Director General</p>
                    <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Autorizacion</p>
                  </div>
                  <div className="signature-line border-t-2 border-slate-900 pt-4">
                    <p className="text-[9pt] font-black uppercase text-slate-900">Nombre y Firma</p>
                    <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Recibido</p>
                    <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Sello</p>
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

      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
           <div className="sticky top-0 bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg no-print">
             <div className="flex items-center gap-4">
               <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/20 transition-all">Cerrar</button>
               <h3 className="font-black uppercase tracking-widest text-sm">Vista Previa de Impresión</h3>
             </div>
             <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
               <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Reporte PDF
             </button>
           </div>
           <div className="flex-1 bg-slate-100 p-10 flex justify-center">
              <div id="fuel-printable" className="bg-white w-[27.94cm] min-h-[21.59cm] p-[1.5cm] shadow-2xl relative text-slate-900">
                
                {/* Header Institucional */}
                <div className="flex justify-between items-center mb-8 border-b-4 border-slate-900 pb-6">
                  <div className="flex items-center gap-6">
                    <img
                      src={appLogo}
                      alt="Logo"
                      className="w-24 object-contain"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallbackApplied === '1') return;
                        img.dataset.fallbackApplied = '1';
                        img.src = defaultLogo;
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-slate-900 uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                      <span className="text-lg font-black text-slate-900 uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                      <span className="text-[8pt] font-bold uppercase text-slate-400 mt-2 tracking-[0.2em]">Parque Vehicular • Control de Combustible</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                        Bitácora General
                    </div>
                    <p className="text-[9pt] text-slate-400 font-bold mt-1">Fecha de Emisión: {new Date().toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
                  </div>
                </div>

                <div className="flex gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex-1">
                        <p className="text-[8pt] font-black text-blue-600 uppercase tracking-widest mb-1">Total Ejercido</p>
                        <p className="text-2xl font-black text-slate-900">${(totalCost || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg flex-1">
                        <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Litros Consumidos</p>
                        <p className="text-2xl font-black text-slate-900">{(totalLiters || 0).toLocaleString()} L</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg flex-1">
                        <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Rendimiento Promedio</p>
                        <p className="text-2xl font-black text-slate-900">{globalAveragePerformance > 0 ? globalAveragePerformance.toFixed(2) : "---"} KM/L</p>
                    </div>
                </div>

                {/* Tabla */}
                <div className="mb-8">
                  <table className="w-full border-collapse border border-slate-300">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-slate-600 w-24">Fecha</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-slate-600">Vehículo</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-slate-600">Conductor</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-slate-600 text-right">Odómetro</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-slate-600 text-right">Litros</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-slate-600 text-right">Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedHistory.map((entry, idx) => {
                        const vehicle = vehicles.find(v => v.id === entry.vehicleId);
                        const driver = drivers.find(d => d.id === entry.driverId);
                        return (
                          <tr key={idx} className="border-b border-slate-300">
                            <td className="px-2 py-2 text-[8pt] font-bold text-center text-slate-500">
                              {entry.date ? new Date(entry.date).toLocaleDateString('es-ES') : '-'}
                            </td>
                            <td className="px-2 py-2 text-[8pt] font-black text-slate-900 uppercase">
                              {vehicle?.plate || '---'} ({vehicle?.model || ''})
                            </td>
                            <td className="px-2 py-2 text-[8pt] font-bold text-slate-700 uppercase">
                              {driver?.name || '---'}
                            </td>
                            <td className="px-2 py-2 text-[8pt] text-right font-mono">
                              {(Number(entry.odometer) || 0).toLocaleString()}
                            </td>
                            <td className="px-2 py-2 text-[8pt] text-right font-mono">
                              {entry.liters}
                            </td>
                            <td className="px-2 py-2 text-[8pt] text-right font-black text-slate-900 font-mono">
                              ${(Number(entry.cost) || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                 {/* Firmas - Formal Signature Section */}
                 <div className="signature-section absolute bottom-[1.5cm] left-[1.5cm] right-[1.5cm]">
                     <div className="grid grid-cols-2 gap-24 text-center">
                         <div className="signature-line border-t-2 border-slate-900 pt-4">
                             <p className="text-[9pt] font-black uppercase text-slate-900">{managerName}</p>
                             <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Encargado del Parque Vehicular</p>
                             <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Elaboró</p>
                         </div>
                         <div className="signature-line border-t-2 border-slate-900 pt-4">
                             <p className="text-[9pt] font-black uppercase text-slate-900">{directorName}</p>
                             <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Director General</p>
                             <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Enterado</p>
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

const FuelStat: React.FC<{ label: string, value: string, unit?: string, icon: string, trend?: string, isNegativeTrend?: boolean, desc?: string }> = ({ label, value, unit, icon, trend, isNegativeTrend, desc }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 group hover:border-blue-500/30 transition-all">
    <div className="flex items-center justify-between mb-4">
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{label}</p>
      <div className="bg-blue-50 text-blue-600 p-2 rounded-xl group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-slate-900 text-3xl font-black tracking-tighter">
        {value} {unit && <span className="text-lg text-slate-400 font-bold ml-1">{unit}</span>}
      </p>
      {trend && <p className={`${isNegativeTrend ? 'text-rose-600' : 'text-green-600'} text-[11px] font-black`}>{trend}</p>}
      {desc && <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{desc}</p>}
    </div>
  </div>
);

export default Fuel;
