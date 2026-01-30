
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

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

  const [formData, setFormData] = useState({
    name: '',
    licenseType: 'Tipo A',
    phone: '',
    status: 'available' as 'available' | 'en-route' | 'on-break',
    image: '',
    assignedVehicleId: ''
  });

  // Buscamos el vehículo asignado recorriendo la lista de vehículos (Fuente de verdad)
  const filteredDrivers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return drivers.filter((driver) => {
      const assignedVehicle = vehicles.find(v => v.assignedDriverId === driver.id) || vehicles.find(v => v.id === driver.assignedVehicleId);
      return driver.name?.toLowerCase().includes(query) ||
             assignedVehicle?.plate?.toLowerCase().includes(query) ||
             assignedVehicle?.model?.toLowerCase().includes(query) ||
             driver.phone?.includes(query) ||
             driver.licenseType?.toLowerCase().includes(query);
    });
  }, [drivers, vehicles, searchQuery]);

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      licenseType: driver.licenseType,
      phone: driver.phone,
      status: driver.status,
      image: driver.image,
      assignedVehicleId: driver.assignedVehicleId || ''
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
      phone: '',
      status: 'available',
      image: '',
      assignedVehicleId: ''
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
        await onAddDriver({
          ...formData,
          image: formData.image || `https://picsum.photos/seed/${formData.name}/200`
        });
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
  const directorName = settingsMap['INSTITUTION_HEAD_NAME'] || 'Director General';
  const managerName = settingsMap['VEHICLE_MANAGER_NAME'] || 'Encargado del Parque Vehicular';

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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Directorio de Choferes</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Gestión administrativa del personal operativo.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#135bec] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
          >
            <span className="material-symbols-outlined text-xl">person_add</span>
            Agregar Chofer
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm no-print">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-2">Filtrar por:</span>
        <select className="bg-slate-50 border-slate-200 text-[11px] font-black uppercase tracking-widest rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/10 min-w-[160px] text-slate-700 shadow-sm">
          <option>Todos los Estados</option>
          <option>Disponible</option>
          <option>En Ruta</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 no-print">
        {filteredDrivers.map((driver) => {
          // Buscamos si algún vehículo tiene este ID de chofer asignado (o el chofer tiene el ID del vehículo)
          const assignedVehicle = vehicles.find(v => v.assignedDriverId === driver.id) || vehicles.find(v => v.id === driver.assignedVehicleId);
          
          return (
            <div key={driver.id} className="group bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">
              <div className="absolute top-6 right-6 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => handlePrintRequest(driver)}
                    className="size-10 rounded-xl bg-white border border-slate-100 shadow-sm text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center"
                    title="Imprimir Ficha"
                >
                    <span className="material-symbols-outlined text-xl">file_present</span>
                </button>
                <button 
                    onClick={() => handleEdit(driver)}
                    className="size-10 rounded-xl bg-white border border-slate-100 shadow-sm text-slate-400 hover:text-[#135bec] hover:bg-blue-50 transition-all flex items-center justify-center"
                    title="Editar"
                >
                    <span className="material-symbols-outlined text-xl">edit</span>
                </button>
              </div>

              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="relative">
                    {/* <div className="size-20 rounded-3xl bg-slate-100 overflow-hidden border-2 border-white shadow-md ring-4 ring-slate-50 group-hover:ring-blue-500/10 transition-all">
                      <img src={driver.image} alt={driver.name} className="w-full h-full object-cover" />
                    </div> */}
                    <div className={`absolute -bottom-1 -right-1 size-6 border-4 border-white rounded-full ${
                      driver.status === 'available' ? 'bg-emerald-500' :
                      driver.status === 'en-route' ? 'bg-blue-500' :
                      'bg-amber-500'
                    }`}></div>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border ${
                    driver.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    driver.status === 'en-route' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {driver.status === 'available' ? 'Disponible' : driver.status === 'en-route' ? 'En Ruta' : 'De Descanso'}
                  </span>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-slate-900 font-black text-lg tracking-tight group-hover:text-[#135bec] transition-colors leading-tight">{driver.name}</h3>
                  <p className="text-[10px] font-black text-[#135bec]/80 mt-1 uppercase tracking-[0.2em]">{driver.licenseType}</p>
                </div>
                
                <div className="space-y-3.5 pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="material-symbols-outlined text-lg">local_shipping</span>
                    <span className="text-[11px] font-bold uppercase tracking-widest">
                      {assignedVehicle ? `${assignedVehicle.model} (${assignedVehicle.plate})` : 'Sin Unidad Asignada'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="material-symbols-outlined text-lg">call</span>
                    <span className="text-[11px] font-bold tracking-widest">{driver.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL PARA AGREGAR/EDITAR CHOFER */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {editingDriver ? 'Editar Perfil' : 'Nuevo Chofer'}
                </h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  Gestión de datos personales y operativos del conductor.
                </p>
              </div>
              <button 
                onClick={() => !isSaving && setShowModal(false)}
                disabled={isSaving}
                className="size-10 rounded-full hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-slate-400 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input 
                  required
                  disabled={isSaving}
                  className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-60"
                  placeholder="Ej. Juan Pérez"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Licencia</label>
                  <select 
                    disabled={isSaving}
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-60"
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Teléfono de Contacto</label>
                  <input 
                    required
                    disabled={isSaving}
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-60"
                    placeholder="+52 00 0000 0000"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estado Operativo</label>
                  <select 
                    disabled={isSaving}
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-60"
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
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-60"
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">URL de Foto (Opcional)</label>
                <input 
                  disabled={isSaving}
                  className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-60"
                  placeholder="https://..."
                  value={formData.image}
                  onChange={e => setFormData({...formData, image: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  disabled={isSaving}
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-2xl transition-all disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] py-4 bg-[#135bec] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-80 flex items-center justify-center gap-3"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                      Guardando...
                    </>
                  ) : (
                    editingDriver ? 'Actualizar Perfil' : 'Registrar Chofer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISTA PREVIA DE IMPRESIÓN (FICHA OPERADOR) */}
      {showPrintPreview && selectedDriver && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col no-print overflow-y-auto">
           <div className="sticky top-0 bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg">
             <div className="flex items-center gap-4">
               <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/20 transition-all">Cerrar</button>
               <h3 className="font-black uppercase tracking-widest text-sm">Vista Previa</h3>
             </div>
             <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
               <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Ficha PDF
             </button>
           </div>
           <div className="flex-1 bg-slate-100 p-10 flex justify-center">
              <div id="driver-printable" className="bg-white w-[21.59cm] min-h-[27.94cm] p-[1.5cm] shadow-2xl relative text-slate-900 border border-slate-200">
                
                {/* Header Institucional */}
                <div className="flex justify-between items-center mb-10 border-b-4 border-slate-900 pb-6">
                  <div className="flex items-center gap-6">
                    <img src={appLogo} alt="Logo" className="w-24 object-contain" />
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
                                <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-1">Teléfono</p>
                                <p className="text-lg font-bold text-slate-800">{selectedDriver.phone}</p>
                            </div>
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

                {/* Firmas */}
                <div className="absolute bottom-[1.5cm] left-[1.5cm] right-[1.5cm]">
                    <div className="grid grid-cols-2 gap-24 text-center">
                    <div className="border-t-2 border-slate-900 pt-4">
                        <p className="text-[9pt] font-black uppercase text-slate-900">{selectedDriver.name}</p>
                        <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Firma del Operador</p>
                    </div>
                    <div className="border-t-2 border-slate-900 pt-4">
                        <p className="text-[9pt] font-black uppercase text-slate-900">{managerName}</p>
                        <p className="text-[7pt] font-bold text-slate-400 mt-1 uppercase tracking-widest">Autorización</p>
                    </div>
                    </div>
                    <div className="text-center mt-8 border-t border-slate-200 pt-2">
                        <p className="text-[7pt] font-black text-slate-300 uppercase tracking-[0.3em]">Sistema de Control Flota Pro • DIF Municipal La Paz</p>
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
