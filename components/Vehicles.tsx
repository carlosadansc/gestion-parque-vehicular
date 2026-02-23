
import React, { useState, useMemo } from 'react';
import { Vehicle, Driver, AppSetting } from '../types';

interface VehiclesProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  searchQuery: string;
  onAddVehicle: (v: Omit<Vehicle, 'id'>) => Promise<void>;
  onUpdateVehicle: (v: Vehicle) => Promise<void>;
  settings?: AppSetting[];
}

const Vehicles: React.FC<VehiclesProps> = ({ vehicles, drivers, searchQuery, onAddVehicle, onUpdateVehicle, settings = [] }) => {
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'technical' | 'condition' | 'accessories'>('general');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<Vehicle | null>(null);

  const [newAccessory, setNewAccessory] = useState('');
  const [accessoriesList, setAccessoriesList] = useState<string[]>([]);

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

  // Fix: explicitly type the status field to prevent narrowing to just 'active'
  const initialFormState = {
    plate: '', model: '', assignedDriverId: '', status: 'active' as Vehicle['status'], image: '',
    economicNumber: '', inventory: '', condition: 'Bueno', location: '', vin: '', odometer: '',
    brand: '', year: new Date().getFullYear().toString(), type: '', line: '', color: '',
    cylinders: '4', fuelType: 'Gasolina',
    engineStatus: 'Bien', clutchStatus: 'Bien', transmissionStatus: 'Bien', shifterStatus: 'Bien',
    steeringStatus: 'Bien', suspensionStatus: 'Bien', tempGaugeStatus: 'Bien', oilGaugeStatus: 'Bien',
    tiresStatus: 'Bien', shocksStatus: 'Bien', brakesStatus: 'Bien', batteryStatus: 'Bien',
    lightsStatus: 'Bien', hornStatus: 'Bien', wipersStatus: 'Bien', speedoStatus: 'Bien',
    accessories_notes: '', observations: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const driver = drivers.find(d => d.id === v.assignedDriverId);
      const matchesSearch = (typeof v.plate === 'string' && v.plate.toLowerCase().includes(searchQuery.toLowerCase())) || 
                           (typeof v.model === 'string' && v.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
                           (typeof v.brand === 'string' && v.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
                           (typeof driver?.name === 'string' && driver.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'todos' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, drivers, searchQuery, statusFilter]);

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    // Use casting to any for complex merged objects to avoid strict property overlap errors with widened types
    setFormData({
      ...initialFormState,
      ...vehicle,
      year: (vehicle.year || new Date().getFullYear()).toString(),
      odometer: (vehicle.odometer || 0).toString(),
      cylinders: (vehicle.cylinders || 4).toString(),
    } as any);
    
    if (vehicle.accessories_notes) {
      setAccessoriesList(vehicle.accessories_notes.split(',').map(s => s.trim()).filter(s => s !== ''));
    } else {
      setAccessoriesList([]);
    }
    
    setActiveTab('general');
    setShowModal(true);
  };

  const handleOpenNew = () => {
    setEditingVehicle(null);
    setFormData(initialFormState);
    setAccessoriesList([]);
    setActiveTab('general');
    setShowModal(true);
  };

  const addAccessory = () => {
    if (newAccessory.trim() === '') return;
    const cleanAccessory = newAccessory.trim().toUpperCase();
    if (!accessoriesList.includes(cleanAccessory)) {
      setAccessoriesList([...accessoriesList, cleanAccessory]);
    }
    setNewAccessory('');
  };

  const removeAccessory = (index: number) => {
    setAccessoriesList(accessoriesList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || !formData.model) return;
    
    setIsSaving(true);
    try {
      const payload: Omit<Vehicle, 'id'> = {
        ...formData,
        odometer: Number(formData.odometer) || 0,
        year: Number(formData.year) || 0,
        cylinders: Number(formData.cylinders) || 0,
        plate: formData.plate.toUpperCase(),
        model: formData.model.toUpperCase(),
        color: formData.color.toUpperCase(),
        accessories_notes: accessoriesList.join(', '),
        image: formData.image || `https://picsum.photos/seed/${formData.plate}/200`
      } as any;

      if (editingVehicle) {
        await onUpdateVehicle({ ...editingVehicle, ...payload });
      } else {
        await onAddVehicle(payload);
      }
      setShowModal(false);
    } catch (err) {
      alert("Error al guardar el vehículo");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = (v: Vehicle) => {
    setSelectedForPrint(v);
    setShowPrintPreview(true);
  };

  // Obtener la ruta del logo con base correcta
  const rawLogo = settingsMap['APP_LOGO'] || '/images/logo-dif.png';
  const appLogo = rawLogo.startsWith('./') ? rawLogo.replace('./', '/') : rawLogo;
  const directorName = settingsMap['ADMINISTRATIVE_COORDINATOR_NAME']; 
  const headOfMaterialsName = settingsMap['VEHICLE_MANAGER_NAME'];
  const headOfMaterialsPosition = settingsMap['VEHICLE_MANAGER_POS'] || 'Encargado de Parque Vehicular';
  const directorPosition = settingsMap['ADMINISTRATIVE_COORDINATOR_POS'] || 'Coordinador Administrativo';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
       <style>{`
        @media print {
          @page { margin: 0.5cm; size: letter; }
          body * {
            visibility: hidden;
          }
          #tech-sheet-printable,
          #tech-sheet-printable * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #tech-sheet-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            font-family: 'Inter', sans-serif !important;
            z-index: 9999 !important;
          }
          .no-print {
            display: none !important;
          }
          
          /* Ensure content fits on portrait page */
          #tech-sheet-printable .grid {
            width: 100% !important;
            gap: 0.5rem !important;
          }
          
          /* Prevent page breaks inside sections */
          #tech-sheet-printable .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Table styling */
          #tech-sheet-printable table {
            width: 100% !important;
            page-break-inside: avoid;
          }
          
          /* Overflow handling for long content */
          #tech-sheet-printable .overflow-truncate {
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
           /* Ensure signature section stays at bottom */
           #tech-sheet-printable .signature-section {
             page-break-inside: avoid;
             margin-top: 2rem;
           }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Inventario de Vehículos</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Gestión técnica y administrativa de unidades.</p>
        </div>
        <button 
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all uppercase tracking-widest"
        >
          <span className="material-symbols-outlined">add</span>
          Nueva Unidad
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setStatusFilter('todos')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'todos' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>Todos</button>
            <button onClick={() => setStatusFilter('active')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'active' ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>Activo</button>
            <button onClick={() => setStatusFilter('workshop')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'workshop' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>Taller</button>
            <button onClick={() => setStatusFilter('inactive')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'inactive' ? 'bg-slate-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>Inactivo</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unidad</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Placa</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Chofer</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map((vehicle) => {
                const driver = drivers.find(d => d.id === vehicle.assignedDriverId);
                return (
                  <tr key={vehicle.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                           <span className="material-symbols-outlined text-slate-400">directions_car</span>
                         </div>
                         <div>
                            <p className="font-semibold text-slate-900">{vehicle.model}</p>
                            <p className="text-xs text-primary font-medium">{vehicle.brand} {vehicle.line}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-700">{vehicle.plate}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                       <span className="text-sm font-medium text-slate-600">{driver?.name || '—'}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handlePrint(vehicle)} className="btn-icon text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><span className="material-symbols-outlined">file_present</span></button>
                        <button onClick={() => handleEdit(vehicle)} className="btn-icon text-slate-400 hover:text-primary hover:bg-blue-50"><span className="material-symbols-outlined">edit</span></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingVehicle ? 'Ficha de Unidad' : 'Nueva Unidad'}</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Control Patrimonial y Técnico V.7.5</p>
              </div>
              <button onClick={() => !isSaving && setShowModal(false)} className="size-12 rounded-full hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-slate-400"><span className="material-symbols-outlined text-2xl">close</span></button>
            </div>

            <div className="flex border-b border-slate-100 bg-white px-10 overflow-x-auto">
              <TabBtn active={activeTab === 'general'} onClick={() => setActiveTab('general')} label="Generales" icon="info" />
              <TabBtn active={activeTab === 'technical'} onClick={() => setActiveTab('technical')} label="Técnicos" icon="settings_suggest" />
              <TabBtn active={activeTab === 'condition'} onClick={() => setActiveTab('condition')} label="Estado Mecánico (16 Puntos)" icon="health_and_safety" />
              <TabBtn active={activeTab === 'accessories'} onClick={() => setActiveTab('accessories')} label="Accesorios / Notas" icon="construction" />
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
                  <div className="space-y-4">
                    <InputField label="Placa / Matrícula" value={formData.plate} onChange={v => setFormData({...formData, plate: v})} placeholder="CF-66-803" />
                    <InputField label="Descripción / Nombre" value={formData.model} onChange={v => setFormData({...formData, model: v})} placeholder="Frontier Doble Cabina" />
                    <InputField label="Número Económico" value={formData.economicNumber} onChange={v => setFormData({...formData, economicNumber: v})} placeholder="2023001" />
                    <InputField label="Número de Inventario" value={formData.inventory} onChange={v => setFormData({...formData, inventory: v})} placeholder="1140000001139" />
                    <InputField label="Color de la Unidad" value={formData.color} onChange={v => setFormData({...formData, color: v})} placeholder="BLANCO" />
                  </div>
                  <div className="space-y-4">
                    <SelectField label="Estado de Operación" value={formData.status} onChange={v => setFormData({...formData, status: v as any})} options={[{v:'active', l:'Activo'}, {v:'workshop', l:'Taller'}, {v:'inactive', l:'Inactivo'}]} />
                    <SelectField 
                      label="Chofer Asignado" 
                      value={formData.assignedDriverId} 
                      onChange={v => setFormData({...formData, assignedDriverId: v})} 
                      options={[
                        { v: '', l: '--- SIN ASIGNAR ---' },
                        ...drivers.map(d => ({ v: d.id, l: d.name }))
                      ]} 
                    />
                    <InputField label="Ubicación / Resguardo" value={formData.location} onChange={v => setFormData({...formData, location: v})} placeholder="DIF Municipal La Paz" />
                  </div>
                </div>
              )}

              {activeTab === 'technical' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-left-4">
                  <InputField label="Marca" value={formData.brand} onChange={v => setFormData({...formData, brand: v})} />
                  <InputField label="Año / Modelo" value={formData.year} onChange={v => setFormData({...formData, year: v})} type="number" />
                  <InputField label="Línea" value={formData.line} onChange={v => setFormData({...formData, line: v})} />
                  <InputField label="Kilometraje Actual" value={formData.odometer} onChange={v => setFormData({...formData, odometer: v})} type="number" />
                  <SelectField label="Combustible" value={formData.fuelType} onChange={v => setFormData({...formData, fuelType: v})} options={[{v:'Gasolina', l:'Gasolina'}, {v:'Diiesel', l:'Diiesel'}, {v:'Hibrido', l:'Hibrido'}]} />
                  <InputField label="Cilindros" value={formData.cylinders} onChange={v => setFormData({...formData, cylinders: v})} type="number" />
                  <div className="col-span-1 md:col-span-3">
                    <InputField label="Serie VIN" value={formData.vin} onChange={v => setFormData({...formData, vin: v})} />
                  </div>
                </div>
              )}

              {activeTab === 'condition' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-in slide-in-from-left-4">
                  <ConditionInput label="1. Motor" value={formData.engineStatus} onChange={v => setFormData({...formData, engineStatus: v})} />
                  <ConditionInput label="2. Transmisión" value={formData.transmissionStatus} onChange={v => setFormData({...formData, transmissionStatus: v})} />
                  <ConditionInput label="3. Clutch" value={formData.clutchStatus} onChange={v => setFormData({...formData, clutchStatus: v})} />
                  <ConditionInput label="4. Frenos" value={formData.brakesStatus} onChange={v => setFormData({...formData, brakesStatus: v})} />
                  <ConditionInput label="5. Dirección" value={formData.steeringStatus} onChange={v => setFormData({...formData, steeringStatus: v})} />
                  <ConditionInput label="6. Suspensión" value={formData.suspensionStatus} onChange={v => setFormData({...formData, suspensionStatus: v})} />
                  <ConditionInput label="7. Amortiguadores" value={formData.shocksStatus} onChange={v => setFormData({...formData, shocksStatus: v})} />
                  <ConditionInput label="8. Llantas" value={formData.tiresStatus} onChange={v => setFormData({...formData, tiresStatus: v})} />
                  <ConditionInput label="9. Batería" value={formData.batteryStatus} onChange={v => setFormData({...formData, batteryStatus: v})} />
                  <ConditionInput label="10. Luces" value={formData.lightsStatus} onChange={v => setFormData({...formData, lightsStatus: v})} />
                  <ConditionInput label="11. Limpiadores" value={formData.wipersStatus} onChange={v => setFormData({...formData, wipersStatus: v})} />
                  <ConditionInput label="12. Claxon" value={formData.hornStatus} onChange={v => setFormData({...formData, hornStatus: v})} />
                  <ConditionInput label="13. Palanca Vel." value={formData.shifterStatus} onChange={v => setFormData({...formData, shifterStatus: v})} />
                  <ConditionInput label="14. Velocímetro" value={formData.speedoStatus} onChange={v => setFormData({...formData, speedoStatus: v})} />
                  <ConditionInput label="15. Medidor Temp." value={formData.tempGaugeStatus} onChange={v => setFormData({...formData, tempGaugeStatus: v})} />
                  <ConditionInput label="16. Medidor Aceite" value={formData.oilGaugeStatus} onChange={v => setFormData({...formData, oilGaugeStatus: v})} />
                </div>
              )}

              {activeTab === 'accessories' && (
                <div className="space-y-10 animate-in slide-in-from-left-4">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Listado de Accesorios</label>
                    <div className="flex gap-3">
                      <input 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase"
                        placeholder="Escribe el nombre de un accesorio y presiona Enter..."
                        value={newAccessory}
                        onChange={(e) => setNewAccessory(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAccessory(); } }}
                      />
                      <button 
                        type="button"
                        onClick={addAccessory}
                        className="bg-primary text-white size-14 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all"
                      >
                        <span className="material-symbols-outlined text-2xl font-black">add</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-6">
                      {accessoriesList.map((acc, index) => (
                        <div key={index} className="flex items-center gap-3 bg-blue-50/50 border border-primary/20 rounded-2xl px-5 py-3.5 group hover:bg-white hover:shadow-md transition-all">
                          <div className="size-6 bg-primary text-white rounded-lg flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-[14px] font-black">check</span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{acc}</span>
                          <button 
                            type="button"
                            onClick={() => removeAccessory(index)}
                            className="size-6 rounded-full hover:bg-rose-100 text-slate-300 hover:text-rose-500 flex items-center justify-center transition-all"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))}
                      {accessoriesList.length === 0 && (
                        <div className="w-full py-10 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center opacity-40">
                          <span className="material-symbols-outlined text-4xl mb-2">construction</span>
                          <p className="text-[10px] font-black uppercase tracking-widest">Sin accesorios registrados</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-8 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observaciones de Carrocería</label>
                    <textarea rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-[2.5rem] px-8 py-6 text-sm font-bold outline-none resize-none focus:ring-4 focus:ring-primary/10 transition-all" placeholder="Detalles de golpes, rayones, seguros, observaciones adicionales..." value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="pt-10 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-[2] py-5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-blue-500/20 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                  {isSaving ? 'Guardando...' : (editingVehicle ? 'Guardar Cambios' : 'Registrar Vehículo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

       {showPrintPreview && selectedForPrint && (
         <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
            <div className="p-4 bg-slate-900 flex justify-between items-center text-white sticky top-0 z-50 shadow-md no-print">
              <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/20 transition-all">Cerrar</button>
              <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Ficha PDF
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-10 flex justify-center">
               <div id="tech-sheet-printable" className="bg-white w-[21.59cm] min-h-[27.94cm] p-[1.5cm] shadow-2xl relative text-slate-900">
                
                 {/* Header Institucional */}
                 <div className="flex justify-between items-center mb-8 border-b-4 border-slate-900 pb-6">
                   <div className="flex items-center gap-6">
                     <img src="/images/logo-dif.png" alt="Logo" className="w-24 object-contain" />
                     <div className="flex flex-col">
                       <span className="text-lg font-black text-slate-900 uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia del Municipio de La Paz B.C.S.</span>
                       <span className="text-[8pt] font-bold uppercase text-slate-400 mt-2 tracking-[0.2em]">Parque Vehicular • Control Patrimonial</span>
                     </div>
                   </div>
                  <div className="text-right">
                    <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                        Ficha Técnica
                    </div>
                    <p className="text-xs font-bold text-slate-600">N° INVENTARIO: <span className="font-black text-slate-900 text-lg ml-1">{selectedForPrint.inventory || 'SIN ASIGNAR'}</span></p>
                    <p className="text-[9pt] text-slate-400 font-bold mt-1">Fecha de Emisión: {new Date().toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
                  </div>
                </div>
                
                {/* Datos Principales */}
                 <div className="mb-8 mt-6 break-inside-avoid">
                     <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                          <div className="border-b border-slate-200 pb-2">
                              <div className="text-[9pt] font-black text-slate-400 uppercase">Número Económico</div>
                              <div className="text-[16pt] font-black text-slate-900 tracking-widest">{selectedForPrint.economicNumber || '---'}</div>
                          </div>
                          <div className="border-b border-slate-200 pb-2">
                              <div className="text-[9pt] font-black text-slate-400 uppercase">Placas</div>
                              <div className="text-[16pt] font-black text-slate-900 tracking-widest">{selectedForPrint.plate}</div>
                          </div>
                          <div className="border-b border-slate-200 pb-2">
                              <div className="text-[9pt] font-black text-slate-400 uppercase">Marca/Línea</div>
                              <div className="text-[11pt] font-bold text-slate-900">{selectedForPrint.brand} {selectedForPrint.line}</div>
                          </div>
                         <div className="border-b border-slate-200 pb-2">
                             <div className="text-[9pt] font-black text-slate-400 uppercase">Modelo (Año)</div>
                             <div className="text-[11pt] font-bold text-slate-900">{selectedForPrint.year}</div>
                         </div>
                         <div className="border-b border-slate-200 pb-2">
                             <div className="text-[9pt] font-black text-slate-400 uppercase">Descripción</div>
                             <div className="text-[11pt] font-bold text-slate-900">{selectedForPrint.model}</div>
                         </div>
                         <div className="border-b border-slate-200 pb-2">
                             <div className="text-[9pt] font-black text-slate-400 uppercase">Serie VIN</div>
                             <div className="text-[11pt] font-bold text-slate-900 font-mono tracking-wider">{selectedForPrint.vin || '---'}</div>
                         </div>
                         <div className="border-b border-slate-200 pb-2">
                             <div className="text-[9pt] font-black text-slate-400 uppercase">Motor/Cilindros</div>
                             <div className="text-[11pt] font-bold text-slate-900">{selectedForPrint.cylinders} Cilindros / {selectedForPrint.fuelType}</div>
                         </div>
                         <div className="border-b border-slate-200 pb-2">
                             <div className="text-[9pt] font-black text-slate-400 uppercase">Color</div>
                             <div className="text-[11pt] font-bold text-slate-900">{selectedForPrint.color}</div>
                         </div>
                         <div className="border-b border-slate-200 pb-2">
                             <div className="text-[9pt] font-black text-slate-400 uppercase">Resguardo</div>
                             <div className="text-[11pt] font-bold text-slate-900">{drivers.find(d => d.id === selectedForPrint.assignedDriverId)?.name || 'SIN ASIGNAR'}</div>
                         </div>
                     </div>
                 </div>

                {/* Diagnostico Mecanico */}
                <div className="mb-8 break-inside-avoid">
                   <h4 className="bg-slate-900 text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">Estado General (16 Puntos)</h4>
                   <div className="grid grid-cols-4 gap-y-3 gap-x-6 border-2 border-slate-100 p-6 rounded-xl">
                      <ConditionPrint label="1. Motor" status={selectedForPrint.engineStatus} />
                      <ConditionPrint label="2. Transmisión" status={selectedForPrint.transmissionStatus} />
                      <ConditionPrint label="3. Clutch" status={selectedForPrint.clutchStatus} />
                      <ConditionPrint label="4. Frenos" status={selectedForPrint.brakesStatus} />
                      
                      <ConditionPrint label="5. Dirección" status={selectedForPrint.steeringStatus} />
                      <ConditionPrint label="6. Suspensión" status={selectedForPrint.suspensionStatus} />
                      <ConditionPrint label="7. Amortiguadores" status={selectedForPrint.shocksStatus} />
                      <ConditionPrint label="8. Llantas" status={selectedForPrint.tiresStatus} />
                      
                      <ConditionPrint label="9. Batería" status={selectedForPrint.batteryStatus} />
                      <ConditionPrint label="10. Luces" status={selectedForPrint.lightsStatus} />
                      <ConditionPrint label="11. Limpiadores" status={selectedForPrint.wipersStatus} />
                      <ConditionPrint label="12. Claxon" status={selectedForPrint.hornStatus} />
                      
                      <ConditionPrint label="13. Palanca Vel." status={selectedForPrint.shifterStatus} />
                      <ConditionPrint label="14. Velocímetro" status={selectedForPrint.speedoStatus} />
                      <ConditionPrint label="15. Medidor Temp." status={selectedForPrint.tempGaugeStatus} />
                      <ConditionPrint label="16. Medidor Aceite" status={selectedForPrint.oilGaugeStatus} />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10 break-inside-avoid">
                   <div className="space-y-2">
                      <h4 className="text-[9pt] font-black uppercase border-b-2 border-slate-200 pb-1 text-primary">Accesorios Registrados</h4>
                      <div className="bg-slate-50 p-4 rounded-lg min-h-[80px] border border-slate-100">
                        <p className="text-[8pt] font-bold text-slate-700 leading-relaxed uppercase">
                            {selectedForPrint.accessories_notes || 'SIN ACCESORIOS REGISTRADOS.'}
                        </p>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <h4 className="text-[9pt] font-black uppercase border-b-2 border-slate-200 pb-1 text-primary">Observaciones Generales</h4>
                      <div className="bg-slate-50 p-4 rounded-lg min-h-[80px] border border-slate-100">
                        <p className="text-[8pt] text-slate-600 leading-relaxed italic">{selectedForPrint.observations || 'Sin observaciones de carrocería o daños visibles.'}</p>
                      </div>
                   </div>
                </div>

                 <div className="signature-section">
                     <div className="grid grid-cols-2 gap-24 text-center">
                     <div className="border-t-2 border-slate-900 pt-4">
                         <p className="text-[9pt] font-black uppercase text-slate-900">{headOfMaterialsName || 'Jefe de Recursos Materiales'}</p>
                         <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">{headOfMaterialsPosition}</p>
                         <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Elaboró</p>
                     </div>
                     <div className="border-t-2 border-slate-900 pt-4">
                         <p className="text-[9pt] font-black uppercase text-slate-900">{directorName || 'Director General'}</p>
                         <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">{directorPosition}</p>
                         <p className="text-[7pt] font-bold text-slate-400 uppercase tracking-widest">Vo. Bo.</p>
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

// Helper Components
const StatusFilterBtn = ({ active, onClick, label, color }: any) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${active ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
    <div className={`size-2 rounded-full ${color}`}></div>
    {label}
  </button>
);

const TabBtn = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${active ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
    <span className="material-symbols-outlined text-sm">{icon}</span>
    {label}
  </button>
);

const InputField = ({ label, value, onChange, type = 'text', placeholder = '' }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
  </div>
);

const SelectField = ({ label, value, onChange, options }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all">
      {options.map((opt: any) => <option key={opt.v} value={opt.v}>{opt.l}</option>)}
    </select>
  </div>
);

const ConditionInput = ({ label, value, onChange }: any) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none">
      <option value="Bien">Bien</option>
      <option value="Regular">Regular</option>
      <option value="Mal">Mal</option>
    </select>
  </div>
);

const getStatusColorClass = (status: string) => {
  const s = (status || 'Bien').toUpperCase();
  if (s === 'BIEN') return 'bg-green-500';
  if (s === 'REGULAR') return 'bg-amber-500';
  if (s === 'MAL') return 'bg-orange-600';
  return 'bg-slate-300';
};

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

export default Vehicles;
