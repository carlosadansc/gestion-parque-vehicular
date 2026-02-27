
import React, { useMemo, useState } from 'react';
import { Driver, Vehicle, AppSetting } from '../types';

interface DriversProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  searchQuery: string;
  onAddDriver: (d: Omit<Driver, 'id'>) => Promise<void>;
  onUpdateDriver: (d: Driver) => Promise<void>;
  settings?: AppSetting[];
}

const Drivers: React.FC<DriversProps> = ({ drivers, vehicles, searchQuery, onAddDriver, onUpdateDriver, settings = [] }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

  const [formData, setFormData] = useState({
    name: '',
    licenseType: 'Tipo A',
    licenseNumber: '',
    phone: '',
    status: 'available' as 'available' | 'en-route' | 'on-break',
    assignedVehicleId: '',
    notes: ''
  });

  // Buscamos el vehículo asignado recorriendo la lista de vehículos (Fuente de verdad)
  const filteredDrivers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return drivers.filter((driver) => {
      const assignedVehicle = vehicles.find(v => v.assignedDriverId === driver.id) || vehicles.find(v => v.id === driver.assignedVehicleId);
      const matchesSearch = String(driver.name || '').toLowerCase().includes(query) ||
              String(assignedVehicle?.plate || '').toLowerCase().includes(query) ||
              String(assignedVehicle?.model || '').toLowerCase().includes(query) ||
              String(driver.phone || '').includes(query) ||
              String(driver.licenseType || '').toLowerCase().includes(query) ||
              String(driver.licenseNumber || '').includes(query);
      const matchesStatus = statusFilter === 'todos' || driver.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [drivers, vehicles, searchQuery, statusFilter]);

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      licenseType: driver.licenseType,
      licenseNumber: driver.licenseNumber || '',
      phone: driver.phone,
      status: driver.status,
      assignedVehicleId: driver.assignedVehicleId || '',
      notes: driver.notes || ''
    });
    setShowModal(true);
  };

  const handlePrintRequest = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowPrintPreview(true);
  };

  const handleOpenNew = () => {
    setEditingDriver(null);
    setFormData({
      name: '',
      licenseType: 'Tipo A',
      licenseNumber: '',
      phone: '',
      status: 'available',
      assignedVehicleId: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    setIsSaving(true);
    try {
      if (editingDriver) {
        await onUpdateDriver({
          ...editingDriver,
          ...formData
        });
      } else {
        await onAddDriver(formData);
      }

      setShowModal(false);
      setEditingDriver(null);
    } catch (error) {
      console.error("Error saving driver:", error);
      alert("Hubo un error al guardar el chofer.");
    } finally {
      setIsSaving(false);
    }
  };

  // Variables institucionales para impresión
  // Normalizar la ruta del logo (convertir rutas relativas a absolutas)
  const rawLogo = settingsMap['APP_LOGO'] || '/images/logo-dif.png';
  const appLogo = rawLogo.startsWith('./') ? rawLogo.replace('./', '/') : rawLogo;
  const managerName = settingsMap['VEHICLE_MANAGER_NAME'] || 'Encargado del Parque Vehicular';
  const managerPosition = settingsMap['VEHICLE_MANAGER_POS'] || 'Encargado del Parque Vehicular';
  const assignedVehicleForPrint = selectedDriver ? (vehicles.find(v => v.assignedDriverId === selectedDriver.id) || vehicles.find(v => v.id === selectedDriver.assignedVehicleId)) : null;

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500 pb-20">
      <style>{`
        @media print {
          body * { 
            visibility: hidden; 
          }
          #driver-printable, #driver-printable * { 
            visibility: visible; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #driver-printable { 
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
          @page { margin: 0.5cm; size: letter; }
          /* Ensure content fits on portrait page */
          #driver-printable img {
            max-width: 100% !important;
            height: auto !important;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="page-title">Directorio de Choferes</h2>
          <p className="page-subtitle">Gestión del personal operativo</p>
        </div>
        <button 
          onClick={handleOpenNew}
          className="btn btn-primary"
        >
          <span className="material-symbols-outlined">person_add</span>
          Nuevo Chofer
        </button>
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setStatusFilter('todos')} className={`filter-pill ${statusFilter === 'todos' ? 'filter-pill-active' : 'filter-pill-inactive'}`}>Todos</button>
            <button onClick={() => setStatusFilter('available')} className={`filter-pill ${statusFilter === 'available' ? 'filter-pill-success' : 'filter-pill-inactive'}`}>Disponible</button>
            <button onClick={() => setStatusFilter('en-route')} className={`filter-pill ${statusFilter === 'en-route' ? 'filter-pill-info' : 'filter-pill-inactive'}`}>En Ruta</button>
            <button onClick={() => setStatusFilter('off')} className={`filter-pill ${statusFilter === 'off' ? 'filter-pill-warning' : 'filter-pill-inactive'}`}>Descanso</button>
          </div>
          <span className="text-xs text-slate-500">{filteredDrivers.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="table-professional">
            <thead>
              <tr>
                <th>Chofer</th>
                <th>Licencia</th>
                <th>Contacto</th>
                <th>Vehículo</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => {
                const assignedVehicle = vehicles.find(v => v.assignedDriverId === driver.id) || vehicles.find(v => v.id === driver.assignedVehicleId);
                return (
                  <tr key={driver.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                          driver.status === 'available' ? 'bg-emerald-500' :
                          driver.status === 'en-route' ? 'bg-blue-500' :
                          'bg-amber-500'
                        }`}>
                          {driver.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-medium text-slate-900">{driver.name}</p>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-slate-600">{driver.licenseType}</span>
                      <p className="text-xs text-slate-400">{driver.licenseNumber}</p>
                    </td>
                    <td>
                      <span className="text-sm text-slate-600">{driver.phone}</span>
                    </td>
                    <td>
                      {assignedVehicle ? (
                        <div>
                          <p className="text-sm font-medium text-slate-700">{assignedVehicle.model}</p>
                          <p className="text-xs text-slate-400">{assignedVehicle.plate}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge ${
                        driver.status === 'available' ? 'badge-success' :
                        driver.status === 'en-route' ? 'badge-info' :
                        'badge-warning'
                      }`}>
                        {driver.status === 'available' ? 'Disponible' : driver.status === 'en-route' ? 'En Ruta' : 'Descanso'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handlePrintRequest(driver)} className="btn-icon text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" aria-label="Imprimir">
                          <span className="material-symbols-outlined" aria-hidden="true">file_present</span>
                        </button>
                        <button onClick={() => handleEdit(driver)} className="btn-icon text-slate-400 hover:text-primary hover:bg-blue-50" aria-label="Editar">
                          <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA AGREGAR/EDITAR CHOFER */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-xl w-full max-w-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" aria-hidden="true">badge</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingDriver ? 'Editar Chofer' : 'Nuevo Chofer'}
                  </h3>
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
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input 
                  required
                  disabled={isSaving}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-60"
                  placeholder="Ej. Juan Pérez"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Licencia</label>
                  <select 
                    disabled={isSaving}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-60"
                    value={formData.licenseType}
                    onChange={e => setFormData({...formData, licenseType: e.target.value})}
                  >
                    <option>Tipo A</option>
                    <option>Tipo B</option>
                    <option>Tipo C</option>
                    <option>Federal</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Número de Licencia</label>
                  <input 
                    disabled={isSaving}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-60"
                    placeholder="Ej. 12345678"
                    value={formData.licenseNumber}
                    onChange={e => setFormData({...formData, licenseNumber: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Teléfono de Contacto</label>
                <input 
                  required
                  disabled={isSaving}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-60"
                  placeholder="+52 00 0000 0000"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estado Operativo</label>
                  <select 
                    disabled={isSaving}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-60"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="available">Disponible</option>
                    <option value="en-route">En Ruta</option>
                    <option value="on-break">De Descanso</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vehículo Asignado</label>
                  <select 
                    disabled={isSaving}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-60"
                    value={formData.assignedVehicleId}
                    onChange={e => setFormData({...formData, assignedVehicleId: e.target.value})}
                  >
                    <option value="">--- Sin Asignar ---</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Notas u Observaciones (Opcional)</label>
                <textarea 
                  disabled={isSaving}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-60 resize-none min-h-[80px]"
                  placeholder="Escriba cualquier nota o observación relevante sobre el chofer..."
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  disabled={isSaving}
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-md transition-all disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] py-3 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-md hover:opacity-90 transition-all disabled:opacity-80 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                      Guardando...
                    </>
                  ) : (
                    editingDriver ? 'Actualizar Chofer' : 'Registrar Chofer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISTA PREVIA DE IMPRESIÓN (FICHA OPERADOR) */}
      {showPrintPreview && selectedDriver && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
           <div className="sticky top-0 bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg no-print">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/20 transition-all">Cerrar</button>
                <h3 className="font-black uppercase tracking-widest text-sm">Vista Previa</h3>
              </div>
              <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Ficha PDF
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-10 flex justify-center">
               <div id="driver-printable" className="bg-white w-[21.59cm] min-h-[27.94cm] p-[1.5cm] shadow-2xl relative text-slate-900">
                
                {/* Header Institucional */}
                <div className="flex justify-between items-center mb-10 border-b-4 border-slate-900 pb-6">
                  <div className="flex items-center gap-6">
                    <img src="/images/logo-dif.png" alt="Logo" className="w-24 object-contain" />
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-slate-900 uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                      <span className="text-lg font-black text-slate-900 uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                      <span className="text-[8pt] font-bold uppercase text-slate-400 mt-2 tracking-[0.2em]">Parque Vehicular • Recursos Humanos</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-slate-900 text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                        Ficha de Operador
                    </div>
                    <p className="text-xs font-bold text-slate-600">ID SISTEMA: <span className="font-black text-slate-900 text-lg ml-1">{(selectedDriver.id || '---').slice(-6).toUpperCase()}</span></p>
                    <p className="text-[9pt] text-slate-400 font-bold mt-1">Emisión: {new Date().toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
                  </div>
                </div>

                <div className="flex gap-10 mb-10">
                    {/* <div className="w-48 h-60 bg-slate-100 border border-slate-300 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={selectedDriver.image} className="w-full h-full object-cover" alt="Foto Operador" />
                    </div> */}
                    <div className="flex-1 space-y-6">
                        <div>
                            <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre del Operador</p>
                            <p className="text-3xl font-black text-slate-900 uppercase leading-tight border-b-2 border-slate-100 pb-2">{selectedDriver.name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo de Licencia</p>
                                <p className="text-lg font-bold text-slate-800 uppercase">{selectedDriver.licenseType}</p>
                            </div>
                            <div>
                                <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Número de Licencia</p>
                                <p className="text-lg font-bold text-slate-800 uppercase">{selectedDriver.licenseNumber || '---'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Teléfono</p>
                                <p className="text-lg font-bold text-slate-800">{selectedDriver.phone}</p>
                            </div>
                            <div>
                                <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Estado Actual</p>
                                <span className={`inline-block px-3 py-1 rounded border text-xs font-black uppercase tracking-widest ${
                                    selectedDriver.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    selectedDriver.status === 'en-route' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                    {selectedDriver.status === 'available' ? 'Disponible' : selectedDriver.status === 'en-route' ? 'En Ruta' : 'De Descanso'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                 <div className="mb-12">
                    <h4 className="bg-slate-900 text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">Asignación de Unidad</h4>
                    <div className="border-2 border-slate-100 rounded-xl p-6 bg-slate-50/50">
                       {assignedVehicleForPrint ? (
                           <div className="grid grid-cols-2 gap-8">
                               <div>
                                   <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Vehículo</p>
                                   <p className="text-xl font-black text-slate-900 uppercase">{assignedVehicleForPrint.model}</p>
                                   <p className="text-[10pt] font-bold text-primary uppercase mt-1">{assignedVehicleForPrint.brand} {assignedVehicleForPrint.line}</p>
                               </div>
                               <div className="text-right">
                                   <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Placas</p>
                                   <div className="inline-block border-4 border-slate-800 px-4 py-1 rounded bg-white">
                                       <p className="text-xl font-black text-slate-900 uppercase tracking-widest">{assignedVehicleForPrint.plate}</p>
                                   </div>
                               </div>
                           </div>
                       ) : (
                           <p className="text-center text-slate-400 font-bold uppercase py-4">Sin unidad asignada actualmente</p>
                       )}
                    </div>
                 </div>

                 {selectedDriver.notes && (
                 <div className="mb-12">
                    <h4 className="bg-slate-900 text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">Notas u Observaciones</h4>
                    <div className="border-2 border-slate-100 rounded-xl p-6 bg-slate-50/50">
                        <p className="text-[10pt] font-bold text-slate-700 leading-relaxed">{selectedDriver.notes}</p>
                    </div>
                 </div>
                 )}

                {/* Firmas */}
                <div className="absolute bottom-[1.5cm] left-[1.5cm] right-[1.5cm]">
                    <div className="grid grid-cols-2 gap-24 text-center">
                    <div className="border-t-2 border-slate-900 pt-4">
                        <p className="text-[9pt] font-black uppercase text-slate-900">{selectedDriver.name}</p>
                        <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Firma del Chofer</p>
                    </div>
                    <div className="border-t-2 border-slate-900 pt-4">
                        <p className="text-[9pt] font-black uppercase text-slate-900">{managerName}</p>
                        <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">{managerPosition}</p>
                        <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">VAlidó</p>
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

export default Drivers;
