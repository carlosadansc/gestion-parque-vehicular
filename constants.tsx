
import { Vehicle, Driver, FuelEntry, Incident } from './types';

export const VEHICLES: Vehicle[] = [
  // Fixed: Use assignedDriverId instead of assignedDriver
  { id: '1', plate: 'ABC-1234', model: 'Toyota Corolla 2023', assignedDriverId: '1', status: 'active', image: 'https://picsum.photos/seed/car1/200' },
  { id: '2', plate: 'XYZ-9876', model: 'Honda CR-V 2022', assignedDriverId: '2', status: 'workshop', image: 'https://picsum.photos/seed/car2/200' },
  { id: '3', plate: 'DEF-4567', model: 'Ford F-150 2021', assignedDriverId: '3', status: 'active', image: 'https://picsum.photos/seed/car3/200' },
  { id: '4', plate: 'GHI-1011', model: 'Mercedes Sprinter 2024', assignedDriverId: '', status: 'inactive', image: 'https://picsum.photos/seed/car4/200' },
];

export const DRIVERS: Driver[] = [
  // Fixed: Use assignedVehicleId instead of assignedVehicle
  { id: '1', name: 'Carlos Rodríguez', licenseType: 'Tipo A', phone: '+52 55 1234 5678', status: 'available', assignedVehicleId: '1', image: 'https://picsum.photos/seed/driver1/200' },
  { id: '2', name: 'Ana Martínez', licenseType: 'Tipo B', phone: '+52 55 8765 4321', status: 'en-route', assignedVehicleId: '2', image: 'https://picsum.photos/seed/driver2/200' },
  { id: '3', name: 'Luis Guevara', licenseType: 'Tipo C', phone: '+52 55 9988 7766', status: 'on-break', assignedVehicleId: '3', image: 'https://picsum.photos/seed/driver3/200' },
  { id: '4', name: 'Sofía López', licenseType: 'Tipo A', phone: '+52 55 1122 3344', status: 'en-route', assignedVehicleId: '4', image: 'https://picsum.photos/seed/driver4/200' },
];

export const INCIDENTS: Incident[] = [
  // Fixed: Use vehicleId and driverId instead of plate and driver
  { id: '1', type: 'mechanical', title: 'Sobrecalentamiento Motor', description: 'Humo blanco en autopista norte. Requiere grúa inmediata.', date: 'Hace 2h', vehicleId: '1', driverId: '1', status: 'pending' },
  { id: '2', type: 'traffic', title: 'Exceso de Velocidad', description: 'Radar detectado: 65km/h en zona escolar (30km/h).', date: 'Ayer, 14:15', vehicleId: '2', driverId: '2', status: 'pending' },
  { id: '3', type: 'accident', title: 'Colisión Lateral', description: 'Impacto en cruce de vías. Vehículo inmovilizado. Conductor ileso.', date: 'Hoy, 10:45', vehicleId: '3', driverId: '3', status: 'critical' },
];

export const FUEL_HISTORY: FuelEntry[] = [
  // Fixed: Use vehicleId and driverId instead of vehicle and driver
  { id: '1', date: '14 Oct, 2023', vehicleId: '3', driverId: '1', liters: 45, cost: 920, odometer: 124500 },
  { id: '2', date: '12 Oct, 2023', vehicleId: '1', driverId: '2', liters: 60, cost: 1230, odometer: 88210 },
  { id: '3', date: '10 Oct, 2023', vehicleId: '2', driverId: '3', liters: 35, cost: 715, odometer: 45120 },
];
