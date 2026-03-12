
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Vehicle, Driver, FuelEntry, FuelAcquisition, Incident, Planning, Area, TravelLog, MaintenanceRecord, AppSetting, User, VehicleInspection, MaintenanceType, Supplier } from './types';
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

const VEHICLE_STATUS_SET = new Set<Vehicle['status']>(['active', 'workshop', 'inactive']);
const DRIVER_STATUS_SET = new Set<Driver['status']>(['available', 'en-route', 'on-break']);
const INCIDENT_TYPE_SET = new Set<Incident['type']>(['mechanical', 'traffic', 'accident', 'theft']);
const INCIDENT_STATUS_SET = new Set<Incident['status']>(['critical', 'pending', 'resolved', 'in-workshop', 'in-resolution']);
const PLANNING_STATUS_SET = new Set<NonNullable<Planning['status']>>(['scheduled', 'completed', 'cancelled']);
const MAINTENANCE_STATUS_SET = new Set<MaintenanceRecord['status']>(['scheduled', 'in-progress', 'completed', 'cancelled']);
const MAINTENANCE_PAYMENT_METHOD_SET = new Set<NonNullable<MaintenanceRecord['paymentMethod']>>(['transferencia', 'efectivo']);
const USER_ROLE_SET = new Set<User['role']>(['admin', 'operator', 'viewer']);
const USER_STATUS_SET = new Set<User['status']>(['active', 'inactive']);

const hasText = (value?: string | null): boolean => typeof value === 'string' && value.trim().length > 0;
const hasValue = (value: unknown): boolean => value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');
const isFiniteNumber = (value: unknown): boolean => Number.isFinite(Number(value));
const normalizeCatalogName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const ensure = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(message);
};

const isValidDateValue = (value?: string): boolean => {
  if (!hasText(value)) return false;
  return !Number.isNaN(new Date(value as string).getTime());
};

const isValidTimeValue = (value?: string): boolean => {
  if (!hasText(value)) return false;
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value as string)) return true;
  return isValidDateValue(value);
};

const validateVehiclePayload = (vehicle: Omit<Vehicle, 'id'> | Vehicle, driverList: Driver[]) => {
  ensure(hasText(vehicle.plate), 'La placa es obligatoria.');
  ensure(hasText(vehicle.model), 'El modelo es obligatorio.');
  ensure(VEHICLE_STATUS_SET.has(vehicle.status), 'El estado del vehiculo no es valido.');

  if (hasText(vehicle.assignedDriverId)) {
    ensure(driverList.some(d => d.id === vehicle.assignedDriverId), 'El chofer asignado no existe.');
  }

  if (hasValue(vehicle.odometer)) {
    ensure(isFiniteNumber(vehicle.odometer), 'El odometro debe ser un numero valido.');
    ensure(Number(vehicle.odometer) >= 0, 'El odometro no puede ser negativo.');
  }

  if (hasValue(vehicle.year) && Number(vehicle.year) > 0) {
    const year = Number(vehicle.year);
    const maxYear = new Date().getFullYear() + 1;
    ensure(year >= 1900 && year <= maxYear, `El ano debe estar entre 1900 y ${maxYear}.`);
  }
};

const validateDriverPayload = (driver: Omit<Driver, 'id'> | Driver, vehicleList: Vehicle[]) => {
  ensure(hasText(driver.name), 'El nombre del chofer es obligatorio.');
  ensure(hasText(driver.phone), 'El telefono del chofer es obligatorio.');
  ensure(DRIVER_STATUS_SET.has(driver.status), 'El estado del chofer no es valido.');

  const phoneDigits = (driver.phone || '').replace(/\D/g, '');
  ensure(phoneDigits.length >= 7, 'El telefono del chofer no es valido.');

  if (hasText(driver.assignedVehicleId)) {
    ensure(vehicleList.some(v => v.id === driver.assignedVehicleId), 'El vehiculo asignado no existe.');
  }
};

const validateFuelPayload = (entry: Omit<FuelEntry, 'id'> | FuelEntry, vehicleList: Vehicle[], driverList: Driver[]) => {
  ensure(isValidDateValue(entry.date), 'La fecha de combustible no es valida.');
  ensure(hasText(entry.vehicleId) && vehicleList.some(v => v.id === entry.vehicleId), 'Debes seleccionar un vehiculo valido.');
  ensure(hasText(entry.driverId) && driverList.some(d => d.id === entry.driverId), 'Debes seleccionar un chofer valido.');
  ensure(isFiniteNumber(entry.liters) && Number(entry.liters) > 0, 'Los litros deben ser mayores a 0.');
  ensure(isFiniteNumber(entry.cost) && Number(entry.cost) >= 0, 'El costo debe ser un numero valido.');
  ensure(isFiniteNumber(entry.odometer) && Number(entry.odometer) >= 0, 'El odometro debe ser un numero valido.');
};

const validateFuelAcquisitionPayload = (entry: Omit<FuelAcquisition, 'id'> | FuelAcquisition) => {
  ensure(isValidDateValue(entry.date), 'La fecha de adquisicion no es valida.');
  ensure(isValidDateValue(entry.validFrom), 'La fecha inicial de vigencia no es valida.');
  ensure(isValidDateValue(entry.validTo), 'La fecha final de vigencia no es valida.');
  ensure(new Date(entry.validFrom).getTime() <= new Date(entry.validTo).getTime(), 'La fecha final no puede ser menor a la inicial.');
  ensure(hasText(entry.description), 'La descripcion de la adquisicion es obligatoria.');
  ensure(hasText(entry.area), 'El area destino es obligatoria.');
  ensure(hasText(entry.supplier), 'El proveedor es obligatorio.');
  ensure(isFiniteNumber(entry.amount) && Number(entry.amount) > 0, 'El monto debe ser mayor a 0.');
  if (hasValue(entry.consecutiveNumber)) {
    ensure(Number.isInteger(Number(entry.consecutiveNumber)) && Number(entry.consecutiveNumber) > 0, 'El consecutivo debe ser un entero positivo.');
  }
};

const validateIncidentPayload = (incident: Omit<Incident, 'id'> | Incident, vehicleList: Vehicle[], driverList: Driver[]) => {
  ensure(INCIDENT_TYPE_SET.has(incident.type), 'El tipo de incidencia no es valido.');
  ensure(INCIDENT_STATUS_SET.has(incident.status), 'El estado de la incidencia no es valido.');
  ensure(hasText(incident.title), 'El titulo de la incidencia es obligatorio.');
  ensure(hasText(incident.description), 'La descripcion de la incidencia es obligatoria.');
  ensure(isValidDateValue(incident.date), 'La fecha de incidencia no es valida.');
  ensure(hasText(incident.vehicleId) && vehicleList.some(v => v.id === incident.vehicleId), 'Debes seleccionar un vehiculo valido.');
  ensure(hasText(incident.driverId) && driverList.some(d => d.id === incident.driverId), 'Debes seleccionar un chofer valido.');
};

