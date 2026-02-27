
import React, { useState, useEffect, useMemo } from 'react';
import { View, Vehicle, Driver, FuelEntry, Incident, Planning, Area, TravelLog, MaintenanceRecord, AppSetting, User, VehicleInspection, MaintenanceType, Supplier } from './types';
import { VEHICLES as initialVehicles, DRIVERS as initialDrivers, INCIDENTS as initialIncidents, FUEL_HISTORY as initialFuel } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Vehicles from './components/Vehicles';
import Drivers from './components/Drivers';
import Fuel from './components/Fuel';
import Incidents from './components/Incidents';
import Settings from './components/Settings';
import PlanningComponent from './components/Planning';
import TravelLogs from './components/TravelLogs';
import Maintenance from './components/Maintenance';
import Inspections from './components/Inspections';
import Users from './components/Users';
import Reports from './components/Reports';
import { googleSheets } from './services/googleSheets';
import { verifyPassword } from './utils/password';

const DEFAULT_SETTINGS: AppSetting[] = [
  { key: 'APP_NAME', value: 'DIF La Paz Flota' },
  { key: 'PRIMARY_COLOR', value: '#9e1b32' },
  { key: 'SECONDARY_COLOR', value: '#0f172a' },
  { key: 'APP_LOGO', value: '/images/logo-dif.png' },
  { key: 'INSTITUTION_NAME', value: 'SISTEMA PARA EL DESARROLLO INTEGRAL DE LA FAMILIA' },
  { key: 'INSTITUTION_HEAD_NAME', value: 'Director General' },
  { key: 'INSTITUTION_HEAD_POS', value: 'DIRECTOR GENERAL DEL SMDIF LA PAZ' },
  { key: 'VEHICLE_MANAGER_NAME', value: 'ING. CARLOS ADÁN SÁNCHEZ CESEÑA' },
  { key: 'VEHICLE_MANAGER_POS', value: 'ENCARGADO DE PARQUE VEHICULAR' },
  { key: 'HEAD_OF_MATERIAL_RESOURCES', value: '' },
  { key: 'HEAD_OF_MATERIAL_RESOURCES_POS', value: 'JEFE DE RECURSOS MATERIALES' }
];

const DEFAULT_MAINTENANCE_TYPES: MaintenanceType[] = [
  { id: 'MT-1', name: 'Afinación Mayor' },
  { id: 'MT-2', name: 'Cambio de Aceite' },
  { id: 'MT-3', name: 'Llantas' },
  { id: 'MT-4', name: 'Frenos' },
  { id: 'MT-5', name: 'Suspensión' },
  { id: 'MT-6', name: 'Eléctrico' },
  { id: 'MT-7', name: 'Hojalatería y Pintura' },
  { id: 'MT-8', name: 'Reparación Mayor' },
];

