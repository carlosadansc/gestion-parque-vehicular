import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  AppSetting,
  Area,
  FuelAcquisition,
  FuelDelivery,
  FuelEntry,
  Incident,
  MaintenanceRecord,
  Planning,
  TravelLog,
  Vehicle,
  VehicleInspection
} from '../types';

interface ReportsProps {
  vehicles: Vehicle[];
  fuelEntries: FuelEntry[];
  maintenanceRecords: MaintenanceRecord[];
  incidents: Incident[];
  travelLogs: TravelLog[];
  inspections: VehicleInspection[];
  plannings: Planning[];
  fuelAcquisitions: FuelAcquisition[];
  fuelDeliveries: FuelDelivery[];
  areas: Area[];
  settings?: AppSetting[];
}

type ReportSection = 'executive' | 'operations' | 'costs' | 'risk';

const CHART_COLORS = ['#135bec', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#7c3aed'];

const INSPECTION_KEYS: Array<keyof VehicleInspection> = [
  'engineStatus',
  'transmissionStatus',
  'clutchStatus',
  'brakesStatus',
  'steeringStatus',
  'suspensionStatus',
  'shocksStatus',
  'tiresStatus',
  'batteryStatus',
  'lightsStatus',
  'wipersStatus',
  'hornStatus',
  'shifterStatus',
  'speedoStatus',
  'tempGaugeStatus',
  'oilGaugeStatus'
];

const INSPECTION_SCORE: Record<string, number> = {
  bien: 100,
  regular: 70,
  mal: 35,
  'muy mal': 5
};

const normalizeDateInput = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toMonthKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const formatMonth = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
};

const getTravelDurationHours = (departure?: string, arrival?: string): number => {
  if (!departure || !arrival) return 0;

  const parseTime = (value: string) => {
    if (value.includes('T')) {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed.getHours() * 60 + parsed.getMinutes();
    }

    const slice = value.length >= 5 ? value.slice(0, 5) : value;
    const [h, m] = slice.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };

  const start = parseTime(departure);
  const end = parseTime(arrival);
  if (start === null || end === null) return 0;

  let diff = end - start;
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
};

