
import React, { useState, useMemo } from 'react';
import { Vehicle, Driver } from '../types';

interface VehiclesProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  searchQuery: string;
  onAddVehicle: (v: Omit<Vehicle, 'id'>) => Promise<void>;
  onUpdateVehicle: (v: Vehicle) => Promise<void>;
}

const Vehicles: React.FC<VehiclesProps> = ({ vehicles, drivers, searchQuery, onAddVehicle, onUpdateVehicle }) => {
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'technical' | 'condition' | 'accessories'>('general');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<Vehicle | null>(null);

  const [newAccessory, setNewAccessory] = useState('');
  const [accessoriesList, setAccessoriesList] = useState<string[]>([]);

  // Fix: explicitly type the status field to prevent narrowing to just 'active'
  const initialFormState = {
    plate: '', model: '', assignedDriverId: '', status: 'active' as Vehicle['status'], image: '',
    inventory: '', condition: 'Bueno', location: '', vin: '', odometer: '',
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
      const matchesSearch = v.plate?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           v.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           v.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           driver?.name?.toLowerCase().includes(searchQuery.toLowerCase());
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

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #tech-sheet-printable, #tech-sheet-printable * { visibility: visible; }
          #tech-sheet-printable { 
            position: absolute; left: 0; top: 0; width: 100%; padding: 0;
            background: white !important; font-family: 'Inter', sans-serif;
          }
          .no-print { display: none !important; }
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button onClick={() => setStatusFilter('todos')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'todos' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>Todos</button>
            <StatusFilterBtn active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} label="Activo" color="bg-green-500" />
            <StatusFilterBtn active={statusFilter === 'workshop'} onClick={() => setStatusFilter('workshop')} label="Taller" color="bg-amber-500" />
            <StatusFilterBtn active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')} label="Inactivo" color="bg-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unidad</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Placa</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Chofer Asignado</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map((vehicle) => {
                const driver = drivers.find(d => d.id === vehicle.assignedDriverId);
                return (
                  <tr key={vehicle.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                         <img src={vehicle.image} className="size-10 rounded-lg object-cover" />
                         <div>
                           <p className="font-black text-slate-900 tracking-tight">{vehicle.model}</p>
                           <p className="text-[10px] text-primary font-bold uppercase">{vehicle.brand} {vehicle.line}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-700">{vehicle.plate}</td>
                    <td className="px-6 py-4 text-center">
                       <span className="text-xs font-bold text-slate-600 uppercase">{driver?.name || '---'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handlePrint(vehicle)} className="size-9 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all flex items-center justify-center"><span className="material-symbols-outlined">file_present</span></button>
                        <button onClick={() => handleEdit(vehicle)} className="size-9 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-xl transition-all flex items-center justify-center"><span className="material-symbols-outlined">edit</span></button>
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
              <TabBtn active={activeTab === 'condition'} onClick={() => setActiveTab('condition')} label="Estado Mecánico" icon="health_and_safety" />
              <TabBtn active={activeTab === 'accessories'} onClick={() => setActiveTab('accessories')} label="Accesorios / Notas" icon="construction" />
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
                  <div className="space-y-4">
                    <InputField label="Placa / Matrícula" value={formData.plate} onChange={v => setFormData({...formData, plate: v})} placeholder="CF-66-803" />
                    <InputField label="Descripción / Nombre" value={formData.model} onChange={v => setFormData({...formData, model: v})} placeholder="Frontier Doble Cabina" />
                    <InputField label="Número de Inventario" value={formData.inventory} onChange={v => setFormData({...formData, inventory: v})} placeholder="1140000001139" />
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
                  <SelectField label="Combustible" value={formData.fuelType} onChange={v => setFormData({...formData, fuelType: v})} options={[{v:'Gasolina', l:'Gasolina'}, {v:'Diésel', l:'Diésel'}, {v:'Híbrido', l:'Híbrido'}]} />
                  <InputField label="Cilindros" value={formData.cylinders} onChange={v => setFormData({...formData, cylinders: v})} type="number" />
                  <div className="col-span-1 md:col-span-3">
                    <InputField label="Serie VIN" value={formData.vin} onChange={v => setFormData({...formData, vin: v})} />
                  </div>
                </div>
              )}

              {activeTab === 'condition' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-in slide-in-from-left-4">
                  <ConditionInput label="Motor" value={formData.engineStatus} onChange={v => setFormData({...formData, engineStatus: v})} />
                  <ConditionInput label="Clutch" value={formData.clutchStatus} onChange={v => setFormData({...formData, clutchStatus: v})} />
                  <ConditionInput label="Transmisión" value={formData.transmissionStatus} onChange={v => setFormData({...formData, transmissionStatus: v})} />
                  <ConditionInput label="Palanca Vel." value={formData.shifterStatus} onChange={v => setFormData({...formData, shifterStatus: v})} />
                  <ConditionInput label="Frenos" value={formData.brakesStatus} onChange={v => setFormData({...formData, brakesStatus: v})} />
                  <ConditionInput label="Dirección" value={formData.steeringStatus} onChange={v => setFormData({...formData, steeringStatus: v})} />
                  <ConditionInput label="Suspensión" value={formData.suspensionStatus} onChange={v => setFormData({...formData, suspensionStatus: v})} />
                  <ConditionInput label="Amortiguadores" value={formData.shocksStatus} onChange={v => setFormData({...formData, shocksStatus: v})} />
                  <ConditionInput label="Batería" value={formData.batteryStatus} onChange={v => setFormData({...formData, batteryStatus: v})} />
                  <ConditionInput label="Llantas" value={formData.tiresStatus} onChange={v => setFormData({...formData, tiresStatus: v})} />
                  <ConditionInput label="Luces" value={formData.lightsStatus} onChange={v => setFormData({...formData, lightsStatus: v})} />
                  <ConditionInput label="Claxon" value={formData.hornStatus} onChange={v => setFormData({...formData, hornStatus: v})} />
                  <ConditionInput label="Medidor Temp." value={formData.tempGaugeStatus} onChange={v => setFormData({...formData, tempGaugeStatus: v})} />
                  <ConditionInput label="Medidor Aceite" value={formData.oilGaugeStatus} onChange={v => setFormData({...formData, oilGaugeStatus: v})} />
                  <ConditionInput label="Limpiadores" value={formData.wipersStatus} onChange={v => setFormData({...formData, wipersStatus: v})} />
                  <ConditionInput label="Velocímetro" value={formData.speedoStatus} onChange={v => setFormData({...formData, speedoStatus: v})} />
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
        <div className="fixed inset-0 z-[200] bg-white flex flex-col no-print overflow-y-auto">
           <div className="p-4 bg-slate-900 flex justify-between items-center text-white sticky top-0 z-50">
             <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 px-4 py-2 rounded-lg font-bold text-xs">Cerrar</button>
             <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2">
               <span className="material-symbols-outlined text-sm">print</span> Imprimir Ficha Técnica
             </button>
           </div>
           <div className="flex-1 bg-slate-100 p-10 flex justify-center">
              <div id="tech-sheet-printable" className="bg-white w-[21.59cm] p-[1.5cm] shadow-2xl relative text-slate-900">
                <div className="flex justify-between items-start mb-10 border-b-2 border-slate-900 pb-8">
                  <div className="flex flex-col">
                    <span className="text-4xl font-black text-primary">DIF <span className="text-slate-900">LA PAZ</span></span>
                    <span className="text-[8pt] font-black uppercase text-slate-400 mt-1 tracking-widest">Control Patrimonial SMDIF La Paz v7.5</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black uppercase tracking-tight">Ficha Técnica de Control Vehicular</p>
                    <p className="text-sm font-bold">N° INVENTARIO: <span className="underline">{selectedForPrint.inventory || 'SIN ASIGNAR'}</span></p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-8 mb-8">
                   <div className="space-y-4">
                      <h4 className="bg-slate-900 text-white px-3 py-1.5 text-[8pt] font-black uppercase tracking-widest">Datos Generales</h4>
                      <DataRow label="Marca" value={selectedForPrint.brand} />
                      <DataRow label="Modelo (Año)" value={selectedForPrint.year} />
                      <DataRow label="Línea / Tipo" value={`${selectedForPrint.line || ''} ${selectedForPrint.type || ''}`} />
                      <DataRow label="Serie / VIN" value={selectedForPrint.vin} fontMono />
                      <DataRow label="Placas" value={selectedForPrint.plate} />
                   </div>
                   <div className="space-y-4">
                      <h4 className="bg-slate-900 text-white px-3 py-1.5 text-[8pt] font-black uppercase tracking-widest">Especificaciones</h4>
                      <DataRow label="Chofer Asignado" value={drivers.find(d => d.id === selectedForPrint.assignedDriverId)?.name || '---'} />
                      <DataRow label="Color" value={selectedForPrint.color} />
                      <DataRow label="Cilindros" value={selectedForPrint.cylinders} />
                      <DataRow label="Combustible" value={selectedForPrint.fuelType} />
                      <DataRow label="Kilometraje" value={`${(selectedForPrint.odometer || 0).toLocaleString()} KM`} />
                      <DataRow label="Ubicación" value={selectedForPrint.location} />
                   </div>
                </div>

                <div className="space-y-6 mb-8">
                   <h4 className="bg-slate-900 text-white px-3 py-1.5 text-[8pt] font-black uppercase tracking-widest">Diagnóstico Mecánico</h4>
                   <div className="grid grid-cols-3 gap-y-4 border p-6 rounded-xl border-slate-200">
                      <ConditionPrint label="Motor" status={selectedForPrint.engineStatus} />
                      <ConditionPrint label="Clutch" status={selectedForPrint.clutchStatus} />
                      <ConditionPrint label="Transmisión" status={selectedForPrint.transmissionStatus} />
                      <ConditionPrint label="Frenos" status={selectedForPrint.brakesStatus} />
                      <ConditionPrint label="Suspensión" status={selectedForPrint.suspensionStatus} />
                      <ConditionPrint label="Dirección" status={selectedForPrint.steeringStatus} />
                      <ConditionPrint label="Palanca Vel." status={selectedForPrint.shifterStatus} />
                      <ConditionPrint label="Amortiguadores" status={selectedForPrint.shocksStatus} />
                      <ConditionPrint label="Batería" status={selectedForPrint.batteryStatus} />
                      <ConditionPrint label="Llantas" status={selectedForPrint.tiresStatus} />
                      <ConditionPrint label="Luces" status={selectedForPrint.lightsStatus} />
                      <ConditionPrint label="Claxon" status={selectedForPrint.hornStatus} />
                      <ConditionPrint label="Medidor Temp." status={selectedForPrint.tempGaugeStatus} />
                      <ConditionPrint label="Medidor Aceite" status={selectedForPrint.oilGaugeStatus} />
                      <ConditionPrint label="Limpiadores" status={selectedForPrint.wipersStatus} />
                      <ConditionPrint label="Velocímetro" status={selectedForPrint.speedoStatus} />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10">
                   <div className="space-y-3">
                      <h4 className="text-[8pt] font-black uppercase border-b border-slate-100 pb-1 text-primary">Accesorios y Equipo</h4>
                      <p className="text-[8pt] font-bold text-slate-800 leading-relaxed uppercase">
                        {selectedForPrint.accessories_notes || 'SIN ACCESORIOS REGISTRADOS.'}
                      </p>
                   </div>
                   <div className="space-y-3">
                      <h4 className="text-[8pt] font-black uppercase border-b border-slate-100 pb-1">Observaciones</h4>
                      <p className="text-[7.5pt] text-slate-600 leading-relaxed italic">{selectedForPrint.observations || 'Sin daños visibles.'}</p>
                   </div>
                </div>

                <div className="mt-40 grid grid-cols-2 gap-24 text-center">
                  <div className="border-t-2 border-slate-900 pt-5">
                    <p className="text-xs font-black uppercase">Jefe de Recursos Materiales</p>
                    <p className="text-[8pt] font-bold opacity-50 mt-1">Firma y Sello Oficial</p>
                  </div>
                  <div className="border-t-2 border-slate-900 pt-5">
                    <p className="text-xs font-black uppercase">Encargado del Parque Vehicular</p>
                    <p className="text-[8pt] font-bold opacity-50 mt-1">Responsable Operativo</p>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// Helpers
const InputField = ({ label, value, onChange, placeholder = '', type = 'text' }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
    <input type={type} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

const SelectField = ({ label, value, onChange, options }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const getStatusColorClass = (status: string) => {
  const s = (status || 'Bien').toUpperCase();
  if (s === 'BIEN') return 'bg-green-500';
  if (s === 'REGULAR') return 'bg-amber-500';
  if (s === 'MAL') return 'bg-orange-600';
  if (s === 'MUY MAL') return 'bg-rose-700';
  return 'bg-slate-300';
};

const ConditionInput = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 ml-1">
       <div className={`size-2 rounded-full ${getStatusColorClass(value)}`}></div>
       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
    </div>
    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all" value={value} onChange={e => onChange(e.target.value)}>
      <option value="Bien">Bien</option>
      <option value="Regular">Regular</option>
      <option value="Mal">Mal</option>
      <option value="Muy Mal">Muy Mal</option>
    </select>
  </div>
);

const ConditionPrint = ({ label, status }) => {
  const colorClass = getStatusColorClass(status);
  return (
    <div className="flex items-center gap-2">
       <div className={`size-2 rounded-full ${colorClass}`}></div>
       <span className="text-[7.5pt] font-black uppercase text-slate-400 w-24 truncate">{label}:</span>
       <span className="text-[7.5pt] font-black text-slate-900 uppercase">{status || 'BIEN'}</span>
    </div>
  );
};

const DataRow = ({ label, value, fontMono = false }) => (
  <div className="flex justify-between border-b border-slate-100 pb-1">
    <span className="text-[8pt] font-black uppercase text-slate-400">{label}:</span>
    <span className={`text-[8.5pt] font-bold text-slate-900 ${fontMono ? 'font-mono' : ''}`}>{value || '---'}</span>
  </div>
);

const TabBtn = ({ active, onClick, label, icon }) => (
  <button onClick={onClick} className={`flex items-center gap-2 py-6 px-6 border-b-2 transition-all whitespace-nowrap ${active ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
    <span className="material-symbols-outlined text-xl">{icon}</span>
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const StatusFilterBtn = ({ label, color, onClick, active }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg bg-white border text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 ${active ? 'border-primary text-primary ring-2 ring-blue-500/10' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
    <span className={`size-2 ${color} rounded-full`}></span> {label}
  </button>
);

export default Vehicles;