const validatePlanningPayload = (planning: Omit<Planning, 'id'> | Planning, vehicleList: Vehicle[], driverList: Driver[], areaList: Area[]) => {
  ensure(isValidDateValue(planning.date), 'La fecha de planeacion no es valida.');
  ensure(hasText(planning.vehicleId) && vehicleList.some(v => v.id === planning.vehicleId), 'Debes seleccionar un vehiculo valido.');
  ensure(hasText(planning.driverId) && driverList.some(d => d.id === planning.driverId), 'Debes seleccionar un chofer valido.');
  ensure(hasText(planning.areaId) && areaList.some(a => a.id === planning.areaId), 'Debes seleccionar un area valida.');

  if (hasText(planning.departureTime)) ensure(isValidTimeValue(planning.departureTime), 'La hora de salida no es valida.');
  if (hasText(planning.arrivalTime)) ensure(isValidTimeValue(planning.arrivalTime), 'La hora de llegada no es valida.');
  if (planning.status) ensure(PLANNING_STATUS_SET.has(planning.status), 'El estado de la planeacion no es valido.');
};

const validateAreaPayload = (area: Omit<Area, 'id'> | Area) => {
  ensure(hasText(area.name), 'El nombre del area es obligatorio.');
};

const validateTravelLogPayload = (log: Omit<TravelLog, 'id'> | TravelLog, vehicleList: Vehicle[], driverList: Driver[], areaList: Area[]) => {
  ensure(isValidDateValue(log.date), 'La fecha de bitacora no es valida.');
  ensure(hasText(log.departureTime) && isValidTimeValue(log.departureTime), 'La hora de salida es obligatoria y debe ser valida.');
  if (hasText(log.arrivalTime)) ensure(isValidTimeValue(log.arrivalTime), 'La hora de llegada no es valida.');
  ensure(hasText(log.vehicleId) && vehicleList.some(v => v.id === log.vehicleId), 'Debes seleccionar un vehiculo valido.');
  ensure(hasText(log.driverId) && driverList.some(d => d.id === log.driverId), 'Debes seleccionar un chofer valido.');
  ensure(hasText(log.areaId) && areaList.some(a => a.id === log.areaId), 'Debes seleccionar un area valida.');
  ensure(hasText(log.destination), 'El destino es obligatorio.');
  ensure(isFiniteNumber(log.initialOdometer) && Number(log.initialOdometer) >= 0, 'El odometro inicial no es valido.');
  ensure(isFiniteNumber(log.finalOdometer) && Number(log.finalOdometer) >= 0, 'El odometro final no es valido.');

  const initialOdometer = Number(log.initialOdometer);
  const finalOdometer = Number(log.finalOdometer);
  if (finalOdometer > 0) {
    ensure(finalOdometer >= initialOdometer, 'El odometro final no puede ser menor al inicial.');
  }

  if (hasValue(log.initialFuelLevel)) {
    const initialFuelLevel = Number(log.initialFuelLevel);
    ensure(isFiniteNumber(initialFuelLevel) && initialFuelLevel >= 0 && initialFuelLevel <= 100, 'El nivel inicial de combustible debe estar entre 0 y 100.');
  }
  if (hasValue(log.finalFuelLevel)) {
    const finalFuelLevel = Number(log.finalFuelLevel);
    ensure(isFiniteNumber(finalFuelLevel) && finalFuelLevel >= 0 && finalFuelLevel <= 100, 'El nivel final de combustible debe estar entre 0 y 100.');
  }
};

const validateMaintenancePayload = (record: Omit<MaintenanceRecord, 'id'> | MaintenanceRecord, vehicleList: Vehicle[]) => {
  ensure(isValidDateValue(record.date), 'La fecha del mantenimiento no es valida.');
  ensure(hasText(record.provider), 'El proveedor es obligatorio.');
  ensure(hasText(record.description), 'La descripcion del mantenimiento es obligatoria.');
  ensure(isFiniteNumber(record.quoteCost) && Number(record.quoteCost) >= 0, 'El costo cotizado debe ser un numero valido.');
  ensure(MAINTENANCE_STATUS_SET.has(record.status), 'El estado del mantenimiento no es valido.');
  ensure(isValidDateValue(record.entryDate), 'La fecha/hora de ingreso no es valida.');
  if (hasText(record.exitDate)) ensure(isValidDateValue(record.exitDate), 'La fecha/hora de salida no es valida.');
  if (hasText(record.estimatedDeliveryDate)) ensure(isValidDateValue(record.estimatedDeliveryDate), 'La fecha estimada de entrega no es valida.');
  ensure(hasText(record.vehicleId) && vehicleList.some(v => v.id === record.vehicleId), 'Debes seleccionar un vehiculo valido.');
  ensure(isFiniteNumber(record.odometer) && Number(record.odometer) >= 0, 'El odometro debe ser un numero valido.');
  if (hasText(record.paymentMethod)) {
    ensure(
      MAINTENANCE_PAYMENT_METHOD_SET.has(record.paymentMethod as NonNullable<MaintenanceRecord['paymentMethod']>),
      'El metodo de pago del mantenimiento no es valido.'
    );
  }

  if (hasValue(record.invoiceAmount)) {
    ensure(isFiniteNumber(record.invoiceAmount), 'El monto de factura debe ser un numero valido.');
    ensure(Number(record.invoiceAmount) >= 0, 'El monto de factura no puede ser negativo.');
  }
};

const validateSupplierPayload = (supplier: Omit<Supplier, 'id'> | Supplier) => {
  ensure(hasText(supplier.name), 'El nombre del proveedor es obligatorio.');
  if (hasText(supplier.email)) {
    const email = (supplier.email || '').trim();
    ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'El correo del proveedor no es valido.');
  }
  if (hasText(supplier.phone)) {
    const phoneDigits = (supplier.phone || '').replace(/\D/g, '');
    ensure(phoneDigits.length >= 7, 'El telefono del proveedor no es valido.');
  }
};

const validateUserPayload = (user: Omit<User, 'id'> | User, currentUsers: User[], currentUserId?: string) => {
  ensure(hasText(user.name), 'El nombre del usuario es obligatorio.');
  ensure(hasText(user.username), 'El nombre de usuario es obligatorio.');
  ensure(USER_ROLE_SET.has(user.role), 'El rol del usuario no es valido.');
  ensure(USER_STATUS_SET.has(user.status), 'El estado del usuario no es valido.');

  if (!currentUserId) {
    ensure(hasText(user.password), 'La contrasena es obligatoria para nuevos usuarios.');
  }
  if (hasText(user.password)) {
    ensure((user.password as string).trim().length >= 8, 'La contrasena debe tener al menos 8 caracteres.');
  }

  const normalizedUsername = (user.username || '').trim().toLowerCase();
  const usernameExists = currentUsers.some(existing => {
    if (currentUserId && existing.id === currentUserId) return false;
    return (existing.username || '').trim().toLowerCase() === normalizedUsername;
  });
  ensure(!usernameExists, 'El nombre de usuario ya esta registrado.');
};

