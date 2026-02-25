
export enum View {
  DASHBOARD = 'dashboard',
  VEHICLES = 'vehicles',
  DRIVERS = 'drivers',
  FUEL = 'fuel',
  INCIDENTS = 'incidents',
  PLANNING = 'planning',
  TRAVEL_LOGS = 'travel_logs',
  MAINTENANCE = 'maintenance',
  INSPECTIONS = 'inspections',
  USERS = 'users',
  SETTINGS = 'settings',
  LOGIN = 'login',
  REPORTS = 'reports'
}

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  status: 'active' | 'inactive';
  lastLogin?: string;
}

export type Status = 'active' | 'inactive' | 'workshop' | 'available' | 'en-route' | 'on-break' | 'critical' | 'resolved' | 'pending';

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  assignedDriverId?: string;
  status: 'active' | 'workshop' | 'inactive';
  image: string;
  // Datos Técnicos (JSON Request)
  economicNumber?: string;
  inventory?: string;
  condition?: string;
  location?: string;
  vin?: string;
  odometer?: number;
  brand?: string;
  year?: number;
  type?: string;
  line?: string;
  color?: string;
  cylinders?: number;
  fuelType?: string;
  // Condiciones Mecánicas (JSON Request)
  engineStatus?: string;
  clutchStatus?: string;
  transmissionStatus?: string;
  shifterStatus?: string;
  steeringStatus?: string;
  suspensionStatus?: string;
  tempGaugeStatus?: string;
  oilGaugeStatus?: string;
  tiresStatus?: string;
  shocksStatus?: string;
  brakesStatus?: string;
  batteryStatus?: string;
  lightsStatus?: string;
  hornStatus?: string;
  wipersStatus?: string;
  speedoStatus?: string;
  // Accesorios (Boolean Flags)
  hasRadio?: boolean;
  hasAntenna?: boolean;
  hasMats?: boolean;
  hasLeftMirror?: boolean;
  hasRearMirror?: boolean;
  hasRims?: boolean;
  hasOilCap?: boolean;
  hasGasCap?: boolean;
  hasTireCaps?: boolean;
  hasSpareTire?: boolean;
  // Observaciones
  accessories_notes?: string;
  observations?: string;
}

export interface VehicleInspection {
  id: string;
  date: string; // ISO string with time
  vehicleId: string;
  inspectorName: string;
  odometer: number;
  observations: string;
  // Snapshot of conditions
  engineStatus?: string;
  clutchStatus?: string;
  transmissionStatus?: string;
  shifterStatus?: string;
  steeringStatus?: string;
  suspensionStatus?: string;
  tempGaugeStatus?: string;
  oilGaugeStatus?: string;
  tiresStatus?: string;
  shocksStatus?: string;
  brakesStatus?: string;
  batteryStatus?: string;
  lightsStatus?: string;
  hornStatus?: string;
  wipersStatus?: string;
  speedoStatus?: string;
}

export interface Driver {
  id: string;
  name: string;
  licenseType: string;
  licenseNumber: string;
  phone: string;
  status: 'available' | 'en-route' | 'on-break';
  assignedVehicleId?: string;
  notes?: string;
}

export interface FuelEntry {
  id: string;
  date: string;
  vehicleId: string;
  driverId: string;
  liters: number;
  cost: number;
  odometer: number;
}

export interface TravelLog {
  id: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  driverId: string;
  vehicleId: string;
  initialOdometer: number;
  finalOdometer: number;
  destination: string;
  areaId: string;
  notes?: string;
  initialFuelLevel?: number; // 0-100 percentage
  finalFuelLevel?: number; // 0-100 percentage
}

export interface MaintenanceType {
  id: string;
  name: string;
}

export interface MaintenanceRecord {
  id: string;
  consecutiveNumber?: number; // Número consecutivo automático
  date: string;
  vehicleId: string;
  serviceType: string; // Changed from enum to string to support dynamic types
  description: string;
  quoteNumber: string;
  quoteCost: number;
  invoiceNumber?: string;
  invoiceAmount?: number;
  odometer: number;
  provider: string; // Nombre Comercial (Taller)
  providerContact?: string; // Nuevo: Nombre del Encargado
  entryDate: string;
  exitDate?: string;
  estimatedDeliveryDate?: string;
  internalDocumentNumber?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

export interface Incident {
  id: string;
  type: 'mechanical' | 'traffic' | 'accident' | 'theft';
  title: string;
  description: string;
  date: string;
  vehicleId: string;
  driverId: string;
  status: 'critical' | 'pending' | 'resolved' | 'in-workshop' | 'in-resolution';
}

export interface Planning {
  id: string;
  date: string;
  vehicleId: string;
  driverId: string;
  areaId: string;
  notes?: string;
  departureTime?: string;
  arrivalTime?: string;
  destination?: string;
  status?: 'scheduled' | 'completed' | 'cancelled'; // Added status field
}

export interface Area {
  id: string;
  name: string;
  description?: string;
}

export interface AppSetting {
  key: string;
  value: string;
}