const App: React.FC = () => {
  // Start with no user - show login screen
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const [currentView, setCurrentView] = useState<View>(View.REPORTS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>('pending');

  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>(initialFuel);
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [travelLogs, setTravelLogs] = useState<TravelLog[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>(DEFAULT_MAINTENANCE_TYPES);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inspections, setInspections] = useState<VehicleInspection[]>([]);
  const [appSettings, setAppSettings] = useState<AppSetting[]>(DEFAULT_SETTINGS);
  const [appUsers, setAppUsers] = useState<User[]>([]);

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    appSettings.forEach(s => { map[s.key] = s.value; });
    return map;
  }, [appSettings]);

  useEffect(() => {
    const primaryColor = settingsMap['PRIMARY_COLOR'] || '#9e1b32';
    const secondaryColor = settingsMap['SECONDARY_COLOR'] || '#0f172a';
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--secondary-color', secondaryColor);
  }, [settingsMap]);

  useEffect(() => {
    const savedUser = localStorage.getItem('fleet_pro_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (e) {
        localStorage.removeItem('fleet_pro_user');
      }
    }
    setIsLoading(false);
    
    // Auto-sync with Google Sheets on app start
    handleSync();
  }, []);

  const handleSync = async () => {
    const url = googleSheets.getServiceUrl();
    if (!url) return;
    setIsSyncing(true);
    setSyncStatus('pending');
    try {
      const data = await googleSheets.fetchData();
      if (data) {
        if (data.vehicles) setVehicles(data.vehicles);
        if (data.drivers) setDrivers(data.drivers);
        if (data.fuelEntries) setFuelEntries(data.fuelEntries);
        if (data.incidents) setIncidents(data.incidents);
        if (data.plannings) setPlannings(data.plannings);
        if (data.areas) setAreas(data.areas);
        if (data.travelLogs) setTravelLogs(data.travelLogs);
        if (data.maintenanceRecords) setMaintenanceRecords(data.maintenanceRecords);
        if (data.maintenanceTypes && data.maintenanceTypes.length > 0) setMaintenanceTypes(data.maintenanceTypes);
        if (data.suppliers && data.suppliers.length > 0) setSuppliers(data.suppliers);
        if (data.settings && data.settings.length > 0) setAppSettings(data.settings);
        if (data.users) setAppUsers(data.users);
        if (data.inspections) setInspections(data.inspections);
        setSyncStatus('synced');
      } else { setSyncStatus('error'); }
    } catch (err: any) { setSyncStatus('error'); } finally { setIsSyncing(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!loginUsername.trim() || !loginPass.trim()) {
      setLoginError('Por favor ingrese usuario y contraseña.');
      return;
    }
    
    setIsSyncing(true);
    try {
      const timestamp = new Date().toISOString();
      
      // Check against appUsers if available, otherwise use default admin
      let authenticatedUser: User | null = null;
      
      if (appUsers.length > 0) {
        // Validate against registered users (case-insensitive username)
        const foundUser = appUsers.find(u => 
          u.username.toLowerCase() === loginUsername.toLowerCase().trim()
        );
        
        if (foundUser && await verifyPassword(loginPass, foundUser.password || '') && foundUser.status === 'active') {
          authenticatedUser = { ...foundUser, lastLogin: timestamp };
        }
      } else {
        // Default admin login for initial setup
        if (loginUsername.toLowerCase() === 'admin' && loginPass === 'Macaco123') {
          authenticatedUser = { 
            id: 'USR-1',
            name: 'Super Administrador', 
            username: 'admin', 
            role: 'admin', 
            status: 'active',
            lastLogin: timestamp
          };
        }
      }
      
      if (authenticatedUser) {
        setCurrentUser(authenticatedUser);
        localStorage.setItem('fleet_pro_user', JSON.stringify(authenticatedUser));
        setIsSyncing(false);
        return;
      }

      setLoginError('Usuario o contraseña incorrectos.');
      setIsSyncing(false);
    } catch (err: any) { 
      setLoginError('Error de conexión o validación.'); 
      setIsSyncing(false);
    } 
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('fleet_pro_user');
    setCurrentView(View.DASHBOARD);
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    const updatedSettings = appSettings.map(s => s.key === key ? { ...s, value } : s);
    if (!appSettings.find(s => s.key === key)) { updatedSettings.push({ key, value }); }
    setAppSettings(updatedSettings);
    await googleSheets.pushData('update-setting', { key, value });
  };

  // --- VEHICLE HANDLERS WITH SYNC ---

  const handleAddVehicle = async (newVehicle: Omit<Vehicle, 'id'>) => {
    const formatted = { 
      ...newVehicle, 
      plate: newVehicle.plate.toUpperCase(), 
      model: newVehicle.model.toUpperCase() 
    };
    const vehicleWithId = { ...formatted, id: `V-${Date.now()}` };
    
    // 1. Guardar Vehículo
    setVehicles(prev => [vehicleWithId, ...prev]);
    await googleSheets.pushData('vehicle', vehicleWithId);

    // 2. Sincronizar Chofer (si se asignó uno)
    if (vehicleWithId.assignedDriverId) {
      const driverToUpdate = drivers.find(d => d.id === vehicleWithId.assignedDriverId);
      if (driverToUpdate) {
        const updatedDriver = { ...driverToUpdate, assignedVehicleId: vehicleWithId.id };
        setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d));
        await googleSheets.pushData('update-driver', updatedDriver);
      }
    }
  };

  const handleUpdateVehicle = async (updatedVehicle: Vehicle) => {
    const formatted = { 
      ...updatedVehicle, 
      plate: updatedVehicle.plate.toUpperCase(), 
      model: updatedVehicle.model.toUpperCase() 
    };

    // Obtenemos el estado anterior para comparar
    const oldVehicle = vehicles.find(v => v.id === formatted.id);
    const oldDriverId = oldVehicle?.assignedDriverId;
    const newDriverId = formatted.assignedDriverId;

    // 1. Actualizar Vehículo
    setVehicles(vehicles.map(v => v.id === formatted.id ? formatted : v));
    await googleSheets.pushData('update-vehicle', formatted);

    // 2. Sincronizar Choferes (si hubo cambio)
    if (oldDriverId !== newDriverId) {
      // A. Desvincular al chofer anterior (si existía)
      if (oldDriverId) {
        const oldDriver = drivers.find(d => d.id === oldDriverId);
        if (oldDriver) {
          const updatedOldDriver = { ...oldDriver, assignedVehicleId: '' };
          setDrivers(prev => prev.map(d => d.id === updatedOldDriver.id ? updatedOldDriver : d));
          await googleSheets.pushData('update-driver', updatedOldDriver);
        }
      }
      // B. Vincular al nuevo chofer (si se asignó)
      if (newDriverId) {
        const newDriver = drivers.find(d => d.id === newDriverId);
        if (newDriver) {
          const updatedNewDriver = { ...newDriver, assignedVehicleId: formatted.id };
          setDrivers(prev => prev.map(d => d.id === updatedNewDriver.id ? updatedNewDriver : d));
          await googleSheets.pushData('update-driver', updatedNewDriver);
        }
      }
    }
  };

  // --- DRIVER HANDLERS WITH SYNC ---

  const handleAddDriver = async (newDriver: Omit<Driver, 'id'>) => {
    const formatted = { 
      ...newDriver, 
      name: newDriver.name.toUpperCase(), 
      licenseType: newDriver.licenseType.toUpperCase(),
      licenseNumber: newDriver.licenseNumber || '',
      notes: newDriver.notes || ''
    };
    const driverWithId = { ...formatted, id: `D-${Date.now()}` };
    
    // 1. Guardar Chofer
    setDrivers(prev => [driverWithId, ...prev]);
    await googleSheets.pushData('driver', driverWithId);

    // 2. Sincronizar Vehículo (si se asignó uno)
    if (driverWithId.assignedVehicleId) {
      const vehicleToUpdate = vehicles.find(v => v.id === driverWithId.assignedVehicleId);
      if (vehicleToUpdate) {
        const updatedVehicle = { ...vehicleToUpdate, assignedDriverId: driverWithId.id };
        setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
        await googleSheets.pushData('update-vehicle', updatedVehicle);
      }
    }
  };

  const handleUpdateDriver = async (updatedDriver: Driver) => {
    const formatted = { 
      ...updatedDriver, 
      name: updatedDriver.name.toUpperCase(), 
      licenseType: updatedDriver.licenseType.toUpperCase(),
      licenseNumber: updatedDriver.licenseNumber || '',
      notes: updatedDriver.notes || ''
    };

    // Obtenemos estado anterior
    const oldDriver = drivers.find(d => d.id === formatted.id);
    const oldVehicleId = oldDriver?.assignedVehicleId;
    const newVehicleId = formatted.assignedVehicleId;

    // 1. Actualizar Chofer
    setDrivers(drivers.map(d => d.id === formatted.id ? formatted : d));
    await googleSheets.pushData('update-driver', formatted);

    // 2. Sincronizar Vehículos (si hubo cambio)
    if (oldVehicleId !== newVehicleId) {
      // A. Desvincular vehículo anterior
      if (oldVehicleId) {
        const oldVehicle = vehicles.find(v => v.id === oldVehicleId);
        if (oldVehicle) {
          const updatedOldVehicle = { ...oldVehicle, assignedDriverId: '' };
          setVehicles(prev => prev.map(v => v.id === updatedOldVehicle.id ? updatedOldVehicle : v));
          await googleSheets.pushData('update-vehicle', updatedOldVehicle);
        }
      }
      // B. Vincular nuevo vehículo
      if (newVehicleId) {
        const newVehicle = vehicles.find(v => v.id === newVehicleId);
        if (newVehicle) {
          const updatedNewVehicle = { ...newVehicle, assignedDriverId: formatted.id };
          setVehicles(prev => prev.map(v => v.id === updatedNewVehicle.id ? updatedNewVehicle : v));
          await googleSheets.pushData('update-vehicle', updatedNewVehicle);
        }
      }
    }
  };

  // --- OTHER HANDLERS ---

  const handleAddFuel = async (newFuel: Omit<FuelEntry, 'id'>) => {
    const fuelWithId = { 
      id: `F-${Date.now()}`,
      date: newFuel.date,
      vehicleId: newFuel.vehicleId,
      driverId: newFuel.driverId,
      liters: Number(newFuel.liters),
      cost: Number(newFuel.cost),
      odometer: Number(newFuel.odometer)
    };
    setFuelEntries([fuelWithId, ...fuelEntries]);
    await googleSheets.pushData('fuel', fuelWithId);
  };

  const handleUpdateFuel = async (updatedFuel: FuelEntry) => {
    setFuelEntries(fuelEntries.map(f => f.id === updatedFuel.id ? updatedFuel : f));
    await googleSheets.pushData('update-fuel', updatedFuel);
  };

  const handleAddIncident = async (newIncident: Omit<Incident, 'id'>) => {
    const formatted = { 
      ...newIncident, 
      title: newIncident.title.toUpperCase(), 
      description: newIncident.description.toUpperCase() 
    };
    const incidentWithId = { ...formatted, id: `I-${Date.now()}` };
    setIncidents([incidentWithId, ...incidents]);
    await googleSheets.pushData('incident', incidentWithId);
  };

  const handleUpdateIncident = async (updatedIncident: Incident) => {
    const formatted = { 
      ...updatedIncident, 
      title: updatedIncident.title.toUpperCase(), 
      description: updatedIncident.description.toUpperCase() 
    };
    setIncidents(incidents.map(i => i.id === formatted.id ? formatted : i));
    await googleSheets.pushData('update-incident', formatted);
  };

  const handleAddPlanning = async (newPlanning: Omit<Planning, 'id'>) => {
    const formatted = { 
      ...newPlanning, 
      notes: newPlanning.notes?.toUpperCase(),
      destination: newPlanning.destination?.toUpperCase()
    };
    const pWithId = { ...formatted, id: `P-${Date.now()}` };
    setPlannings([pWithId, ...plannings]);
    await googleSheets.pushData('planning', pWithId);
  };

  const handleUpdatePlanning = async (updatedPlanning: Planning) => {
    const formatted = { 
      ...updatedPlanning, 
      notes: updatedPlanning.notes?.toUpperCase(),
      destination: updatedPlanning.destination?.toUpperCase()
    };
    setPlannings(plannings.map(p => p.id === formatted.id ? formatted : p));
    await googleSheets.pushData('update-planning', formatted);
  };

  const handleAddArea = async (newArea: Omit<Area, 'id'>) => {
    const formatted = { 
      ...newArea, 
      name: newArea.name.toUpperCase(), 
      description: newArea.description?.toUpperCase() 
    };
    const aWithId = { ...formatted, id: `A-${Date.now()}` };
    setAreas([aWithId, ...areas]);
    await googleSheets.pushData('area', aWithId);
  };

  const handleDeleteArea = async (id: string) => {
    setAreas(areas.filter(a => a.id !== id));
    await googleSheets.pushData('delete-area', { id });
  };

  const handleAddTravelLog = async (newLog: Omit<TravelLog, 'id'>) => {
    const formatted = { 
      ...newLog, 
      destination: newLog.destination.toUpperCase(), 
      notes: newLog.notes?.toUpperCase() 
    };
    const logWithId = { ...formatted, id: `T-${Date.now()}` };
    setTravelLogs([logWithId, ...travelLogs]);
    await googleSheets.pushData('travel-log', logWithId);
  };

  const handleUpdateTravelLog = async (updatedLog: TravelLog) => {
    const formatted = { 
      ...updatedLog, 
      destination: updatedLog.destination.toUpperCase(), 
      notes: updatedLog.notes?.toUpperCase() 
    };
    setTravelLogs(travelLogs.map(t => t.id === formatted.id ? formatted : t));
    await googleSheets.pushData('update-travel-log', formatted);
  };

  const handleAddMaintenance = async (newRecord: Omit<MaintenanceRecord, 'id'>) => {
    const formatted = { 
      ...newRecord, 
      description: newRecord.description.toUpperCase(),
      quoteNumber: newRecord.quoteNumber.toUpperCase(),
      provider: newRecord.provider.toUpperCase(),
      invoiceNumber: newRecord.invoiceNumber?.toUpperCase()
    };
    const rWithId = { ...formatted, id: `M-${Date.now()}` };
    setMaintenanceRecords([rWithId, ...maintenanceRecords]);
    await googleSheets.pushData('maintenance', rWithId);
  };

  const handleUpdateMaintenance = async (updatedRecord: MaintenanceRecord) => {
    const formatted = { 
      ...updatedRecord, 
      description: updatedRecord.description.toUpperCase(),
      quoteNumber: updatedRecord.quoteNumber.toUpperCase(),
      provider: updatedRecord.provider.toUpperCase(),
      invoiceNumber: updatedRecord.invoiceNumber?.toUpperCase()
    };
    setMaintenanceRecords(maintenanceRecords.map(r => r.id === formatted.id ? formatted : r));
    await googleSheets.pushData('update-maintenance', formatted);
  };

  const handleAddMaintenanceType = async (name: string) => {
    const newType = { id: `MT-${Date.now()}`, name: name.toUpperCase() };
    setMaintenanceTypes([...maintenanceTypes, newType]);
    await googleSheets.pushData('maintenance-type', newType);
  };

  const handleAddSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    const newSupplier = { ...supplier, id: `SUP-${Date.now()}` };
    setSuppliers([...suppliers, newSupplier]);
    await googleSheets.pushData('supplier', newSupplier);
  };

  const handleAddUser = async (newUser: Omit<User, 'id'>) => {
    const formatted = { 
      ...newUser, 
      name: newUser.name.toUpperCase(), 
      username: newUser.username.toUpperCase() 
    };
    const userWithId = { ...formatted, id: `USR-${Date.now()}` };
    setAppUsers([userWithId, ...appUsers]);
    await googleSheets.pushData('user', userWithId);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    const formatted = { 
      ...updatedUser, 
      name: updatedUser.name.toUpperCase(), 
      username: updatedUser.username.toUpperCase() 
    };
    setAppUsers(appUsers.map(u => u.id === formatted.id ? formatted : u));
    await googleSheets.pushData('update-user', formatted);
  };

  const handleAddInspection = async (newInspection: Omit<VehicleInspection, 'id'>) => {
    const inspectionWithId = { ...newInspection, id: `INS-${Date.now()}` };
    setInspections([inspectionWithId, ...inspections]);
    await googleSheets.pushData('inspection' as any, inspectionWithId); 
  };

  const handleUpdateInspection = async (updatedInspection: VehicleInspection) => {
    setInspections(inspections.map(i => i.id === updatedInspection.id ? updatedInspection : i));
    await googleSheets.pushData('update-inspection' as any, updatedInspection); 
  };

  const renderContent = () => {
    switch (currentView) {
      case View.DASHBOARD: return <Dashboard vehicles={vehicles} drivers={drivers} fuelEntries={fuelEntries} incidents={incidents} />;
      case View.VEHICLES: return <Vehicles vehicles={vehicles} drivers={drivers} searchQuery={searchQuery} settings={appSettings} onAddVehicle={handleAddVehicle} onUpdateVehicle={handleUpdateVehicle} />;
       case View.DRIVERS: return <Drivers drivers={drivers} vehicles={vehicles} searchQuery={searchQuery} onAddDriver={handleAddDriver} onUpdateDriver={handleUpdateDriver} settings={appSettings} />;
       case View.FUEL: return <Fuel fuelHistory={fuelEntries} vehicles={vehicles} drivers={drivers} onAddFuel={handleAddFuel} onUpdateFuel={handleUpdateFuel} onSync={handleSync} settings={appSettings} />;
      case View.INCIDENTS: return <Incidents incidents={incidents} searchQuery={searchQuery} onAddIncident={handleAddIncident} onUpdateIncident={handleUpdateIncident} vehicles={vehicles} drivers={drivers} settings={appSettings} />;
      case View.MAINTENANCE: return <Maintenance records={maintenanceRecords} vehicles={vehicles} maintenanceTypes={maintenanceTypes} suppliers={suppliers} settings={appSettings} onAddRecord={handleAddMaintenance} onUpdateRecord={handleUpdateMaintenance} onAddMaintenanceType={handleAddMaintenanceType} onAddSupplier={handleAddSupplier} onSync={handleSync} />;
      case View.TRAVEL_LOGS: return <TravelLogs travelLogs={travelLogs} vehicles={vehicles} drivers={drivers} areas={areas} settings={appSettings} onAddTravelLog={handleAddTravelLog} onUpdateTravelLog={handleUpdateTravelLog} onSync={handleSync} />;
      case View.PLANNING: return <PlanningComponent plannings={plannings} vehicles={vehicles} drivers={drivers} areas={areas} onAddPlanning={handleAddPlanning} onUpdatePlanning={handleUpdatePlanning} onAddArea={handleAddArea} onDeleteArea={handleDeleteArea} settings={appSettings} />;
       case View.INSPECTIONS: return <Inspections inspections={inspections} vehicles={vehicles} onAddInspection={handleAddInspection} onUpdateInspection={handleUpdateInspection} currentUser={currentUser} settings={appSettings} />;
      case View.REPORTS: return <Reports vehicles={vehicles} fuelEntries={fuelEntries} maintenanceRecords={maintenanceRecords} incidents={incidents} settings={appSettings} />;
      case View.USERS: return <Users users={appUsers} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} currentUser={currentUser} />;
      case View.SETTINGS: return <Settings settings={appSettings} onUpdateSetting={handleUpdateSetting} onUrlChange={handleSync} />;
      default: return <Dashboard vehicles={vehicles} drivers={drivers} fuelEntries={fuelEntries} incidents={incidents} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-8">
          <div className="flex flex-col items-center mb-8">
            <img alt="DIF" className="w-14 h-14 object-contain mb-4" src="/images/logo-dif.png" />
            <h1 className="text-xl font-semibold text-slate-900">{settingsMap['APP_NAME'] || 'Flota Pro'}</h1>
            <p className="text-xs text-slate-500 mt-1">DIF La Paz - Control Vehicular</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Usuario</label>
              <input 
                type="text" 
                required 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                placeholder="admin" 
                value={loginUsername} 
                onChange={e => { setLoginUsername(e.target.value); setLoginError(''); }} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Contraseña</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="••••••••" 
                  value={loginPass} 
                  onChange={e => { setLoginPass(e.target.value); setLoginError(''); }} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            {loginError && <p className="text-red-500 text-xs text-center py-2">{loginError}</p>}
            <button type="submit" disabled={isSyncing} className="w-full bg-primary text-white py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity">
              {isSyncing ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar activeView={currentView} onViewChange={v => { setCurrentView(v); setSearchQuery(''); }} appName={settingsMap['APP_NAME'] || 'Flota Pro'} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={currentView.toUpperCase()} isSyncing={isSyncing} syncStatus={syncStatus} onSync={handleSync} view={currentView} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;