const validateInspectionPayload = (inspection: Omit<VehicleInspection, 'id'> | VehicleInspection, vehicleList: Vehicle[]) => {
  ensure(isValidDateValue(inspection.date), 'La fecha de revision no es valida.');
  ensure(hasText(inspection.vehicleId) && vehicleList.some(v => v.id === inspection.vehicleId), 'Debes seleccionar un vehiculo valido.');
  ensure(hasText(inspection.inspectorName), 'El nombre del inspector es obligatorio.');
  ensure(isFiniteNumber(inspection.odometer) && Number(inspection.odometer) >= 0, 'El odometro de revision debe ser un numero valido.');
};

const stripPasswordFromUser = (user: User): User => {
  const { password: _password, ...sessionUser } = user;
  return sessionUser;
};

const App: React.FC = () => {
  type ToastType = 'success' | 'error' | 'info';
  type ToastItem = { id: number; type: ToastType; message: string };

  // Start with no user - show login screen
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [setupError, setSetupError] = useState('');
  const [serviceUrlInput, setServiceUrlInput] = useState(googleSheets.getServiceUrl());
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapForm, setBootstrapForm] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  
  const [currentView, setCurrentView] = useState<View>(View.REPORTS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>('pending');

  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>(initialFuel);
  const [fuelAcquisitions, setFuelAcquisitions] = useState<FuelAcquisition[]>([]);
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [travelLogs, setTravelLogs] = useState<TravelLog[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>(DEFAULT_MAINTENANCE_TYPES);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inspections, setInspections] = useState<VehicleInspection[]>([]);
  const [appSettings, setAppSettings] = useState<AppSetting[]>(DEFAULT_SETTINGS);
  const [appUsers, setAppUsers] = useState<User[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, type: ToastType = 'info', durationMs = 3000) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, type, message: trimmed }]);
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, durationMs);
  }, []);

  const getErrorMessage = useCallback((error: unknown, fallback: string) => {
    if (error instanceof Error && hasText(error.message)) return error.message;
    return fallback;
  }, []);

  const executeWithToast = useCallback(async (
    action: () => Promise<void>,
    successMessage: string,
    fallbackErrorMessage: string
  ) => {
    try {
      await action();
      pushToast(successMessage, 'success');
    } catch (error) {
      pushToast(getErrorMessage(error, fallbackErrorMessage), 'error', 4200);
      throw error;
    }
  }, [getErrorMessage, pushToast]);

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
        const sessionUser = stripPasswordFromUser(user);
        setCurrentUser(sessionUser);
        localStorage.setItem('fleet_pro_user', JSON.stringify(sessionUser));
      } catch (e) {
        localStorage.removeItem('fleet_pro_user');
      }
    }
    setIsLoading(false);
    
    // Auto-sync with Google Sheets on app start
    handleSync();
  }, []);

  const handleSync = async (): Promise<boolean> => {
    const url = googleSheets.getServiceUrl();
    if (!url) return false;
    setIsSyncing(true);
    setSyncStatus('pending');
    try {
      const data = await googleSheets.fetchData();
      if (data) {
        if (data.vehicles) setVehicles(data.vehicles);
        if (data.drivers) setDrivers(data.drivers);
        if (data.fuelEntries) setFuelEntries(data.fuelEntries);
        if (data.fuelAcquisitions) setFuelAcquisitions(data.fuelAcquisitions);
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
        return true;
      }
      setSyncStatus('error');
      return false;
    } catch (err: any) {
      setSyncStatus('error');
      return false;
    } finally { setIsSyncing(false); }
  };

  const handleSyncWithToast = useCallback(async () => {
    const synced = await handleSync();
    pushToast(
      synced ? 'Sincronizacion completada.' : 'No se pudo sincronizar con Google Sheets.',
      synced ? 'success' : 'error'
    );
  }, [pushToast, handleSync]);

  const saveServiceUrlFromLogin = () => {
    const trimmedUrl = serviceUrlInput.trim();
    if (!trimmedUrl) {
      setLoginError('Captura la URL de Google Apps Script.');
      return false;
    }
    googleSheets.setServiceUrl(trimmedUrl);
    setServiceUrlInput(trimmedUrl);
    if (!googleSheets.isValidScriptUrl()) {
      setLoginError('La URL debe contener script.google.com/macros/s/.../exec.');
      return false;
    }
    setLoginError('');
    return true;
  };

  const handleBootstrapAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    setLoginError('');

    if (appUsers.length > 0) {
      setSetupError('Ya hay usuarios registrados. Inicia sesion con una cuenta existente.');
      return;
    }

    if (!saveServiceUrlFromLogin()) return;

    const name = bootstrapForm.name.trim();
    const username = bootstrapForm.username.trim();
    const password = bootstrapForm.password;
    const confirmPassword = bootstrapForm.confirmPassword;

    if (!name || !username || !password) {
      setSetupError('Nombre, usuario y contrasena son obligatorios.');
      return;
    }
    if (password.length < 8) {
      setSetupError('La contrasena debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setSetupError('La confirmacion de contrasena no coincide.');
      return;
    }

    const exists = appUsers.some(u => (u.username || '').trim().toLowerCase() === username.toLowerCase());
    if (exists) {
      setSetupError('El nombre de usuario ya existe.');
      return;
    }

    setIsBootstrapping(true);
    try {
      const timestamp = new Date().toISOString();
      const adminUser: User = {
        id: `USR-${Date.now()}`,
        name: name.toUpperCase(),
        username: username.toUpperCase(),
        password,
        role: 'admin',
        status: 'active',
        lastLogin: timestamp
      };

      const saved = await googleSheets.pushData('user', adminUser);
      if (!saved) {
        throw new Error('No se pudo crear el administrador inicial en Google Sheets.');
      }

      const sessionUser = stripPasswordFromUser(adminUser);
      setCurrentUser(sessionUser);
      localStorage.setItem('fleet_pro_user', JSON.stringify(sessionUser));
      setBootstrapForm({ name: '', username: '', password: '', confirmPassword: '' });
      void handleSync();
      pushToast('Administrador inicial creado correctamente.', 'success');
    } catch (error) {
      setSetupError(getErrorMessage(error, 'No se pudo crear el administrador inicial.'));
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setSetupError('');

    if (!loginUsername.trim() || !loginPass.trim()) {
      setLoginError('Por favor ingrese usuario y contrasena.');
      return;
    }

    if (!saveServiceUrlFromLogin()) return;

    setIsSyncing(true);
    try {
      const timestamp = new Date().toISOString();
      let authenticatedUser: User | null = null;
      let usersSnapshot = appUsers;

      if (usersSnapshot.length === 0) {
        try {
          const data = await googleSheets.fetchData();
          if (data?.users) {
            usersSnapshot = data.users;
            setAppUsers(data.users);
          }
        } catch (_) {
          // Keep actionable message below
        }
      }

      if (usersSnapshot.length === 0) {
        setLoginError('No hay usuarios registrados. Crea el administrador inicial.');
        setIsSyncing(false);
        return;
      }

      const foundUser = usersSnapshot.find(u =>
        u.username.toLowerCase() === loginUsername.toLowerCase().trim()
      );

      if (foundUser && hasText(foundUser.password) && await verifyPassword(loginPass, foundUser.password || '') && foundUser.status === 'active') {
        authenticatedUser = stripPasswordFromUser({ ...foundUser, lastLogin: timestamp });
      }

      if (authenticatedUser) {
        setCurrentUser(authenticatedUser);
        localStorage.setItem('fleet_pro_user', JSON.stringify(authenticatedUser));
        setIsSyncing(false);
        return;
      }

      const inactiveUser = usersSnapshot.find(u =>
        u.username.toLowerCase() === loginUsername.toLowerCase().trim() && u.status !== 'active'
      );
      if (inactiveUser) {
        setLoginError('El usuario esta inactivo. Contacta al administrador.');
      } else {
        setLoginError('Usuario o contrasena incorrectos.');
      }
      setIsSyncing(false);
    } catch (err: any) {
      setLoginError('Error de conexion o validacion.');
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('fleet_pro_user');
    setCurrentView(View.DASHBOARD);
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    ensure(hasText(key), 'La clave de configuracion es obligatoria.');
    if (key === 'PRIMARY_COLOR' || key === 'SECONDARY_COLOR') {
      ensure(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(value.trim()), 'El color debe estar en formato HEX, por ejemplo #135bec.');
    }

    const updatedSettings = appSettings.map(s => s.key === key ? { ...s, value } : s);
    if (!appSettings.find(s => s.key === key)) { updatedSettings.push({ key, value }); }
    setAppSettings(updatedSettings);
    const saved = await googleSheets.pushData('update-setting', { key, value });
    if (!saved) setSyncStatus('error');
  };

  const persistOrThrow = async (
    action: Parameters<typeof googleSheets.pushData>[0],
    payload: Parameters<typeof googleSheets.pushData>[1],
    operation: 'guardar' | 'actualizar' | 'eliminar'
  ) => {
    const saved = await googleSheets.pushData(action, payload);
    if (!saved) {
      setSyncStatus('error');
      throw new Error(`No se pudo ${operation} en Google Sheets. Verifica la URL en Configuracion.`);
    }
  };

  // --- VEHICLE HANDLERS WITH SYNC ---

  const handleAddVehicle = async (newVehicle: Omit<Vehicle, 'id'>) => {
    const previousVehicles = vehicles;
    const previousDrivers = drivers;
    try {
    const formatted = { 
      ...newVehicle, 
      plate: newVehicle.plate.toUpperCase(), 
      model: newVehicle.model.toUpperCase() 
    };
    validateVehiclePayload(formatted, drivers);

    const vehicleWithId = { ...formatted, id: `V-${Date.now()}` };
    
    // 1. Guardar Vehículo
    setVehicles(prev => [vehicleWithId, ...prev]);
    await persistOrThrow('vehicle', vehicleWithId, 'guardar');

    // 2. Sincronizar Chofer (si se asignó uno)
    if (vehicleWithId.assignedDriverId) {
      const driverToUpdate = drivers.find(d => d.id === vehicleWithId.assignedDriverId);
      if (driverToUpdate) {
        const updatedDriver = { ...driverToUpdate, assignedVehicleId: vehicleWithId.id };
        setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d));
        await persistOrThrow('update-driver', updatedDriver, 'actualizar');
      }
    }
    } catch (error) {
      setVehicles(previousVehicles);
      setDrivers(previousDrivers);
      throw error;
    }
  };

  const handleUpdateVehicle = async (updatedVehicle: Vehicle) => {
    const previousVehicles = vehicles;
    const previousDrivers = drivers;
    try {
    const formatted = { 
      ...updatedVehicle, 
      plate: updatedVehicle.plate.toUpperCase(), 
      model: updatedVehicle.model.toUpperCase() 
    };
    ensure(hasText(formatted.id), 'No se pudo identificar el vehiculo a actualizar.');
    validateVehiclePayload(formatted, drivers);

    // Obtenemos el estado anterior para comparar
    const oldVehicle = vehicles.find(v => v.id === formatted.id);
    ensure(Boolean(oldVehicle), 'El vehiculo que intentas actualizar no existe.');
    const oldDriverId = oldVehicle?.assignedDriverId;
    const newDriverId = formatted.assignedDriverId;

    // 1. Actualizar Vehículo
    setVehicles(vehicles.map(v => v.id === formatted.id ? formatted : v));
    await persistOrThrow('update-vehicle', formatted, 'actualizar');

    // 2. Sincronizar Choferes (si hubo cambio)
    if (oldDriverId !== newDriverId) {
      // A. Desvincular al chofer anterior (si existía)
      if (oldDriverId) {
        const oldDriver = drivers.find(d => d.id === oldDriverId);
        if (oldDriver) {
          const updatedOldDriver = { ...oldDriver, assignedVehicleId: '' };
          setDrivers(prev => prev.map(d => d.id === updatedOldDriver.id ? updatedOldDriver : d));
          await persistOrThrow('update-driver', updatedOldDriver, 'actualizar');
        }
      }
      // B. Vincular al nuevo chofer (si se asignó)
      if (newDriverId) {
        const newDriver = drivers.find(d => d.id === newDriverId);
        if (newDriver) {
          const updatedNewDriver = { ...newDriver, assignedVehicleId: formatted.id };
          setDrivers(prev => prev.map(d => d.id === updatedNewDriver.id ? updatedNewDriver : d));
          await persistOrThrow('update-driver', updatedNewDriver, 'actualizar');
        }
      }
    }
    } catch (error) {
      setVehicles(previousVehicles);
      setDrivers(previousDrivers);
      throw error;
    }
  };

  // --- DRIVER HANDLERS WITH SYNC ---

  const handleAddDriver = async (newDriver: Omit<Driver, 'id'>) => {
    const previousVehicles = vehicles;
    const previousDrivers = drivers;
    try {
    const formatted = { 
      ...newDriver, 
      name: newDriver.name.toUpperCase(), 
      licenseType: newDriver.licenseType.toUpperCase(),
      licenseNumber: newDriver.licenseNumber || '',
      notes: newDriver.notes || ''
    };
    validateDriverPayload(formatted, vehicles);
    const driverWithId = { ...formatted, id: `D-${Date.now()}` };
    
    // 1. Guardar Chofer
    setDrivers(prev => [driverWithId, ...prev]);
    await persistOrThrow('driver', driverWithId, 'guardar');

    // 2. Sincronizar Vehículo (si se asignó uno)
    if (driverWithId.assignedVehicleId) {
      const vehicleToUpdate = vehicles.find(v => v.id === driverWithId.assignedVehicleId);
      if (vehicleToUpdate) {
        const updatedVehicle = { ...vehicleToUpdate, assignedDriverId: driverWithId.id };
        setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
        await persistOrThrow('update-vehicle', updatedVehicle, 'actualizar');
      }
    }
    } catch (error) {
      setVehicles(previousVehicles);
      setDrivers(previousDrivers);
      throw error;
    }
  };

  const handleUpdateDriver = async (updatedDriver: Driver) => {
    const previousVehicles = vehicles;
    const previousDrivers = drivers;
    try {
    const formatted = { 
      ...updatedDriver, 
      name: updatedDriver.name.toUpperCase(), 
      licenseType: updatedDriver.licenseType.toUpperCase(),
      licenseNumber: updatedDriver.licenseNumber || '',
      notes: updatedDriver.notes || ''
    };
    ensure(hasText(formatted.id), 'No se pudo identificar el chofer a actualizar.');
    validateDriverPayload(formatted, vehicles);

    // Obtenemos estado anterior
    const oldDriver = drivers.find(d => d.id === formatted.id);
    ensure(Boolean(oldDriver), 'El chofer que intentas actualizar no existe.');
    const oldVehicleId = oldDriver?.assignedVehicleId;
    const newVehicleId = formatted.assignedVehicleId;

    // 1. Actualizar Chofer
    setDrivers(drivers.map(d => d.id === formatted.id ? formatted : d));
    await persistOrThrow('update-driver', formatted, 'actualizar');

    // 2. Sincronizar Vehículos (si hubo cambio)
    if (oldVehicleId !== newVehicleId) {
      // A. Desvincular vehículo anterior
      if (oldVehicleId) {
        const oldVehicle = vehicles.find(v => v.id === oldVehicleId);
        if (oldVehicle) {
          const updatedOldVehicle = { ...oldVehicle, assignedDriverId: '' };
          setVehicles(prev => prev.map(v => v.id === updatedOldVehicle.id ? updatedOldVehicle : v));
          await persistOrThrow('update-vehicle', updatedOldVehicle, 'actualizar');
        }
      }
      // B. Vincular nuevo vehículo
      if (newVehicleId) {
        const newVehicle = vehicles.find(v => v.id === newVehicleId);
        if (newVehicle) {
          const updatedNewVehicle = { ...newVehicle, assignedDriverId: formatted.id };
          setVehicles(prev => prev.map(v => v.id === updatedNewVehicle.id ? updatedNewVehicle : v));
          await persistOrThrow('update-vehicle', updatedNewVehicle, 'actualizar');
        }
      }
    }
    } catch (error) {
      setVehicles(previousVehicles);
      setDrivers(previousDrivers);
      throw error;
    }
  };

  // --- OTHER HANDLERS ---

  const handleAddFuel = async (newFuel: Omit<FuelEntry, 'id'>) => {
    const previousFuelEntries = fuelEntries;
    try {
    const fuelWithId = { 
      id: `F-${Date.now()}`,
      date: newFuel.date,
      vehicleId: newFuel.vehicleId,
      driverId: newFuel.driverId,
      liters: Number(newFuel.liters),
      cost: Number(newFuel.cost),
      odometer: Number(newFuel.odometer)
    };
    validateFuelPayload(fuelWithId, vehicles, drivers);
    setFuelEntries([fuelWithId, ...fuelEntries]);
    await persistOrThrow('fuel', fuelWithId, 'guardar');
    } catch (error) {
      setFuelEntries(previousFuelEntries);
      throw error;
    }
  };

  const handleUpdateFuel = async (updatedFuel: FuelEntry) => {
    const previousFuelEntries = fuelEntries;
    try {
    ensure(hasText(updatedFuel.id), 'No se pudo identificar el registro de combustible.');
    ensure(fuelEntries.some(f => f.id === updatedFuel.id), 'El registro de combustible que intentas actualizar no existe.');
    validateFuelPayload(updatedFuel, vehicles, drivers);
    setFuelEntries(fuelEntries.map(f => f.id === updatedFuel.id ? updatedFuel : f));
    await persistOrThrow('update-fuel', updatedFuel, 'actualizar');
    } catch (error) {
      setFuelEntries(previousFuelEntries);
      throw error;
    }
  };

  const handleAddFuelAcquisition = async (newAcquisition: Omit<FuelAcquisition, 'id'>) => {
    const previousFuelAcquisitions = fuelAcquisitions;
    try {
    const formatted = {
      ...newAcquisition,
      description: (newAcquisition.description || '').toUpperCase(),
      area: (newAcquisition.area || '').toUpperCase(),
      supplier: (newAcquisition.supplier || '').toUpperCase(),
      internalFolio: newAcquisition.internalFolio?.toUpperCase()
    };
    validateFuelAcquisitionPayload(formatted);
    const acquisitionWithId = { ...formatted, id: `FA-${Date.now()}` };
    setFuelAcquisitions([acquisitionWithId, ...fuelAcquisitions]);
    await persistOrThrow('fuel-acquisition', acquisitionWithId, 'guardar');
    } catch (error) {
      setFuelAcquisitions(previousFuelAcquisitions);
      throw error;
    }
  };

  const handleUpdateFuelAcquisition = async (updatedAcquisition: FuelAcquisition) => {
    const previousFuelAcquisitions = fuelAcquisitions;
    try {
    const formatted = {
      ...updatedAcquisition,
      description: (updatedAcquisition.description || '').toUpperCase(),
      area: (updatedAcquisition.area || '').toUpperCase(),
      supplier: (updatedAcquisition.supplier || '').toUpperCase(),
      internalFolio: updatedAcquisition.internalFolio?.toUpperCase()
    };
    ensure(hasText(formatted.id), 'No se pudo identificar la adquisicion de combustible.');
    ensure(fuelAcquisitions.some(f => f.id === formatted.id), 'La adquisicion que intentas actualizar no existe.');
    validateFuelAcquisitionPayload(formatted);
    setFuelAcquisitions(fuelAcquisitions.map(f => f.id === formatted.id ? formatted : f));
    await persistOrThrow('update-fuel-acquisition', formatted, 'actualizar');
    } catch (error) {
      setFuelAcquisitions(previousFuelAcquisitions);
      throw error;
    }
  };

  const handleAddIncident = async (newIncident: Omit<Incident, 'id'>) => {
    const previousIncidents = incidents;
    try {
    const formatted = { 
      ...newIncident, 
      title: newIncident.title.toUpperCase(), 
      description: newIncident.description.toUpperCase() 
    };
    validateIncidentPayload(formatted, vehicles, drivers);
    const incidentWithId = { ...formatted, id: `I-${Date.now()}` };
    setIncidents([incidentWithId, ...incidents]);
    await persistOrThrow('incident', incidentWithId, 'guardar');
    } catch (error) {
      setIncidents(previousIncidents);
      throw error;
    }
  };

  const handleUpdateIncident = async (updatedIncident: Incident) => {
    const previousIncidents = incidents;
    try {
    const formatted = { 
      ...updatedIncident, 
      title: updatedIncident.title.toUpperCase(), 
      description: updatedIncident.description.toUpperCase() 
    };
    ensure(hasText(formatted.id), 'No se pudo identificar la incidencia a actualizar.');
    ensure(incidents.some(i => i.id === formatted.id), 'La incidencia que intentas actualizar no existe.');
    validateIncidentPayload(formatted, vehicles, drivers);
    setIncidents(incidents.map(i => i.id === formatted.id ? formatted : i));
    await persistOrThrow('update-incident', formatted, 'actualizar');
    } catch (error) {
      setIncidents(previousIncidents);
      throw error;
    }
  };

  const handleAddPlanning = async (newPlanning: Omit<Planning, 'id'>) => {
    const previousPlannings = plannings;
    try {
    const formatted = { 
      ...newPlanning, 
      notes: newPlanning.notes?.toUpperCase(),
      destination: newPlanning.destination?.toUpperCase()
    };
    validatePlanningPayload(formatted, vehicles, drivers, areas);
    const pWithId = { ...formatted, id: `P-${Date.now()}` };
    setPlannings([pWithId, ...plannings]);
    await persistOrThrow('planning', pWithId, 'guardar');
    } catch (error) {
      setPlannings(previousPlannings);
      throw error;
    }
  };

  const handleUpdatePlanning = async (updatedPlanning: Planning) => {
    const previousPlannings = plannings;
    try {
    const formatted = { 
      ...updatedPlanning, 
      notes: updatedPlanning.notes?.toUpperCase(),
      destination: updatedPlanning.destination?.toUpperCase()
    };
    ensure(hasText(formatted.id), 'No se pudo identificar la planeacion a actualizar.');
    ensure(plannings.some(p => p.id === formatted.id), 'La planeacion que intentas actualizar no existe.');
    validatePlanningPayload(formatted, vehicles, drivers, areas);
    setPlannings(plannings.map(p => p.id === formatted.id ? formatted : p));
    await persistOrThrow('update-planning', formatted, 'actualizar');
    } catch (error) {
      setPlannings(previousPlannings);
      throw error;
    }
  };

  const handleAddArea = async (newArea: Omit<Area, 'id'>) => {
    const previousAreas = areas;
    try {
    const formatted = { 
      ...newArea, 
      name: newArea.name.toUpperCase(), 
      description: newArea.description?.toUpperCase() 
    };
    validateAreaPayload(formatted);
    const aWithId = { ...formatted, id: `A-${Date.now()}` };
    setAreas([aWithId, ...areas]);
    await persistOrThrow('area', aWithId, 'guardar');
    } catch (error) {
      setAreas(previousAreas);
      throw error;
    }
  };

  const handleDeleteArea = async (id: string) => {
    const previousAreas = areas;
    try {
    ensure(hasText(id), 'No se pudo identificar el area a eliminar.');
    ensure(areas.some(a => a.id === id), 'El area que intentas eliminar no existe.');
    setAreas(areas.filter(a => a.id !== id));
    await persistOrThrow('delete-area', { id }, 'eliminar');
    } catch (error) {
      setAreas(previousAreas);
      throw error;
    }
  };

  const handleAddTravelLog = async (newLog: Omit<TravelLog, 'id'>) => {
    const previousTravelLogs = travelLogs;
    try {
    const formatted = { 
      ...newLog, 
      destination: newLog.destination.toUpperCase(), 
      notes: newLog.notes?.toUpperCase() 
    };
    validateTravelLogPayload(formatted, vehicles, drivers, areas);
    const logWithId = { ...formatted, id: `T-${Date.now()}` };
    setTravelLogs([logWithId, ...travelLogs]);
    await persistOrThrow('travel-log', logWithId, 'guardar');
    } catch (error) {
      setTravelLogs(previousTravelLogs);
      throw error;
    }
  };

  const handleUpdateTravelLog = async (updatedLog: TravelLog) => {
    const previousTravelLogs = travelLogs;
    try {
    const formatted = { 
      ...updatedLog, 
      destination: updatedLog.destination.toUpperCase(), 
      notes: updatedLog.notes?.toUpperCase() 
    };
    ensure(hasText(formatted.id), 'No se pudo identificar la bitacora a actualizar.');
    ensure(travelLogs.some(t => t.id === formatted.id), 'La bitacora que intentas actualizar no existe.');
    validateTravelLogPayload(formatted, vehicles, drivers, areas);
    setTravelLogs(travelLogs.map(t => t.id === formatted.id ? formatted : t));
    await persistOrThrow('update-travel-log', formatted, 'actualizar');
    } catch (error) {
      setTravelLogs(previousTravelLogs);
      throw error;
    }
  };

  const handleAddMaintenance = async (newRecord: Omit<MaintenanceRecord, 'id'>) => {
    const previousMaintenanceRecords = maintenanceRecords;
    try {
    const formatted = { 
      ...newRecord, 
      description: newRecord.description.toUpperCase(),
      quoteNumber: newRecord.quoteNumber.toUpperCase(),
      provider: newRecord.provider.toUpperCase(),
      invoiceNumber: newRecord.invoiceNumber?.toUpperCase()
    };
    validateMaintenancePayload(formatted, vehicles);
    const rWithId = { ...formatted, id: `M-${Date.now()}` };
    setMaintenanceRecords([rWithId, ...maintenanceRecords]);
    await persistOrThrow('maintenance', rWithId, 'guardar');
    } catch (error) {
      setMaintenanceRecords(previousMaintenanceRecords);
      throw error;
    }
  };

  const handleUpdateMaintenance = async (updatedRecord: MaintenanceRecord) => {
    const previousMaintenanceRecords = maintenanceRecords;
    try {
    const formatted = { 
      ...updatedRecord, 
      description: updatedRecord.description.toUpperCase(),
      quoteNumber: updatedRecord.quoteNumber.toUpperCase(),
      provider: updatedRecord.provider.toUpperCase(),
      invoiceNumber: updatedRecord.invoiceNumber?.toUpperCase()
    };
    ensure(hasText(formatted.id), 'No se pudo identificar el mantenimiento a actualizar.');
    ensure(maintenanceRecords.some(r => r.id === formatted.id), 'El mantenimiento que intentas actualizar no existe.');
    validateMaintenancePayload(formatted, vehicles);
    setMaintenanceRecords(maintenanceRecords.map(r => r.id === formatted.id ? formatted : r));
    await persistOrThrow('update-maintenance', formatted, 'actualizar');
    } catch (error) {
      setMaintenanceRecords(previousMaintenanceRecords);
      throw error;
    }
  };

  const handleAddMaintenanceType = async (name: string) => {
    const previousMaintenanceTypes = maintenanceTypes;
    try {
    ensure(hasText(name), 'El nombre del tipo de mantenimiento es obligatorio.');
    const normalizedName = normalizeCatalogName(name);
    const alreadyExists = maintenanceTypes.some(type => normalizeCatalogName(type.name || '') === normalizedName);
    ensure(!alreadyExists, 'Ese tipo de mantenimiento ya existe en el catalogo.');

    const newType = { id: `MT-${Date.now()}`, name: name.trim().toUpperCase() };
    setMaintenanceTypes([...maintenanceTypes, newType]);
    await persistOrThrow('maintenance-type', newType, 'guardar');
    } catch (error) {
      setMaintenanceTypes(previousMaintenanceTypes);
      throw error;
    }
  };

  const handleAddSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    const previousSuppliers = suppliers;
    try {
    validateSupplierPayload(supplier);
    const normalizedName = normalizeCatalogName(supplier.name || '');
    const alreadyExists = suppliers.some(existing => normalizeCatalogName(existing.name || '') === normalizedName);
    ensure(!alreadyExists, 'Ese proveedor ya existe en el catalogo.');

    const newSupplier = { ...supplier, id: `SUP-${Date.now()}`, name: (supplier.name || '').trim().toUpperCase() };
    setSuppliers([...suppliers, newSupplier]);
    await persistOrThrow('supplier', newSupplier, 'guardar');
    } catch (error) {
      setSuppliers(previousSuppliers);
      throw error;
    }
  };

  const handleAddUser = async (newUser: Omit<User, 'id'>) => {
    const previousUsers = appUsers;
    try {
    const formatted = { 
      ...newUser, 
      name: newUser.name.toUpperCase(), 
      username: newUser.username.toUpperCase() 
    };
    validateUserPayload(formatted, appUsers);
    const userWithId = { ...formatted, id: `USR-${Date.now()}` };
    setAppUsers([userWithId, ...appUsers]);
    await persistOrThrow('user', userWithId, 'guardar');
    } catch (error) {
      setAppUsers(previousUsers);
      throw error;
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    const previousUsers = appUsers;
    try {
    const formatted = { 
      ...updatedUser, 
      name: updatedUser.name.toUpperCase(), 
      username: updatedUser.username.toUpperCase() 
    };
    ensure(hasText(formatted.id), 'No se pudo identificar el usuario a actualizar.');
    ensure(appUsers.some(u => u.id === formatted.id), 'El usuario que intentas actualizar no existe.');
    validateUserPayload(formatted, appUsers, formatted.id);
    setAppUsers(appUsers.map(u => u.id === formatted.id ? formatted : u));
    await persistOrThrow('update-user', formatted, 'actualizar');
    } catch (error) {
      setAppUsers(previousUsers);
      throw error;
    }
  };

  const handleAddInspection = async (newInspection: Omit<VehicleInspection, 'id'>) => {
    const previousInspections = inspections;
    try {
    validateInspectionPayload(newInspection, vehicles);
    const inspectionWithId = { ...newInspection, id: `INS-${Date.now()}` };
    setInspections([inspectionWithId, ...inspections]);
    await persistOrThrow('inspection' as any, inspectionWithId, 'guardar'); 
    } catch (error) {
      setInspections(previousInspections);
      throw error;
    }
  };

  const handleUpdateInspection = async (updatedInspection: VehicleInspection) => {
    const previousInspections = inspections;
    try {
    ensure(hasText(updatedInspection.id), 'No se pudo identificar la revision a actualizar.');
    ensure(inspections.some(i => i.id === updatedInspection.id), 'La revision que intentas actualizar no existe.');
    validateInspectionPayload(updatedInspection, vehicles);
    setInspections(inspections.map(i => i.id === updatedInspection.id ? updatedInspection : i));
    await persistOrThrow('update-inspection' as any, updatedInspection, 'actualizar'); 
    } catch (error) {
      setInspections(previousInspections);
      throw error;
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard vehicles={vehicles} drivers={drivers} fuelEntries={fuelEntries} incidents={incidents} />;
      case View.VEHICLES:
        return (
          <Vehicles
            vehicles={vehicles}
            drivers={drivers}
            searchQuery={searchQuery}
            settings={appSettings}
            onAddVehicle={async (payload) => executeWithToast(
              () => handleAddVehicle(payload),
              'Vehiculo registrado correctamente.',
              'No se pudo registrar el vehiculo.'
            )}
            onUpdateVehicle={async (payload) => executeWithToast(
              () => handleUpdateVehicle(payload),
              'Vehiculo actualizado correctamente.',
              'No se pudo actualizar el vehiculo.'
            )}
          />
        );
      case View.DRIVERS:
        return (
          <Drivers
            drivers={drivers}
            vehicles={vehicles}
            searchQuery={searchQuery}
            settings={appSettings}
            onAddDriver={async (payload) => executeWithToast(
              () => handleAddDriver(payload),
              'Chofer registrado correctamente.',
              'No se pudo registrar el chofer.'
            )}
            onUpdateDriver={async (payload) => executeWithToast(
              () => handleUpdateDriver(payload),
              'Chofer actualizado correctamente.',
              'No se pudo actualizar el chofer.'
            )}
          />
        );
      case View.FUEL:
        return (
          <Fuel
            fuelHistory={fuelEntries}
            fuelAcquisitions={fuelAcquisitions}
            vehicles={vehicles}
            drivers={drivers}
            areas={areas}
            suppliers={suppliers}
            settings={appSettings}
            onAddFuel={async (payload) => executeWithToast(
              () => handleAddFuel(payload),
              'Carga de combustible registrada.',
              'No se pudo registrar la carga de combustible.'
            )}
            onUpdateFuel={async (payload) => executeWithToast(
              () => handleUpdateFuel(payload),
              'Registro de combustible actualizado.',
              'No se pudo actualizar el registro de combustible.'
            )}
            onAddFuelAcquisition={async (payload) => executeWithToast(
              () => handleAddFuelAcquisition(payload),
              'Adquisicion de combustible registrada.',
              'No se pudo registrar la adquisicion de combustible.'
            )}
            onUpdateFuelAcquisition={async (payload) => executeWithToast(
              () => handleUpdateFuelAcquisition(payload),
              'Adquisicion de combustible actualizada.',
              'No se pudo actualizar la adquisicion de combustible.'
            )}
            onSync={handleSyncWithToast}
          />
        );
      case View.INCIDENTS:
        return (
          <Incidents
            incidents={incidents}
            searchQuery={searchQuery}
            vehicles={vehicles}
            drivers={drivers}
            settings={appSettings}
            onAddIncident={async (payload) => executeWithToast(
              () => handleAddIncident(payload),
              'Incidencia registrada correctamente.',
              'No se pudo registrar la incidencia.'
            )}
            onUpdateIncident={async (payload) => executeWithToast(
              () => handleUpdateIncident(payload),
              'Incidencia actualizada correctamente.',
              'No se pudo actualizar la incidencia.'
            )}
          />
        );
      case View.MAINTENANCE:
        return (
          <Maintenance
            records={maintenanceRecords}
            vehicles={vehicles}
            searchQuery={searchQuery}
            maintenanceTypes={maintenanceTypes}
            suppliers={suppliers}
            settings={appSettings}
            onAddRecord={async (payload) => executeWithToast(
              () => handleAddMaintenance(payload),
              'Mantenimiento registrado correctamente.',
              'No se pudo registrar el mantenimiento.'
            )}
            onUpdateRecord={async (payload) => executeWithToast(
              () => handleUpdateMaintenance(payload),
              'Mantenimiento actualizado correctamente.',
              'No se pudo actualizar el mantenimiento.'
            )}
            onAddMaintenanceType={async (payload) => executeWithToast(
              () => handleAddMaintenanceType(payload),
              'Tipo de mantenimiento agregado.',
              'No se pudo agregar el tipo de mantenimiento.'
            )}
            onAddSupplier={async (payload) => executeWithToast(
              () => handleAddSupplier(payload),
              'Proveedor registrado correctamente.',
              'No se pudo registrar el proveedor.'
            )}
            onSync={handleSyncWithToast}
          />
        );
      case View.TRAVEL_LOGS:
        return (
          <TravelLogs
            travelLogs={travelLogs}
            vehicles={vehicles}
            drivers={drivers}
            areas={areas}
            settings={appSettings}
            onAddTravelLog={async (payload) => executeWithToast(
              () => handleAddTravelLog(payload),
              'Bitacora registrada correctamente.',
              'No se pudo registrar la bitacora.'
            )}
            onUpdateTravelLog={async (payload) => executeWithToast(
              () => handleUpdateTravelLog(payload),
              'Bitacora actualizada correctamente.',
              'No se pudo actualizar la bitacora.'
            )}
            onSync={handleSyncWithToast}
          />
        );
      case View.PLANNING:
        return (
          <PlanningComponent
            plannings={plannings}
            vehicles={vehicles}
            drivers={drivers}
            areas={areas}
            settings={appSettings}
            onAddPlanning={async (payload) => executeWithToast(
              () => handleAddPlanning(payload),
              'Asignacion registrada correctamente.',
              'No se pudo registrar la asignacion.'
            )}
            onUpdatePlanning={async (payload) => executeWithToast(
              () => handleUpdatePlanning(payload),
              'Asignacion actualizada correctamente.',
              'No se pudo actualizar la asignacion.'
            )}
            onAddArea={async (payload) => executeWithToast(
              () => handleAddArea(payload),
              'Area agregada correctamente.',
              'No se pudo agregar el area.'
            )}
            onDeleteArea={async (payload) => executeWithToast(
              () => handleDeleteArea(payload),
              'Area eliminada correctamente.',
              'No se pudo eliminar el area.'
            )}
          />
        );
      case View.INSPECTIONS:
        return (
          <Inspections
            inspections={inspections}
            vehicles={vehicles}
            currentUser={currentUser}
            settings={appSettings}
            onAddInspection={async (payload) => executeWithToast(
              () => handleAddInspection(payload),
              'Revision registrada correctamente.',
              'No se pudo registrar la revision.'
            )}
            onUpdateInspection={async (payload) => executeWithToast(
              () => handleUpdateInspection(payload),
              'Revision actualizada correctamente.',
              'No se pudo actualizar la revision.'
            )}
          />
        );
      case View.REPORTS:
        return <Reports vehicles={vehicles} fuelEntries={fuelEntries} maintenanceRecords={maintenanceRecords} incidents={incidents} settings={appSettings} />;
      case View.USERS:
        return (
          <Users
            users={appUsers}
            currentUser={currentUser}
            onAddUser={async (payload) => executeWithToast(
              () => handleAddUser(payload),
              'Usuario registrado correctamente.',
              'No se pudo registrar el usuario.'
            )}
            onUpdateUser={async (payload) => executeWithToast(
              () => handleUpdateUser(payload),
              'Usuario actualizado correctamente.',
              'No se pudo actualizar el usuario.'
            )}
          />
        );
      case View.SETTINGS:
        return (
          <Settings
            settings={appSettings}
            onUpdateSetting={handleUpdateSetting}
            onUrlChange={handleSyncWithToast}
          />
        );
      default:
        return <Dashboard vehicles={vehicles} drivers={drivers} fuelEntries={fuelEntries} incidents={incidents} />;
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
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-8">
          <div className="flex flex-col items-center mb-8">
            <img alt="DIF" className="w-14 h-14 object-contain mb-4" src="/images/logo-dif.png" />
            <h1 className="text-xl font-semibold text-slate-900">{settingsMap['APP_NAME'] || 'Flota Pro'}</h1>
            <p className="text-xs text-slate-500 mt-1">DIF La Paz - Control Vehicular</p>
          </div>

          <div className="space-y-1.5 mb-4">
            <label className="text-xs font-medium text-slate-600">URL Google Apps Script</label>
            <input
              type="url"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={serviceUrlInput}
              onChange={e => setServiceUrlInput(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveServiceUrlFromLogin}
                className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-medium text-xs hover:bg-slate-200 transition-colors"
              >
                Guardar URL
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={async () => {
                  if (!saveServiceUrlFromLogin()) return;
                  await handleSyncWithToast();
                }}
                className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-medium text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
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
              <label className="text-xs font-medium text-slate-600">Contrasena</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="********"
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
              {isSyncing ? 'Iniciando...' : 'Iniciar sesion'}
            </button>
          </form>

          {appUsers.length === 0 && (
            <form onSubmit={handleBootstrapAdmin} autoComplete="off" className="mt-6 border-t border-slate-200 pt-6 space-y-3">
              <p className="text-xs font-semibold text-slate-700">Configuracion inicial: crear administrador</p>
              <input
                type="text"
                required
                placeholder="Nombre completo"
                value={bootstrapForm.name}
                onChange={e => setBootstrapForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
              <input
                type="text"
                required
                placeholder="Usuario"
                value={bootstrapForm.username}
                onChange={e => setBootstrapForm(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Contrasena (min. 8)"
                value={bootstrapForm.password}
                onChange={e => setBootstrapForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Confirmar contrasena"
                value={bootstrapForm.confirmPassword}
                onChange={e => setBootstrapForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
              {setupError && <p className="text-rose-500 text-xs">{setupError}</p>}
              <button
                type="submit"
                disabled={isBootstrapping || isSyncing}
                className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {isBootstrapping ? 'Creando administrador...' : 'Crear administrador inicial'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar activeView={currentView} onViewChange={v => { setCurrentView(v); setSearchQuery(''); }} appName={settingsMap['APP_NAME'] || 'Flota Pro'} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={currentView.toUpperCase()} isSyncing={isSyncing} syncStatus={syncStatus} onSync={handleSyncWithToast} view={currentView} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </div>
      </main>
      <div className="fixed top-4 right-4 z-[220] space-y-2 pointer-events-none w-[min(92vw,360px)]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-xl animate-in slide-in-from-top-2 duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toast.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-lg leading-none mt-0.5">
                {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
              </span>
              <p className="text-xs font-bold leading-relaxed">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;