const formatMoney = (value: number) => `$${value.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

const formatPctChange = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

const Reports: React.FC<ReportsProps> = ({
  vehicles,
  fuelEntries,
  maintenanceRecords,
  incidents,
  travelLogs,
  inspections,
  plannings,
  fuelAcquisitions,
  fuelDeliveries,
  areas
}) => {
  const [activeSection, setActiveSection] = useState<ReportSection>('executive');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedVehicleId, setSelectedVehicleId] = useState('all');

  const parsedRange = useMemo(() => {
    const startDate = normalizeDateInput(dateRange.start);
    const endDate = normalizeDateInput(dateRange.end);
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [dateRange]);

  const selectedVehicles = useMemo(() => {
    if (selectedVehicleId === 'all') return vehicles;
    return vehicles.filter(v => v.id === selectedVehicleId);
  }, [selectedVehicleId, vehicles]);

  const selectedVehicleSet = useMemo(() => new Set(selectedVehicles.map(v => v.id)), [selectedVehicles]);

  const inRange = (value: string) => {
    if (!parsedRange) return true;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date >= parsedRange.start && date <= parsedRange.end;
  };

  const isVehicleMatch = (vehicleId: string) => selectedVehicleId === 'all' || selectedVehicleSet.has(vehicleId);

  const filtered = useMemo(() => {
    const fuel = fuelEntries.filter(item => inRange(item.date) && isVehicleMatch(item.vehicleId));
    const maintenance = maintenanceRecords.filter(item => inRange(item.date) && isVehicleMatch(item.vehicleId));
    const incident = incidents.filter(item => inRange(item.date) && isVehicleMatch(item.vehicleId));
    const logs = travelLogs.filter(item => inRange(item.date) && isVehicleMatch(item.vehicleId));
    const inspection = inspections.filter(item => inRange(item.date) && isVehicleMatch(item.vehicleId));
    const planning = plannings.filter(item => inRange(item.date) && isVehicleMatch(item.vehicleId));
    const acquisitions = fuelAcquisitions.filter(item => inRange(item.date));
    const deliveries = fuelDeliveries.filter(item => inRange(item.date));

    return { fuel, maintenance, incident, logs, inspection, planning, acquisitions, deliveries };
  }, [fuelEntries, maintenanceRecords, incidents, travelLogs, inspections, plannings, fuelAcquisitions, fuelDeliveries, parsedRange, selectedVehicleId, selectedVehicleSet]);

  const previousWindow = useMemo(() => {
    if (!parsedRange) return null;
    const duration = parsedRange.end.getTime() - parsedRange.start.getTime();
    const prevEnd = new Date(parsedRange.start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);

    const fuel = fuelEntries.filter(item => {
      const date = new Date(item.date);
      return date >= prevStart && date <= prevEnd && isVehicleMatch(item.vehicleId);
    });
    const maintenance = maintenanceRecords.filter(item => {
      const date = new Date(item.date);
      return date >= prevStart && date <= prevEnd && isVehicleMatch(item.vehicleId);
    });
    const logs = travelLogs.filter(item => {
      const date = new Date(item.date);
      return date >= prevStart && date <= prevEnd && isVehicleMatch(item.vehicleId);
    });

    return { fuel, maintenance, logs };
  }, [parsedRange, fuelEntries, maintenanceRecords, travelLogs, selectedVehicleId, selectedVehicleSet]);

  const metrics = useMemo(() => {
    const fuelCost = filtered.fuel.reduce((acc, item) => acc + (Number(item.cost) || 0), 0);
    const maintenanceCost = filtered.maintenance.reduce((acc, item) => acc + (Number(item.invoiceAmount || item.quoteCost) || 0), 0);
    const totalCost = fuelCost + maintenanceCost;
    const liters = filtered.fuel.reduce((acc, item) => acc + (Number(item.liters) || 0), 0);

    const traveledKm = filtered.logs.reduce((acc, item) => {
      const initial = Number(item.initialOdometer) || 0;
      const final = Number(item.finalOdometer) || 0;
      const diff = final - initial;
      return acc + (diff > 0 ? diff : 0);
    }, 0);

    const travelHours = filtered.logs.reduce((acc, item) => acc + getTravelDurationHours(item.departureTime, item.arrivalTime), 0);

    const activeVehicles = selectedVehicles.filter(v => v.status === 'active').length;
    const availability = selectedVehicles.length > 0 ? (activeVehicles / selectedVehicles.length) * 100 : 0;

    const openIncidents = filtered.incident.filter(item => item.status !== 'resolved').length;

    const costPerKm = traveledKm > 0 ? totalCost / traveledKm : 0;
    const costPerLiter = liters > 0 ? fuelCost / liters : 0;
    const incidentRate = traveledKm > 0 ? (filtered.incident.length / traveledKm) * 1000 : 0;

    const previousTotalCost = previousWindow
      ? previousWindow.fuel.reduce((acc, item) => acc + (Number(item.cost) || 0), 0)
        + previousWindow.maintenance.reduce((acc, item) => acc + (Number(item.invoiceAmount || item.quoteCost) || 0), 0)
      : 0;

    const previousKm = previousWindow
      ? previousWindow.logs.reduce((acc, item) => {
          const initial = Number(item.initialOdometer) || 0;
          const final = Number(item.finalOdometer) || 0;
          const diff = final - initial;
          return acc + (diff > 0 ? diff : 0);
        }, 0)
      : 0;

    const costChangePct = previousTotalCost > 0 ? ((totalCost - previousTotalCost) / previousTotalCost) * 100 : 0;
    const kmChangePct = previousKm > 0 ? ((traveledKm - previousKm) / previousKm) * 100 : 0;

    return {
      fuelCost,
      maintenanceCost,
      totalCost,
      liters,
      traveledKm,
      travelHours,
      availability,
      openIncidents,
      costPerKm,
      costPerLiter,
      incidentRate,
      costChangePct,
      kmChangePct
    };
  }, [filtered, previousWindow, selectedVehicles]);

  const monthlyFinancialTrend = useMemo(() => {
    const map: Record<string, { fuel: number; maintenance: number; incidents: number }> = {};

    const ensureMonth = (key: string) => {
      if (!map[key]) map[key] = { fuel: 0, maintenance: 0, incidents: 0 };
    };

    filtered.fuel.forEach(item => {
      const key = toMonthKey(item.date);
      if (!key) return;
      ensureMonth(key);
      map[key].fuel += Number(item.cost) || 0;
    });

    filtered.maintenance.forEach(item => {
      const key = toMonthKey(item.date);
      if (!key) return;
      ensureMonth(key);
      map[key].maintenance += Number(item.invoiceAmount || item.quoteCost) || 0;
    });

    filtered.incident.forEach(item => {
      const key = toMonthKey(item.date);
      if (!key) return;
      ensureMonth(key);
      map[key].incidents += 1;
    });

    const keys = Object.keys(map).sort();
    return keys.map(key => ({
      month: formatMonth(key),
      fuel: map[key].fuel,
      maintenance: map[key].maintenance,
      total: map[key].fuel + map[key].maintenance,
      incidents: map[key].incidents
    }));
  }, [filtered]);

  const costByVehicle = useMemo(() => {
    const grouped: Record<string, { name: string; fuel: number; maintenance: number; km: number }> = {};

    selectedVehicles.forEach(vehicle => {
      grouped[vehicle.id] = {
        name: vehicle.plate,
        fuel: 0,
        maintenance: 0,
        km: 0
      };
    });

    filtered.fuel.forEach(item => {
      if (!grouped[item.vehicleId]) return;
      grouped[item.vehicleId].fuel += Number(item.cost) || 0;
    });

    filtered.maintenance.forEach(item => {
      if (!grouped[item.vehicleId]) return;
      grouped[item.vehicleId].maintenance += Number(item.invoiceAmount || item.quoteCost) || 0;
    });

    filtered.logs.forEach(item => {
      if (!grouped[item.vehicleId]) return;
      const km = (Number(item.finalOdometer) || 0) - (Number(item.initialOdometer) || 0);
      grouped[item.vehicleId].km += km > 0 ? km : 0;
    });

    return Object.values(grouped)
      .map(item => ({
        ...item,
        total: item.fuel + item.maintenance,
        costPerKm: item.km > 0 ? (item.fuel + item.maintenance) / item.km : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filtered, selectedVehicles]);

  const operationByArea = useMemo(() => {
    const grouped: Record<string, { area: string; trips: number; km: number; hours: number }> = {};

    filtered.logs.forEach(item => {
      const areaName = areas.find(area => area.id === item.areaId)?.name || 'Sin area';
      if (!grouped[areaName]) grouped[areaName] = { area: areaName, trips: 0, km: 0, hours: 0 };
      grouped[areaName].trips += 1;
      const km = (Number(item.finalOdometer) || 0) - (Number(item.initialOdometer) || 0);
      grouped[areaName].km += km > 0 ? km : 0;
      grouped[areaName].hours += getTravelDurationHours(item.departureTime, item.arrivalTime);
    });

    return Object.values(grouped).sort((a, b) => b.km - a.km).slice(0, 8);
  }, [areas, filtered.logs]);

  const planningCompliance = useMemo(() => {
    const counts = { scheduled: 0, completed: 0, cancelled: 0 };

    filtered.planning.forEach(item => {
      const status = item.status || 'scheduled';
      if (status === 'completed') counts.completed += 1;
      else if (status === 'cancelled') counts.cancelled += 1;
      else counts.scheduled += 1;
    });

    return [
      { name: 'Completadas', value: counts.completed, color: '#10b981' },
      { name: 'Programadas', value: counts.scheduled, color: '#135bec' },
      { name: 'Canceladas', value: counts.cancelled, color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [filtered.planning]);

  const incidentByType = useMemo(() => {
    const grouped: Record<string, number> = {};
    filtered.incident.forEach(item => {
      const key = String(item.type || 'Sin tipo').trim() || 'Sin tipo';
      grouped[key] = (grouped[key] || 0) + 1;
    });

    return Object.entries(grouped)
      .map(([name, value], index) => ({ name, value, color: CHART_COLORS[index % CHART_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [filtered.incident]);

  const maintenanceByStatus = useMemo(() => {
    const grouped: Record<string, number> = {
      completed: 0,
      'in-progress': 0,
      scheduled: 0,
      cancelled: 0
    };

    filtered.maintenance.forEach(item => {
      grouped[item.status] = (grouped[item.status] || 0) + 1;
    });

    return [
      { status: 'Completado', value: grouped.completed || 0 },
      { status: 'En progreso', value: grouped['in-progress'] || 0 },
      { status: 'Programado', value: grouped.scheduled || 0 },
      { status: 'Cancelado', value: grouped.cancelled || 0 }
    ];
  }, [filtered.maintenance]);

  const fuelBalance = useMemo(() => {
    const map: Record<string, { acquired: number; delivered: number }> = {};

    filtered.acquisitions.forEach(item => {
      const key = toMonthKey(item.date);
      if (!key) return;
      if (!map[key]) map[key] = { acquired: 0, delivered: 0 };
      map[key].acquired += Number(item.amount) || 0;
    });

    filtered.deliveries.forEach(item => {
      const key = toMonthKey(item.date);
      if (!key) return;
      if (!map[key]) map[key] = { acquired: 0, delivered: 0 };
      map[key].delivered += Number(item.amount) || 0;
    });

    return Object.keys(map)
      .sort()
      .map(key => ({
        month: formatMonth(key),
        acquired: map[key].acquired,
        delivered: map[key].delivered,
        balance: map[key].acquired - map[key].delivered
      }));
  }, [filtered.acquisitions, filtered.deliveries]);

  const inspectionScoreByVehicle = useMemo(() => {
    const latestByVehicle: Record<string, VehicleInspection> = {};

    filtered.inspection.forEach(item => {
      const current = latestByVehicle[item.vehicleId];
      if (!current || new Date(item.date).getTime() > new Date(current.date).getTime()) {
        latestByVehicle[item.vehicleId] = item;
      }
    });

    return Object.entries(latestByVehicle)
      .map(([vehicleId, inspection]) => {
        let score = 0;
        let count = 0;

        INSPECTION_KEYS.forEach(key => {
          const raw = String(inspection[key] || '').trim().toLowerCase();
          if (!raw) return;
          score += INSPECTION_SCORE[raw] ?? 100;
          count += 1;
        });

        const plate = vehicles.find(vehicle => vehicle.id === vehicleId)?.plate || vehicleId;
        return {
          vehicle: plate,
          score: count > 0 ? Math.round(score / count) : 100
        };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 10);
  }, [filtered.inspection, vehicles]);

  const criticalInspectionComponents = useMemo(() => {
    const componentMap: Record<string, number> = {
      Motor: 0,
      Transmision: 0,
      Frenos: 0,
      Suspension: 0,
      Llantas: 0,
      Bateria: 0,
      Luces: 0,
      Direccion: 0
    };

    filtered.inspection.forEach(item => {
      const checks: Array<[string, string | undefined]> = [
        ['Motor', item.engineStatus],
        ['Transmision', item.transmissionStatus],
        ['Frenos', item.brakesStatus],
        ['Suspension', item.suspensionStatus],
        ['Llantas', item.tiresStatus],
        ['Bateria', item.batteryStatus],
        ['Luces', item.lightsStatus],
        ['Direccion', item.steeringStatus]
      ];

      checks.forEach(([label, status]) => {
        const normalized = String(status || '').trim().toLowerCase();
        if (normalized === 'mal' || normalized === 'muy mal') {
          componentMap[label] += 1;
        }
      });
    });

    return Object.entries(componentMap)
      .map(([component, critical]) => ({ component, critical }))
      .sort((a, b) => b.critical - a.critical);
  }, [filtered.inspection]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="page-title">Reportes Analiticos</h2>
          <p className="page-subtitle">Vista ejecutiva con operacion, costos y riesgo</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="date"
            className="form-input"
            value={dateRange.start}
            onChange={event => setDateRange(prev => ({ ...prev, start: event.target.value }))}
          />
          <input
            type="date"
            className="form-input"
            value={dateRange.end}
            onChange={event => setDateRange(prev => ({ ...prev, end: event.target.value }))}
          />
          <select
            className="form-input"
            value={selectedVehicleId}
            onChange={event => setSelectedVehicleId(event.target.value)}
          >
            <option value="all">Toda la flota</option>
            {vehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate} - {vehicle.model}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { key: 'executive' as ReportSection, label: 'Ejecutivo' },
          { key: 'operations' as ReportSection, label: 'Operacion' },
          { key: 'costs' as ReportSection, label: 'Costos' },
          { key: 'risk' as ReportSection, label: 'Riesgo' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors ${
              activeSection === tab.key
                ? 'bg-primary text-white border-primary'
                : 'bg-surface border-border text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Costo Total" value={formatMoney(metrics.totalCost)} hint={`Combustible ${formatMoney(metrics.fuelCost)} + Mantenimiento ${formatMoney(metrics.maintenanceCost)}`} tone="blue" />
        <KpiCard title="Km Recorridos" value={metrics.traveledKm.toLocaleString('es-MX')} hint={`Horas operativas ${metrics.travelHours.toFixed(1)} h`} tone="green" />
        <KpiCard title="Costo por Km" value={`$${metrics.costPerKm.toFixed(2)}`} hint={`Variacion ${formatPctChange(metrics.costChangePct)}`} tone="amber" />
        <KpiCard title="Disponibilidad" value={`${metrics.availability.toFixed(0)}%`} hint={`Incidencias abiertas ${metrics.openIncidents}`} tone="rose" />
      </div>

      {activeSection === 'executive' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Panel title="Tendencia Mensual de Costos">
            <ChartWrap>
              <LineChart data={monthlyFinancialTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatMoney(Number(value) || 0)} />
                <Legend />
                <Line type="monotone" dataKey="fuel" name="Combustible" stroke="#135bec" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="maintenance" name="Mantenimiento" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="total" name="Total" stroke="#10b981" strokeWidth={3} dot={false} />
              </LineChart>
            </ChartWrap>
          </Panel>

          <Panel title="Top Costo por Vehiculo">
            <ChartWrap>
              <BarChart data={costByVehicle} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatMoney(Number(value) || 0)} />
                <Legend />
                <Bar dataKey="fuel" stackId="cost" fill="#135bec" name="Combustible" />
                <Bar dataKey="maintenance" stackId="cost" fill="#f59e0b" name="Mantenimiento" />
              </BarChart>
            </ChartWrap>
          </Panel>
        </div>
      )}

      {activeSection === 'operations' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Panel title="Operacion por Area">
            <ChartWrap>
              <BarChart data={operationByArea}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="area" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="trips" fill="#135bec" name="Viajes" />
                <Bar dataKey="km" fill="#10b981" name="Km" />
              </BarChart>
            </ChartWrap>
          </Panel>

          <Panel title="Cumplimiento de Planeacion">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full items-center">
              <ChartWrap className="h-[280px]">
                <PieChart>
                  <Pie data={planningCompliance} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80}>
                    {planningCompliance.map(item => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ChartWrap>
              <div className="space-y-2">
                <StatRow label="Costo por litro" value={`$${metrics.costPerLiter.toFixed(2)}`} />
                <StatRow label="Tasa incidencia / 1000 km" value={metrics.incidentRate.toFixed(2)} />
                <StatRow label="Variacion de km" value={formatPctChange(metrics.kmChangePct)} />
                <StatRow label="Registros de viaje" value={filtered.logs.length.toString()} />
              </div>
            </div>
          </Panel>
        </div>
      )}

      {activeSection === 'costs' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Panel title="Eficiencia por Vehiculo">
            <ChartWrap>
              <BarChart data={costByVehicle}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number, name) => (name === 'costPerKm' ? `$${Number(value).toFixed(2)}` : formatMoney(Number(value) || 0))} />
                <Legend />
                <Bar dataKey="total" fill="#135bec" name="Costo total" />
                <Bar dataKey="costPerKm" fill="#10b981" name="Costo/km" />
              </BarChart>
            </ChartWrap>
          </Panel>

          <Panel title="Balance de Combustible (Adquisicion vs Entrega)">
            <ChartWrap>
              <LineChart data={fuelBalance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatMoney(Number(value) || 0)} />
                <Legend />
                <Line type="monotone" dataKey="acquired" stroke="#135bec" strokeWidth={2.5} name="Adquirido" dot={false} />
                <Line type="monotone" dataKey="delivered" stroke="#f59e0b" strokeWidth={2.5} name="Entregado" dot={false} />
                <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2.5} name="Saldo" dot={false} />
              </LineChart>
            </ChartWrap>
          </Panel>
        </div>
      )}

      {activeSection === 'risk' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Panel title="Incidencias por Tipo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full items-center">
              <ChartWrap className="h-[280px]">
                <PieChart>
                  <Pie data={incidentByType} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80}>
                    {incidentByType.map(item => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ChartWrap>
              <div className="space-y-2">
                {incidentByType.length === 0 && <p className="text-sm font-bold text-text-muted">Sin incidencias en el periodo</p>}
                {incidentByType.map(item => (
                  <StatRow key={item.name} label={item.name} value={String(item.value)} color={item.color} />
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Riesgo Tecnico">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              <ChartWrap className="h-[250px]">
                <BarChart data={inspectionScoreByVehicle}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="vehicle" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => `${Number(value)} pts`} />
                  <Bar dataKey="score" fill="#135bec" name="Salud" />
                </BarChart>
              </ChartWrap>
              <div className="space-y-2">
                <h4 className="text-xs font-black text-text-muted uppercase tracking-widest">Componentes Criticos</h4>
                {criticalInspectionComponents.map(item => (
                  <StatRow key={item.component} label={item.component} value={String(item.critical)} />
                ))}
                <h4 className="text-xs font-black text-text-muted uppercase tracking-widest mt-4">Mantenimiento</h4>
                {maintenanceByStatus.map(item => (
                  <StatRow key={item.status} label={item.status} value={String(item.value)} />
                ))}
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
};

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-surface border border-border rounded-2xl p-5">
    <h3 className="text-sm font-black uppercase tracking-wider text-text-muted mb-4">{title}</h3>
    {children}
  </div>
);

const ChartWrap: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`h-[320px] w-full ${className}`}>
    <ResponsiveContainer width="100%" height="100%">
      {children as React.ReactElement}
    </ResponsiveContainer>
  </div>
);

const KpiCard: React.FC<{ title: string; value: string; hint: string; tone: 'blue' | 'green' | 'amber' | 'rose' }> = ({ title, value, hint, tone }) => {
  const leftBorder = {
    blue: 'border-l-blue-500',
    green: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    rose: 'border-l-rose-500'
  }[tone];

  return (
    <div className={`bg-surface border border-border border-l-4 ${leftBorder} rounded-xl p-4`}>
      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{title}</p>
      <p className="text-2xl font-black text-text mt-2">{value}</p>
      <p className="text-xs font-bold text-text-muted mt-1">{hint}</p>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="flex items-center justify-between border border-border bg-surface-subtle rounded-lg px-3 py-2">
    <div className="flex items-center gap-2">
      {color && <span className="size-2 rounded-full" style={{ backgroundColor: color }}></span>}
      <span className="text-xs font-bold text-text-muted uppercase tracking-wide">{label}</span>
    </div>
    <span className="text-sm font-black text-text">{value}</span>
  </div>
);

export default Reports;
