
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FuelEntry, FuelAcquisition, FuelDelivery, Vehicle, Driver, AppSetting, Area, Supplier } from '../types';
import { SortableTh, useSortableData } from '../utils/tableSort';

interface FuelProps {
  fuelHistory: FuelEntry[];
  fuelAcquisitions?: FuelAcquisition[];
  fuelDeliveries?: FuelDelivery[];
  vehicles: Vehicle[];
  drivers: Driver[];
  areas?: Area[];
  suppliers?: Supplier[];
  onAddFuel: (entry: Omit<FuelEntry, 'id'>) => Promise<void>;
  onUpdateFuel: (entry: FuelEntry) => Promise<void>;
  onAddFuelAcquisition?: (entry: Omit<FuelAcquisition, 'id'>) => Promise<void>;
  onUpdateFuelAcquisition?: (entry: FuelAcquisition) => Promise<void>;
  onAddFuelDelivery?: (entry: Omit<FuelDelivery, 'id'>) => Promise<void>;
  onUpdateFuelDelivery?: (entry: FuelDelivery) => Promise<void>;
  onSync: () => void;
  settings?: AppSetting[];
}

type ProcessedFuelEntry = FuelEntry & { performance?: number };
type FuelLoadSortKey = 'date' | 'vehicle' | 'odometer' | 'liters' | 'performance' | 'cost';
type FuelAcquisitionSortKey = 'consecutive' | 'folio' | 'type' | 'validity' | 'description' | 'area' | 'supplier' | 'amount';
type FuelDeliverySortKey = 'consecutive' | 'date' | 'acquisition' | 'type' | 'area' | 'purpose' | 'recipient' | 'amount';

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
  fuelDeliveries = [],
  vehicles = [],
  drivers = [],
  areas = [],
  suppliers = [],
  onAddFuel,
  onUpdateFuel,
  onAddFuelAcquisition,
  onUpdateFuelAcquisition,
  onAddFuelDelivery,
  onUpdateFuelDelivery,
  onSync,
  settings = []
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<'loads' | 'acquisitions' | 'deliveries'>('loads');
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showAcquisitionReportPreview, setShowAcquisitionReportPreview] = useState(false);
  const [showAcquisitionPrintPreview, setShowAcquisitionPrintPreview] = useState(false);
  const [selectedAcquisition, setSelectedAcquisition] = useState<FuelAcquisition | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<FuelDelivery | null>(null);
  const [deliveryError, setDeliveryError] = useState('');
  const [showDeliveryReceiptPreview, setShowDeliveryReceiptPreview] = useState(false);
  const [showDeliveryReportPreview, setShowDeliveryReportPreview] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<FuelDelivery | null>(null);
  const [editingEntry, setEditingEntry] = useState<FuelEntry | null>(null);
  const [formError, setFormError] = useState('');
  const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);
  const [isSavingAcquisition, setIsSavingAcquisition] = useState(false);
  const [editingAcquisition, setEditingAcquisition] = useState<FuelAcquisition | null>(null);
  const [acquisitionError, setAcquisitionError] = useState('');
  const [acquisitionForm, setAcquisitionForm] = useState({
    date: today,
    internalFolio: '',
    isQr: false,
    validFrom: today,
    validTo: today,
    description: '',
    amount: '',
    area: '',
    supplier: ''
  });
  const [acquisitionFilters, setAcquisitionFilters] = useState<{
    startDate: string;
    endDate: string;
    type: 'all' | 'qr' | 'voucher';
  }>({
    startDate: '',
    endDate: '',
    type: 'all'
  });
  const [deliveryFilters, setDeliveryFilters] = useState<{
    startDate: string;
    endDate: string;
    type: 'all' | 'qr' | 'voucher';
  }>({
    startDate: '',
    endDate: '',
    type: 'all'
  });
  const [deliveryForm, setDeliveryForm] = useState({
    date: today,
    acquisitionId: '',
    area: '',
    amount: '',
    purpose: '',
    recipientName: '',
    recipientPosition: '',
    notes: ''
  });
  
  const [formData, setFormData] = useState({
    date: today,
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

    const historyWithPerformance: ProcessedFuelEntry[] = [];
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
  const fuelLoadSortAccessors = useMemo<Record<FuelLoadSortKey, (entry: ProcessedFuelEntry) => unknown>>(() => ({
    date: entry => entry.date,
    vehicle: entry => {
      const vehicle = vehicles.find(v => v.id === entry.vehicleId);
      const driver = drivers.find(d => d.id === entry.driverId);
      return `${vehicle?.plate || entry.vehicleId || ''} ${driver?.name || entry.driverId || ''}`;
    },
    odometer: entry => Number(entry.odometer) || 0,
    liters: entry => Number(entry.liters) || 0,
    performance: entry => entry.performance ?? null,
    cost: entry => Number(entry.cost) || 0
  }), [drivers, vehicles]);
  const {
    sortedItems: sortedFuelHistory,
    sortConfig: fuelLoadSortConfig,
    requestSort: requestFuelLoadSort
  } = useSortableData(processedHistory, fuelLoadSortAccessors, { key: 'date', direction: 'desc' });

  const filteredAcquisitions = useMemo(() => {
    const startMs = acquisitionFilters.startDate
      ? new Date(`${acquisitionFilters.startDate}T00:00:00`).getTime()
      : null;
    const endMs = acquisitionFilters.endDate
      ? new Date(`${acquisitionFilters.endDate}T23:59:59`).getTime()
      : null;

    return fuelAcquisitions
      .filter((entry) => {
        const dateKey = toDateInputValue(entry.date);
        const entryMs = dateKey ? new Date(`${dateKey}T12:00:00`).getTime() : Number.NaN;
        const hasDate = Number.isFinite(entryMs);
        const withinStart = startMs === null || (hasDate && entryMs >= startMs);
        const withinEnd = endMs === null || (hasDate && entryMs <= endMs);
        const matchesType =
          acquisitionFilters.type === 'all' ||
          (acquisitionFilters.type === 'qr' ? Boolean(entry.isQr) : !Boolean(entry.isQr));

        return withinStart && withinEnd && matchesType;
      })
      .sort((a, b) => {
        const aMs = new Date(String(a.date || '')).getTime();
        const bMs = new Date(String(b.date || '')).getTime();
        return bMs - aMs;
      });
  }, [fuelAcquisitions, acquisitionFilters]);
  const acquisitionTotals = useMemo(() => {
    const totalAmount = filteredAcquisitions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const qrItems = filteredAcquisitions.filter(item => item.isQr);
    const voucherItems = filteredAcquisitions.filter(item => !item.isQr);
    const qrCount = qrItems.length;
    const vouchersCount = voucherItems.length;
    const qrAmount = qrItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const vouchersAmount = voucherItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    return {
      totalAmount,
      qrCount,
      vouchersCount,
      qrAmount,
      vouchersAmount
    };
  }, [filteredAcquisitions]);

  const nextAcquisitionConsecutive = useMemo(() => {
    if (fuelAcquisitions.length === 0) return 1;
    const maxNum = Math.max(...fuelAcquisitions.map(item => Number(item.consecutiveNumber) || 0));
    return maxNum + 1;
  }, [fuelAcquisitions]);

  const deliveredByAcquisitionId = useMemo(() => {
    const map: Record<string, number> = {};
    fuelDeliveries.forEach((delivery) => {
      if (!delivery.acquisitionId) return;
      map[delivery.acquisitionId] = (map[delivery.acquisitionId] || 0) + (Number(delivery.amount) || 0);
    });
    return map;
  }, [fuelDeliveries]);

  const getAvailableForAcquisition = (acquisitionId: string, excludeDeliveryId?: string): number => {
    const acquisition = fuelAcquisitions.find(item => item.id === acquisitionId);
    if (!acquisition) return 0;
    const acquiredAmount = Number(acquisition.amount) || 0;
    const delivered = fuelDeliveries
      .filter(item => item.acquisitionId === acquisitionId && (!excludeDeliveryId || item.id !== excludeDeliveryId))
      .reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    return acquiredAmount - delivered;
  };

  const filteredDeliveries = useMemo(() => {
    const startMs = deliveryFilters.startDate ? new Date(`${deliveryFilters.startDate}T00:00:00`).getTime() : null;
    const endMs = deliveryFilters.endDate ? new Date(`${deliveryFilters.endDate}T23:59:59`).getTime() : null;

    return fuelDeliveries
      .filter((delivery) => {
        const acquisition = fuelAcquisitions.find(item => item.id === delivery.acquisitionId);
        const resolvedType: 'qr' | 'voucher' = delivery.acquisitionType || (acquisition?.isQr ? 'qr' : 'voucher');
        const dateKey = toDateInputValue(delivery.date);
        const entryMs = dateKey ? new Date(`${dateKey}T12:00:00`).getTime() : Number.NaN;
        const hasDate = Number.isFinite(entryMs);
        const withinStart = startMs === null || (hasDate && entryMs >= startMs);
        const withinEnd = endMs === null || (hasDate && entryMs <= endMs);
        const matchesType =
          deliveryFilters.type === 'all' ||
          (deliveryFilters.type === 'qr'
            ? resolvedType === 'qr'
            : resolvedType === 'voucher');
        return withinStart && withinEnd && matchesType;
      })
      .sort((a, b) => new Date(String(b.date || '')).getTime() - new Date(String(a.date || '')).getTime());
  }, [fuelDeliveries, fuelAcquisitions, deliveryFilters]);

  const acquisitionSortAccessors = useMemo<Record<FuelAcquisitionSortKey, (entry: FuelAcquisition) => unknown>>(() => ({
    consecutive: entry => Number(entry.consecutiveNumber) || 0,
    folio: entry => entry.internalFolio || '',
    type: entry => entry.isQr ? 'QR' : 'VALES',
    validity: entry => entry.validFrom || entry.validTo || '',
    description: entry => entry.description || '',
    area: entry => entry.area || '',
    supplier: entry => entry.supplier || '',
    amount: entry => Number(entry.amount) || 0
  }), []);
  const {
    sortedItems: sortedAcquisitions,
    sortConfig: acquisitionSortConfig,
    requestSort: requestAcquisitionSort
  } = useSortableData(filteredAcquisitions, acquisitionSortAccessors, { key: 'consecutive', direction: 'desc' });

  const deliverySortAccessors = useMemo<Record<FuelDeliverySortKey, (entry: FuelDelivery) => unknown>>(() => ({
    consecutive: entry => Number(entry.consecutiveNumber) || 0,
    date: entry => entry.date,
    acquisition: entry => {
      const acquisition = fuelAcquisitions.find(item => item.id === entry.acquisitionId);
      return Number(entry.acquisitionConsecutiveNumber || acquisition?.consecutiveNumber) || 0;
    },
    type: entry => {
      const acquisition = fuelAcquisitions.find(item => item.id === entry.acquisitionId);
      return entry.acquisitionType || (acquisition?.isQr ? 'qr' : 'voucher');
    },
    area: entry => entry.area || '',
    purpose: entry => entry.purpose || '',
    recipient: entry => `${entry.recipientName || ''} ${entry.recipientPosition || ''}`,
    amount: entry => Number(entry.amount) || 0
  }), [fuelAcquisitions]);
  const {
    sortedItems: sortedDeliveries,
    sortConfig: deliverySortConfig,
    requestSort: requestDeliverySort
  } = useSortableData(filteredDeliveries, deliverySortAccessors, { key: 'date', direction: 'desc' });

  const deliveryTotals = useMemo(() => {
    const totalAmount = filteredDeliveries.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const qrItems = filteredDeliveries.filter(item => {
      const acquisition = fuelAcquisitions.find(a => a.id === item.acquisitionId);
      const resolvedType = item.acquisitionType || (acquisition?.isQr ? 'qr' : 'voucher');
      return resolvedType === 'qr';
    });
    const voucherItems = filteredDeliveries.filter(item => {
      const acquisition = fuelAcquisitions.find(a => a.id === item.acquisitionId);
      const resolvedType = item.acquisitionType || (acquisition?.isQr ? 'qr' : 'voucher');
      return resolvedType === 'voucher';
    });
    return {
      totalAmount,
      qrAmount: qrItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0),
      vouchersAmount: voucherItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0),
      qrCount: qrItems.length,
      vouchersCount: voucherItems.length
    };
  }, [filteredDeliveries, fuelAcquisitions]);

  const nextDeliveryConsecutive = useMemo(() => {
    if (fuelDeliveries.length === 0) return 1;
    const maxNum = Math.max(...fuelDeliveries.map(item => Number(item.consecutiveNumber) || 0));
    return maxNum + 1;
  }, [fuelDeliveries]);

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
      date: today,
      internalFolio: '',
      isQr: false,
      validFrom: today,
      validTo: today,
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
      setAcquisitionError('Debes completar descripción, monto, área y proveedor.');
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
      const message = err instanceof Error ? err.message : 'Error al guardar adquisición de combustible';
      setAcquisitionError(message);
    } finally {
      setIsSavingAcquisition(false);
    }
  };

  const handlePrintAcquisition = (entry: FuelAcquisition) => {
    setSelectedAcquisition(entry);
    setShowAcquisitionPrintPreview(true);
  };

  const resetDeliveryForm = () => {
    setDeliveryError('');
    setEditingDelivery(null);
    setDeliveryForm({
      date: today,
      acquisitionId: '',
      area: '',
      amount: '',
      purpose: '',
      recipientName: '',
      recipientPosition: '',
      notes: ''
    });
  };

  const handleEditDelivery = (entry: FuelDelivery) => {
    setDeliveryError('');
    setEditingDelivery(entry);
    setDeliveryForm({
      date: toDateInputValue(entry.date, today),
      acquisitionId: String(entry.acquisitionId || ''),
      area: String(entry.area || ''),
      amount: Number(entry.amount) ? String(entry.amount) : '',
      purpose: String(entry.purpose || ''),
      recipientName: String(entry.recipientName || ''),
      recipientPosition: String(entry.recipientPosition || ''),
      notes: String(entry.notes || '')
    });
    setShowDeliveryModal(true);
  };

  const handleSubmitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddFuelDelivery || !onUpdateFuelDelivery) return;

    setDeliveryError('');
    if (!deliveryForm.acquisitionId || !deliveryForm.area.trim() || !deliveryForm.amount || !deliveryForm.purpose.trim() || !deliveryForm.recipientName.trim()) {
      setDeliveryError('Debes completar adquisición, área, monto, motivo y quien recibe.');
      return;
    }

    const selectedAcquisitionForDelivery = fuelAcquisitions.find(item => item.id === deliveryForm.acquisitionId);
    if (!selectedAcquisitionForDelivery) {
      setDeliveryError('La adquisición seleccionada no existe.');
      return;
    }

    const parsedAmount = Number(deliveryForm.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setDeliveryError('El monto de entrega debe ser mayor a 0.');
      return;
    }

    const availableAmount = getAvailableForAcquisition(deliveryForm.acquisitionId, editingDelivery?.id);
    if (parsedAmount > availableAmount + 0.0001) {
      setDeliveryError(`El monto excede el saldo disponible de la adquisición (${Math.max(availableAmount, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}).`);
      return;
    }

    setIsSavingDelivery(true);
    try {
      const payload = {
        consecutiveNumber: editingDelivery?.consecutiveNumber || nextDeliveryConsecutive,
        date: deliveryForm.date,
        acquisitionId: deliveryForm.acquisitionId,
        acquisitionConsecutiveNumber: selectedAcquisitionForDelivery.consecutiveNumber,
        acquisitionInternalFolio: selectedAcquisitionForDelivery.internalFolio || undefined,
        acquisitionType: selectedAcquisitionForDelivery.isQr ? 'qr' as const : 'voucher' as const,
        area: deliveryForm.area,
        amount: parsedAmount,
        purpose: deliveryForm.purpose,
        recipientName: deliveryForm.recipientName,
        recipientPosition: deliveryForm.recipientPosition || undefined,
        notes: deliveryForm.notes || undefined
      };

      if (editingDelivery) {
        await onUpdateFuelDelivery({ ...payload, id: editingDelivery.id });
      } else {
        await onAddFuelDelivery(payload);
      }

      setShowDeliveryModal(false);
      resetDeliveryForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar la entrega de combustible';
      setDeliveryError(message);
    } finally {
      setIsSavingDelivery(false);
    }
  };

  const handlePrintDeliveryReceipt = (entry: FuelDelivery) => {
    setSelectedDelivery(entry);
    setShowDeliveryReceiptPreview(true);
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
  const selectedAcquisitionForDelivery = deliveryForm.acquisitionId
    ? fuelAcquisitions.find(item => item.id === deliveryForm.acquisitionId)
    : null;
  const deliveryAvailableAmount = deliveryForm.acquisitionId
    ? getAvailableForAcquisition(deliveryForm.acquisitionId, editingDelivery?.id)
    : 0;

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
        <style>{`
         @media print {
            @page {
              margin: 0.5cm;
              size: letter landscape;
            }
            html, body {
              overflow: visible !important;
              height: auto !important;
              width: auto !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            body > *:not(#print-portal) {
              display: none !important;
            }
            #print-portal {
              display: block !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: 100% !important;
              z-index: 9999 !important;
            }
            #fuel-printable,
            #fuel-printable *,
            #fuel-acquisition-printable,
            #fuel-acquisition-printable *,
            #fuel-acquisitions-report-printable,
            #fuel-acquisitions-report-printable *,
            #fuel-delivery-receipt-printable,
            #fuel-delivery-receipt-printable *,
            #fuel-deliveries-report-printable,
            #fuel-deliveries-report-printable * { 
              visibility: visible; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #fuel-printable,
            #fuel-acquisition-printable,
            #fuel-acquisitions-report-printable,
            #fuel-delivery-receipt-printable,
            #fuel-deliveries-report-printable { 
              display: block !important;
              position: static !important;
              width: 100%; 
              padding: 0; 
              margin: 0;
              background: white !important; 
              font-family: 'Inter', sans-serif;
            }
            .no-print { display: none !important; }
            /* Ensure tables fit on landscape page */
            #fuel-printable table,
            #fuel-acquisition-printable table,
            #fuel-acquisitions-report-printable table,
            #fuel-delivery-receipt-printable table,
            #fuel-deliveries-report-printable table {
              width: 100% !important;
              font-size: 7.5pt !important;
            }
           
            /* ========================================
               SIGNATURE SECTION - FLOWING WITH CONTENT
               ======================================== */
             #fuel-printable .signature-section,
             #fuel-acquisition-printable .signature-section,
             #fuel-acquisitions-report-printable .signature-section,
             #fuel-delivery-receipt-printable .signature-section,
             #fuel-deliveries-report-printable .signature-section {
               page-break-inside: avoid;
               margin-top: 2rem;
             }
             
             #fuel-printable .signature-line,
             #fuel-acquisition-printable .signature-line,
             #fuel-acquisitions-report-printable .signature-line,
             #fuel-delivery-receipt-printable .signature-line,
             #fuel-deliveries-report-printable .signature-line {
               border-top: 2px solid #1e293b;
               padding-top: 0.5rem;
               min-width: 200px;
             }

             /* Multi-page safety for new reports */
             #fuel-acquisitions-report-printable,
             #fuel-deliveries-report-printable,
             #fuel-delivery-receipt-printable,
             #fuel-printable,
             #fuel-acquisition-printable {
                width: auto !important;
                max-width: none !important;
                min-height: auto !important;
                box-shadow: none !important;
                page-break-after: auto;
               break-after: auto;
             }

             #fuel-acquisitions-report-modal,
             #fuel-deliveries-report-modal,
             #fuel-delivery-receipt-modal,
             #fuel-acquisition-ticket-modal,
             #fuel-loads-report-modal {
               position: static !important;
               inset: auto !important;
               display: block !important;
               width: auto !important;
               height: auto !important;
               max-height: none !important;
               overflow: visible !important;
               background: white !important;
             }

             #fuel-acquisitions-report-modal .print-page-host,
             #fuel-deliveries-report-modal .print-page-host,
             #fuel-delivery-receipt-modal .print-page-host,
             #fuel-acquisition-ticket-modal .print-page-host,
             #fuel-loads-report-modal .print-page-host {
               display: block !important;
               width: auto !important;
               height: auto !important;
               max-height: none !important;
               overflow: visible !important;
               padding: 0 !important;
               margin: 0 !important;
               background: white !important;
             }

             #fuel-acquisitions-report-printable .print-report-table,
             #fuel-deliveries-report-printable .print-report-table {
               table-layout: fixed;
               border-collapse: collapse;
             }

             #fuel-acquisitions-report-printable .print-report-table thead,
             #fuel-deliveries-report-printable .print-report-table thead {
               display: table-header-group;
             }

             #fuel-acquisitions-report-printable .print-report-table tr,
             #fuel-deliveries-report-printable .print-report-table tr {
               page-break-inside: avoid;
               break-inside: avoid;
             }

             #fuel-acquisitions-report-printable .print-report-table th,
             #fuel-acquisitions-report-printable .print-report-table td,
             #fuel-deliveries-report-printable .print-report-table th,
             #fuel-deliveries-report-printable .print-report-table td,
             #fuel-delivery-receipt-printable p,
             #fuel-delivery-receipt-printable span {
               white-space: normal !important;
               overflow-wrap: anywhere;
               word-break: break-word;
               hyphens: auto;
               vertical-align: top;
             }

             #fuel-acquisitions-report-printable .print-report-table th,
             #fuel-acquisitions-report-printable .print-report-table td,
             #fuel-deliveries-report-printable .print-report-table th,
             #fuel-deliveries-report-printable .print-report-table td {
               padding: 4px 5px !important;
               line-height: 1.2 !important;
             }

             #fuel-acquisitions-report-printable .print-report-table-acq th:nth-child(1),
             #fuel-acquisitions-report-printable .print-report-table-acq td:nth-child(1) { width: 6%; }
             #fuel-acquisitions-report-printable .print-report-table-acq th:nth-child(2),
             #fuel-acquisitions-report-printable .print-report-table-acq td:nth-child(2) { width: 8%; }
             #fuel-acquisitions-report-printable .print-report-table-acq th:nth-child(3),
             #fuel-acquisitions-report-printable .print-report-table-acq td:nth-child(3) { width: 10%; }
             #fuel-acquisitions-report-printable .print-report-table-acq th:nth-child(4),
             #fuel-acquisitions-report-printable .print-report-table-acq td:nth-child(4) { width: 7%; }
             #fuel-acquisitions-report-printable .print-report-table-acq th:nth-child(5),
             #fuel-acquisitions-report-printable .print-report-table-acq td:nth-child(5) { width: 18%; }
             #fuel-acquisitions-report-printable .print-report-table-acq th:nth-child(6),
             #fuel-acquisitions-report-printable .print-report-table-acq td:nth-child(6) { width: 14%; }
             #fuel-acquisitions-report-printable .print-report-table-acq th:nth-child(7),
             #fuel-acquisitions-report-printable .print-report-table-acq td:nth-child(7) { width: 19%; }
             #fuel-acquisitions-report-printable .print-report-table-acq th:nth-child(8),
             #fuel-acquisitions-report-printable .print-report-table-acq td:nth-child(8) { width: 12%; }

             #fuel-deliveries-report-printable .print-report-table-del th:nth-child(1),
             #fuel-deliveries-report-printable .print-report-table-del td:nth-child(1) { width: 7%; }
             #fuel-deliveries-report-printable .print-report-table-del th:nth-child(2),
             #fuel-deliveries-report-printable .print-report-table-del td:nth-child(2) { width: 10%; }
             #fuel-deliveries-report-printable .print-report-table-del th:nth-child(3),
             #fuel-deliveries-report-printable .print-report-table-del td:nth-child(3) { width: 12%; }
             #fuel-deliveries-report-printable .print-report-table-del th:nth-child(4),
             #fuel-deliveries-report-printable .print-report-table-del td:nth-child(4) { width: 8%; }
             #fuel-deliveries-report-printable .print-report-table-del th:nth-child(5),
             #fuel-deliveries-report-printable .print-report-table-del td:nth-child(5) { width: 23%; }
             #fuel-deliveries-report-printable .print-report-table-del th:nth-child(6),
             #fuel-deliveries-report-printable .print-report-table-del td:nth-child(6) { width: 25%; }
             #fuel-deliveries-report-printable .print-report-table-del th:nth-child(7),
             #fuel-deliveries-report-printable .print-report-table-del td:nth-child(7) { width: 15%; }
         }
       `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="page-title">Bitácora de Combustible</h2>
          <p className="page-subtitle">
            {activeTab === 'loads'
              ? 'Control de gastos y rendimiento por unidad'
              : activeTab === 'acquisitions'
                ? 'Adquisiciones de vales y combustible QR'
                : 'Entregas de combustible por área y justificación'}
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
            {activeTab === 'acquisitions' && (
            <button
                onClick={() => setShowAcquisitionReportPreview(true)}
                className="btn btn-secondary"
            >
                <span className="material-symbols-outlined ui-icon">print</span>
                Vista Previa
            </button>
            )}
            {activeTab === 'deliveries' && (
            <button
                onClick={() => setShowDeliveryReportPreview(true)}
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
              } else if (activeTab === 'acquisitions') {
                resetAcquisitionForm();
                setShowAcquisitionModal(true);
              } else {
                resetDeliveryForm();
                setShowDeliveryModal(true);
              }
            }}
            className="btn btn-primary"
            >
            <span className="material-symbols-outlined ui-icon">
              {activeTab === 'loads' ? 'local_gas_station' : activeTab === 'acquisitions' ? 'receipt_long' : 'handshake'}
            </span>
            {activeTab === 'loads' ? 'Agregar Carga' : activeTab === 'acquisitions' ? 'Nueva Adquisición' : 'Nueva Entrega'}
            </button>
        </div>
      </div>

      <div className="no-print inline-flex rounded-xl border border-border bg-surface p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('loads')}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'loads' ? 'bg-blue-50 text-blue-700' : 'text-text-muted hover:bg-surface-subtle'
          }`}
        >
          Cargas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('acquisitions')}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'acquisitions' ? 'bg-emerald-50 text-emerald-700' : 'text-text-muted hover:bg-surface-subtle'
          }`}
        >
          Adquisiciones
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('deliveries')}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'deliveries' ? 'bg-amber-50 text-amber-700' : 'text-text-muted hover:bg-surface-subtle'
          }`}
        >
          Entregas
        </button>
      </div>

      {activeTab === 'loads' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
          <FuelStat label="Rendimiento Promedio" value={globalAveragePerformance > 0 ? globalAveragePerformance.toFixed(2) : "---"} unit="KM/L" icon="analytics" desc="Basado en historial de odómetro" />
          <FuelStat label="Gasto Total" value={`$${(totalCost || 0).toLocaleString()}`} icon="attach_money" trend="+12%" isNegativeTrend />
          <FuelStat label="Litros Totales" value={(totalLiters || 0).toLocaleString()} unit="L" icon="water_drop" desc={`${(fuelHistory?.length || 0)} cargas registradas`} />
        </div>
      ) : activeTab === 'acquisitions' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
          <FuelStat label="Monto Total" value={`$${(acquisitionTotals.totalAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} icon="request_quote" />
          <FuelStat label="Total QR" value={`$${(acquisitionTotals.qrAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} icon="qr_code_2" desc={`${acquisitionTotals.qrCount} registros QR`} />
          <FuelStat label="Total Vales" value={`$${(acquisitionTotals.vouchersAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} icon="local_activity" desc={`${acquisitionTotals.vouchersCount} registros con vale`} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
          <FuelStat label="Entregado Total" value={`$${(deliveryTotals.totalAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} icon="payments" />
          <FuelStat label="Entregas QR" value={`$${(deliveryTotals.qrAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} icon="qr_code_2" desc={`${deliveryTotals.qrCount} entregas QR`} />
          <FuelStat label="Entregas Vales" value={`$${(deliveryTotals.vouchersAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} icon="local_activity" desc={`${deliveryTotals.vouchersCount} entregas con vale`} />
        </div>
      )}

      <div className="card flex flex-col h-full no-print">
        <div className="px-4 py-3 border-b border-border flex flex-col xl:flex-row xl:items-end justify-between gap-4 bg-surface-subtle">
          <div>
            <h3 className="section-title">
              {activeTab === 'loads'
                ? 'Historial de Consumo'
                : activeTab === 'acquisitions'
                  ? 'Adquisicones de combustible'
                  : 'Entregas de Combustible'}
            </h3>
            <p className="label mt-0.5">
              {activeTab === 'loads'
                ? 'Listado completo de cargas'
                : activeTab === 'acquisitions'
                  ? 'Registros de vales y combustible QR'
                  : 'Distribución por áreas y motivo de entrega'}
            </p>
            {activeTab === 'acquisitions' && (
              <p className="text-[11px] font-bold text-text-muted mt-2">
                Mostrando {filteredAcquisitions.length} de {fuelAcquisitions.length} adquisiciones.
              </p>
            )}
            {activeTab === 'deliveries' && (
              <p className="text-[11px] font-bold text-text-muted mt-2">
                Mostrando {filteredDeliveries.length} de {fuelDeliveries.length} entregas.
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            {activeTab === 'acquisitions' && (
              <>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                  Desde
                  <input
                    type="date"
                    className="mt-1 w-full sm:w-auto bg-surface border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:border-primary"
                    value={acquisitionFilters.startDate}
                    onChange={e => setAcquisitionFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </label>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                  Hasta
                  <input
                    type="date"
                    className="mt-1 w-full sm:w-auto bg-surface border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:border-primary"
                    value={acquisitionFilters.endDate}
                    onChange={e => setAcquisitionFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </label>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                  Tipo
                  <select
                    className="mt-1 w-full sm:w-auto bg-surface border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:border-primary"
                    value={acquisitionFilters.type}
                    onChange={e => setAcquisitionFilters(prev => ({ ...prev, type: e.target.value as 'all' | 'qr' | 'voucher' }))}
                  >
                    <option value="all">Todos</option>
                    <option value="qr">QR</option>
                    <option value="voucher">Vale</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setAcquisitionFilters({ startDate: '', endDate: '', type: 'all' })}
                  className="btn btn-ghost text-xs"
                >
                  Limpiar
                </button>
              </>
            )}
            {activeTab === 'deliveries' && (
              <>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                  Desde
                  <input
                    type="date"
                    className="mt-1 w-full sm:w-auto bg-surface border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:border-primary"
                    value={deliveryFilters.startDate}
                    onChange={e => setDeliveryFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </label>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                  Hasta
                  <input
                    type="date"
                    className="mt-1 w-full sm:w-auto bg-surface border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:border-primary"
                    value={deliveryFilters.endDate}
                    onChange={e => setDeliveryFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </label>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                  Tipo
                  <select
                    className="mt-1 w-full sm:w-auto bg-surface border border-border rounded-md px-3 py-2 text-xs font-bold outline-none focus:border-primary"
                    value={deliveryFilters.type}
                    onChange={e => setDeliveryFilters(prev => ({ ...prev, type: e.target.value as 'all' | 'qr' | 'voucher' }))}
                  >
                    <option value="all">Todos</option>
                    <option value="qr">QR</option>
                    <option value="voucher">Vale</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setDeliveryFilters({ startDate: '', endDate: '', type: 'all' })}
                  className="btn btn-ghost text-xs"
                >
                  Limpiar
                </button>
              </>
            )}
            <button onClick={onSync} className="btn btn-ghost text-xs">
              <span className="material-symbols-outlined ui-icon">sync</span> Sincronizar
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto flex-1">
          {activeTab === 'loads' ? (
          <table className="table-professional table-density-compact">
            <thead>
              <tr>
                <SortableTh label="Fecha" sortKey="date" sortConfig={fuelLoadSortConfig} onSort={requestFuelLoadSort} />
                <SortableTh label="Vehículo" sortKey="vehicle" sortConfig={fuelLoadSortConfig} onSort={requestFuelLoadSort} />
                <SortableTh label="Odómetro" sortKey="odometer" sortConfig={fuelLoadSortConfig} onSort={requestFuelLoadSort} align="right" className="text-right" />
                <SortableTh label="Litros" sortKey="liters" sortConfig={fuelLoadSortConfig} onSort={requestFuelLoadSort} align="right" className="text-right" />
                <SortableTh label="Rendimiento" sortKey="performance" sortConfig={fuelLoadSortConfig} onSort={requestFuelLoadSort} align="right" className="text-right" />
                <SortableTh label="Costo" sortKey="cost" sortConfig={fuelLoadSortConfig} onSort={requestFuelLoadSort} align="right" className="text-right" />
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedFuelHistory.map((entry) => {
                const vehicle = vehicles.find(v => v.id === entry.vehicleId);
                const driver = drivers.find(d => d.id === entry.driverId);
                return (
                  <tr key={entry.id}>
                    <td className="font-medium">
                      {entry.date ? new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                    </td>
                    <td>
                      <p className="font-medium text-text">{vehicle?.plate || entry.vehicleId || 'S/P'}</p>
                      <p className="text-xs text-text-muted">{driver?.name || entry.driverId || '---'}</p>
                    </td>
                    <td className="text-right text-text-muted">{(Number(entry.odometer) || 0).toLocaleString()} km</td>
                    <td className="text-right font-medium">{entry.liters || 0} L</td>
                    <td className="text-right">
                      {entry.performance ? (
                        <span className="badge badge-info">
                          {entry.performance.toFixed(2)} KM/L
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted italic">Carga Inicial</span>
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
              {sortedFuelHistory.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-text-muted text-sm font-bold">Sin registros de cargas.</td>
                </tr>
              )}
            </tbody>
          </table>
          ) : activeTab === 'acquisitions' ? (
          <table className="table-professional table-density-compact">
            <thead>
              <tr>
                <SortableTh label="Consec." sortKey="consecutive" sortConfig={acquisitionSortConfig} onSort={requestAcquisitionSort} />
                <SortableTh label="Folio Interno" sortKey="folio" sortConfig={acquisitionSortConfig} onSort={requestAcquisitionSort} />
                <SortableTh label="Modalidad" sortKey="type" sortConfig={acquisitionSortConfig} onSort={requestAcquisitionSort} />
                <SortableTh label="Vigencia" sortKey="validity" sortConfig={acquisitionSortConfig} onSort={requestAcquisitionSort} />
                <SortableTh label="Descripción" sortKey="description" sortConfig={acquisitionSortConfig} onSort={requestAcquisitionSort} />
                <SortableTh label="Área" sortKey="area" sortConfig={acquisitionSortConfig} onSort={requestAcquisitionSort} />
                <SortableTh label="Proveedor" sortKey="supplier" sortConfig={acquisitionSortConfig} onSort={requestAcquisitionSort} />
                <SortableTh label="Monto" sortKey="amount" sortConfig={acquisitionSortConfig} onSort={requestAcquisitionSort} align="right" className="text-right" />
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedAcquisitions.map((entry) => (
                <tr key={entry.id}>
                  <td className="font-black text-blue-700">{entry.consecutiveNumber || '---'}</td>
                  <td className="font-medium">{entry.internalFolio || 'S/N'}</td>
                  <td>
                    <span className={`badge ${entry.isQr ? 'badge-success' : 'badge-warning'}`}>
                      {entry.isQr ? 'QR' : 'VALES'}
                    </span>
                  </td>
                  <td className="text-xs font-bold text-text-muted">
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
                        aria-label="Imprimir ticket de adquisición"
                      >
                        <span className="material-symbols-outlined ui-icon">print</span>
                      </button>
                      <button
                        onClick={() => handleEditAcquisition(entry)}
                        className="btn-icon btn-icon-primary"
                        aria-label="Editar adquisición"
                      >
                        <span className="material-symbols-outlined ui-icon">edit</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedAcquisitions.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-text-muted text-sm font-bold">Sin registros para el filtro seleccionado.</td>
                </tr>
              )}
            </tbody>
          </table>
          ) : (
          <table className="table-professional table-density-compact">
            <thead>
              <tr>
                <SortableTh label="Consec." sortKey="consecutive" sortConfig={deliverySortConfig} onSort={requestDeliverySort} />
                <SortableTh label="Fecha" sortKey="date" sortConfig={deliverySortConfig} onSort={requestDeliverySort} />
                <SortableTh label="Adquisición" sortKey="acquisition" sortConfig={deliverySortConfig} onSort={requestDeliverySort} />
                <SortableTh label="Tipo" sortKey="type" sortConfig={deliverySortConfig} onSort={requestDeliverySort} />
                <SortableTh label="Área" sortKey="area" sortConfig={deliverySortConfig} onSort={requestDeliverySort} />
                <SortableTh label="Motivo" sortKey="purpose" sortConfig={deliverySortConfig} onSort={requestDeliverySort} />
                <SortableTh label="Recibe" sortKey="recipient" sortConfig={deliverySortConfig} onSort={requestDeliverySort} />
                <SortableTh label="Monto" sortKey="amount" sortConfig={deliverySortConfig} onSort={requestDeliverySort} align="right" className="text-right" />
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedDeliveries.map((entry) => {
                const acquisition = fuelAcquisitions.find(item => item.id === entry.acquisitionId);
                const availableAfterDistribution = Number(acquisition?.amount || 0) - (deliveredByAcquisitionId[entry.acquisitionId] || 0);
                return (
                <tr key={entry.id}>
                  <td className="font-black text-amber-700">{entry.consecutiveNumber || '---'}</td>
                  <td className="font-medium">{entry.date ? new Date(entry.date).toLocaleDateString('es-ES') : '---'}</td>
                  <td>
                    <p className="font-medium text-text">ADQ #{entry.acquisitionConsecutiveNumber || acquisition?.consecutiveNumber || '---'}</p>
                    <p className="text-xs text-text-muted">Folio: {(entry.acquisitionInternalFolio || acquisition?.internalFolio || 'S/N').toUpperCase()}</p>
                    <p className={`text-[10px] font-black mt-1 ${availableAfterDistribution <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      Saldo: ${Math.max(availableAfterDistribution, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td>
                    <span className={`badge ${(entry.acquisitionType || (acquisition?.isQr ? 'qr' : 'voucher')) === 'qr' ? 'badge-success' : 'badge-warning'}`}>
                      {(entry.acquisitionType || (acquisition?.isQr ? 'qr' : 'voucher')) === 'qr' ? 'QR' : 'VALE'}
                    </span>
                  </td>
                  <td className="font-medium">{entry.area}</td>
                  <td className="font-medium">{entry.purpose}</td>
                  <td>
                    <p className="font-medium">{entry.recipientName}</p>
                    <p className="text-xs text-text-muted">{entry.recipientPosition || '---'}</p>
                  </td>
                  <td className="text-right font-black">${(Number(entry.amount) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  <td className="text-center">
                    <div className="table-actions">
                      <button
                        onClick={() => handlePrintDeliveryReceipt(entry)}
                        className="btn-icon btn-icon-success"
                        aria-label="Imprimir recibo de entrega"
                      >
                        <span className="material-symbols-outlined ui-icon">print</span>
                      </button>
                      <button
                        onClick={() => handleEditDelivery(entry)}
                        className="btn-icon btn-icon-primary"
                        aria-label="Editar entrega"
                      >
                        <span className="material-symbols-outlined ui-icon">edit</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })}
              {sortedDeliveries.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-text-muted text-sm font-bold">Sin entregas para el filtro seleccionado.</td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-secondary/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-surface rounded-xl w-full max-w-xl border border-border overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-subtle">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600" aria-hidden="true">local_gas_station</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-text">{editingEntry ? 'Editar Carga' : 'Nueva Carga'}</h3>
                </div>
              </div>
              <button 
                onClick={() => !isSaving && setShowModal(false)}
                disabled={isSaving}
                className="size-9 rounded-md hover:bg-surface transition-all flex items-center justify-center text-text-muted disabled:opacity-50"
                aria-label="Cerrar modal"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} autoComplete="off" className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Fecha de la Carga</label>
                <input 
                  type="date"
                  required disabled={isSaving}
                  className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all disabled:opacity-50"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Vehículo</label>
                  <select 
                    required disabled={isSaving}
                    className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all disabled:opacity-50"
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
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Conductor</label>
                  <select 
                    required disabled={isSaving}
                    className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all disabled:opacity-50"
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
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Litros Cargados</label>
                  <div className="relative">
                    <input 
                      required disabled={isSaving}
                      type="number" step="0.01"
                      className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 pr-8 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all disabled:opacity-50"
                      placeholder="0.00"
                      value={formData.liters}
                      onChange={e => setFormData({...formData, liters: e.target.value})}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted">L</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Costo Total ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">$</span>
                    <input 
                      required disabled={isSaving}
                      type="number" step="0.01"
                      className="w-full bg-surface-subtle border border-border rounded-md pl-7 pr-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all disabled:opacity-50"
                      placeholder="0.00"
                      value={formData.cost}
                      onChange={e => setFormData({...formData, cost: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Lectura del Odómetro (Km)</label>
                <input 
                  required disabled={isSaving}
                  type="number"
                  className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all disabled:opacity-50"
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
                  className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-text-muted hover:bg-surface-subtle rounded-md transition-all disabled:opacity-50"
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-secondary/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-surface rounded-xl w-full max-w-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-subtle">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600" aria-hidden="true">receipt_long</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-text">{editingAcquisition ? 'Editar Adquisición' : 'Nueva Adquisición'}</h3>
                </div>
              </div>
              <button
                onClick={() => !isSavingAcquisition && setShowAcquisitionModal(false)}
                disabled={isSavingAcquisition}
                className="size-9 rounded-md hover:bg-surface transition-all flex items-center justify-center text-text-muted disabled:opacity-50"
                aria-label="Cerrar modal"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitAcquisition} autoComplete="off" className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Consecutivo</label>
                  <div className="w-full bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm font-black text-blue-700">
                    {editingAcquisition?.consecutiveNumber || nextAcquisitionConsecutive}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Folio Interno</label>
                  <input disabled={isSavingAcquisition} className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all uppercase" value={acquisitionForm.internalFolio} onChange={e => setAcquisitionForm({...acquisitionForm, internalFolio: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Fecha de Registro</label>
                  <input type="date" required disabled={isSavingAcquisition} className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all" value={acquisitionForm.date} onChange={e => setAcquisitionForm({...acquisitionForm, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Modalidad</label>
                  <select required disabled={isSavingAcquisition} className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all" value={acquisitionForm.isQr ? 'qr' : 'voucher'} onChange={e => setAcquisitionForm({...acquisitionForm, isQr: e.target.value === 'qr'})}>
                    <option value="voucher">Vales</option>
                    <option value="qr">Codigo QR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Rango Desde</label>
                  <input type="date" required disabled={isSavingAcquisition} className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all" value={acquisitionForm.validFrom} onChange={e => setAcquisitionForm({...acquisitionForm, validFrom: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Rango Hasta</label>
                  <input type="date" required disabled={isSavingAcquisition} className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all" value={acquisitionForm.validTo} onChange={e => setAcquisitionForm({...acquisitionForm, validTo: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Area</label>
                  <select
                    required
                    disabled={isSavingAcquisition}
                    className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all"
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
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Proveedor</label>
                  <select
                    required
                    disabled={isSavingAcquisition}
                    className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all"
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
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Monto ($)</label>
                <input type="number" step="0.01" required disabled={isSavingAcquisition} className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all" value={acquisitionForm.amount} onChange={e => setAcquisitionForm({...acquisitionForm, amount: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Descripcion</label>
                <textarea rows={3} required disabled={isSavingAcquisition} className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none resize-none focus:bg-surface focus:border-primary transition-all" value={acquisitionForm.description} onChange={e => setAcquisitionForm({...acquisitionForm, description: e.target.value})} />
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
                  className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-text-muted hover:bg-surface-subtle rounded-md transition-all disabled:opacity-50"
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

      {showDeliveryModal && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-secondary/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-surface rounded-xl w-full max-w-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-subtle">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-600" aria-hidden="true">handshake</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-text">{editingDelivery ? 'Editar Entrega' : 'Nueva Entrega de Combustible'}</h3>
                </div>
              </div>
              <button
                onClick={() => !isSavingDelivery && setShowDeliveryModal(false)}
                disabled={isSavingDelivery}
                className="size-9 rounded-md hover:bg-surface transition-all flex items-center justify-center text-text-muted disabled:opacity-50"
                aria-label="Cerrar modal"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitDelivery} autoComplete="off" className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Consecutivo Entrega</label>
                  <div className="w-full bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm font-black text-amber-700">
                    {editingDelivery?.consecutiveNumber || nextDeliveryConsecutive}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Fecha de Entrega</label>
                  <input
                    type="date"
                    required
                    disabled={isSavingDelivery}
                    className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all"
                    value={deliveryForm.date}
                    onChange={e => setDeliveryForm({ ...deliveryForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Adquisición Origen</label>
                <select
                  required
                  disabled={isSavingDelivery}
                  className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all"
                  value={deliveryForm.acquisitionId}
                  onChange={e => setDeliveryForm({ ...deliveryForm, acquisitionId: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {fuelAcquisitions
                    .filter(item => getAvailableForAcquisition(item.id, editingDelivery?.id) > 0 || item.id === editingDelivery?.acquisitionId)
                    .sort((a, b) => Number(b.consecutiveNumber || 0) - Number(a.consecutiveNumber || 0))
                    .map(item => {
                      const available = getAvailableForAcquisition(item.id, editingDelivery?.id);
                      return (
                        <option key={item.id} value={item.id}>
                          ADQ #{item.consecutiveNumber || '---'} | {item.isQr ? 'QR' : 'VALE'} | Saldo ${Math.max(available, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </option>
                      );
                    })}
                </select>
              </div>

              {selectedAcquisitionForDelivery && (
                <div className="bg-surface-subtle border border-border rounded-md p-3 text-xs">
                  <p className="font-black text-text uppercase tracking-wider">
                    Adquisición: #{selectedAcquisitionForDelivery.consecutiveNumber || '---'} - {selectedAcquisitionForDelivery.isQr ? 'QR' : 'VALE'}
                  </p>
                  <p className="font-bold text-text-muted mt-1">
                    Saldo disponible: ${Math.max(deliveryAvailableAmount, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Area Destino</label>
                  <input
                    required
                    disabled={isSavingDelivery}
                    className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all"
                    value={deliveryForm.area}
                    onChange={e => setDeliveryForm({ ...deliveryForm, area: e.target.value })}
                    list="fuel-delivery-area-options"
                    placeholder="Ej. UNIDAD MOVIL NORTE"
                  />
                  <datalist id="fuel-delivery-area-options">
                    {areaOptions.map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Monto Entregado ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={isSavingDelivery}
                    className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all"
                    value={deliveryForm.amount}
                    onChange={e => setDeliveryForm({ ...deliveryForm, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Motivo / Justificacion</label>
                <textarea
                  rows={3}
                  required
                  disabled={isSavingDelivery}
                  className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none resize-none focus:bg-surface focus:border-primary transition-all"
                  value={deliveryForm.purpose}
                  onChange={e => setDeliveryForm({ ...deliveryForm, purpose: e.target.value })}
                  placeholder="Ej. TRASLADO DE PACIENTES A COMUNIDADES RURALES"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Recibe</label>
                  <input
                    required
                    disabled={isSavingDelivery}
                    className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all"
                    value={deliveryForm.recipientName}
                    onChange={e => setDeliveryForm({ ...deliveryForm, recipientName: e.target.value })}
                    placeholder="Nombre completo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Cargo de Quien Recibe</label>
                  <input
                    disabled={isSavingDelivery}
                    className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all"
                    value={deliveryForm.recipientPosition}
                    onChange={e => setDeliveryForm({ ...deliveryForm, recipientPosition: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Observaciones</label>
                <input
                  disabled={isSavingDelivery}
                  className="w-full bg-surface-subtle border border-border rounded-md px-4 py-3 text-sm font-bold outline-none focus:bg-surface focus:border-primary transition-all"
                  value={deliveryForm.notes}
                  onChange={e => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                  placeholder="Opcional"
                />
              </div>

              {deliveryError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {deliveryError}
                </p>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  disabled={isSavingDelivery}
                  onClick={() => setShowDeliveryModal(false)}
                  className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-text-muted hover:bg-surface-subtle rounded-md transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingDelivery}
                  className="flex-[2] py-3 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-md hover:opacity-90 transition-all disabled:opacity-80 flex items-center justify-center gap-2"
                >
                  {isSavingDelivery ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                      Guardando...
                    </>
                  ) : (
                    editingDelivery ? 'Guardar Cambios' : 'Registrar Entrega'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAcquisitionReportPreview && document.getElementById('print-portal') && createPortal(
        <div id="fuel-acquisitions-report-modal" className="fixed inset-0 z-[205] bg-surface flex flex-col overflow-y-auto">
          <div className="sticky top-0 bg-secondary p-4 flex justify-between items-center text-white shadow-lg no-print">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowAcquisitionReportPreview(false)} className="bg-surface/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-surface/20 transition-all">Cerrar</button>
              <h3 className="font-black uppercase tracking-widest text-sm">Vista Previa Adquisicones de combustible</h3>
            </div>
            <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Reporte PDF
            </button>
          </div>
          <div className="print-page-host flex-1 bg-surface-subtle p-10 flex justify-center">
            <div id="fuel-acquisitions-report-printable" className="bg-surface w-[27.94cm] min-h-[21.59cm] p-[1.5cm] shadow-2xl relative text-text">
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
                    <span className="text-lg font-black text-text uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                    <span className="text-lg font-black text-text uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                    <span className="text-[8pt] font-bold uppercase text-text-muted mt-2 tracking-[0.2em]">Adquisicones de combustible</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-secondary text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                    Resumen Filtrado
                  </div>
                  <p className="text-[8pt] font-black text-text-muted uppercase tracking-widest">
                    Tipo: {acquisitionFilters.type === 'all' ? 'Todos' : acquisitionFilters.type === 'qr' ? 'QR' : 'Vale'}
                  </p>
                  <p className="text-[8pt] font-black text-text-muted uppercase tracking-widest mt-1">
                    Rango: {acquisitionFilters.startDate || acquisitionFilters.endDate
                      ? `${acquisitionFilters.startDate ? new Date(`${acquisitionFilters.startDate}T00:00:00`).toLocaleDateString('es-ES') : 'Inicio'} - ${acquisitionFilters.endDate ? new Date(`${acquisitionFilters.endDate}T00:00:00`).toLocaleDateString('es-ES') : 'Hoy'}`
                      : 'Todas las fechas'}
                  </p>
                  <p className="text-[9pt] text-text-muted font-bold mt-2">
                    Emision: {new Date().toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'})}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                  <p className="text-[8pt] font-black text-blue-600 uppercase tracking-widest mb-1">Monto Total</p>
                  <p className="text-2xl font-black text-text">${(acquisitionTotals.totalAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                  <p className="text-[8pt] font-black text-emerald-600 uppercase tracking-widest mb-1">Total QR</p>
                  <p className="text-2xl font-black text-text">${(acquisitionTotals.qrAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[8pt] font-bold text-text-muted mt-1">{acquisitionTotals.qrCount} registros QR</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
                  <p className="text-[8pt] font-black text-amber-600 uppercase tracking-widest mb-1">Total Vales</p>
                  <p className="text-2xl font-black text-text">${(acquisitionTotals.vouchersAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[8pt] font-bold text-text-muted mt-1">{acquisitionTotals.vouchersCount} registros con vale</p>
                </div>
              </div>

              <div className="mb-8">
                <table className="print-report-table print-report-table-acq w-full border-collapse border border-slate-300">
                  <thead className="bg-surface-subtle">
                    <tr>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Consec.</th>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Fecha</th>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Folio</th>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Tipo</th>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Vigencia</th>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Area</th>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Proveedor</th>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAcquisitions.map((entry, idx) => (
                      <tr key={`${entry.id || 'acq'}-${idx}`} className="border-b border-slate-300">
                        <td className="px-2 py-2 text-[8pt] font-black text-blue-700 text-center">{entry.consecutiveNumber || '---'}</td>
                        <td className="px-2 py-2 text-[8pt] font-bold text-center text-text-muted">
                          {entry.date ? new Date(entry.date).toLocaleDateString('es-ES') : '---'}
                        </td>
                        <td className="px-2 py-2 text-[8pt] font-bold text-text uppercase">{entry.internalFolio || 'S/N'}</td>
                        <td className="px-2 py-2 text-[8pt] font-black uppercase text-center">{entry.isQr ? 'QR' : 'VALE'}</td>
                        <td className="px-2 py-2 text-[8pt] font-bold text-text-muted">
                          {(entry.validFrom ? new Date(entry.validFrom).toLocaleDateString('es-ES') : '---')} - {(entry.validTo ? new Date(entry.validTo).toLocaleDateString('es-ES') : '---')}
                        </td>
                        <td className="px-2 py-2 text-[8pt] font-bold text-text uppercase">{entry.area || '---'}</td>
                        <td className="px-2 py-2 text-[8pt] font-bold text-text uppercase">{entry.supplier || '---'}</td>
                        <td className="px-2 py-2 text-[8pt] text-right font-black text-text font-mono">${(Number(entry.amount) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    {filteredAcquisitions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-2 py-6 text-[9pt] text-center font-bold text-text-muted">
                          Sin adquisiciones para el filtro seleccionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      , document.getElementById('print-portal')!)}

      {showDeliveryReportPreview && document.getElementById('print-portal') && createPortal(
        <div id="fuel-deliveries-report-modal" className="fixed inset-0 z-[206] bg-surface flex flex-col overflow-y-auto">
          <div className="sticky top-0 bg-secondary p-4 flex justify-between items-center text-white shadow-lg no-print">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowDeliveryReportPreview(false)} className="bg-surface/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-surface/20 transition-all">Cerrar</button>
              <h3 className="font-black uppercase tracking-widest text-sm">Vista Previa Entregas</h3>
            </div>
            <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Reporte PDF
            </button>
          </div>
          <div className="print-page-host flex-1 bg-surface-subtle p-10 flex justify-center">
            <div id="fuel-deliveries-report-printable" className="bg-surface w-[27.94cm] min-h-[21.59cm] p-[1.5cm] shadow-2xl relative text-text">
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
                    <span className="text-lg font-black text-text uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                    <span className="text-lg font-black text-text uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                    <span className="text-[8pt] font-bold uppercase text-text-muted mt-2 tracking-[0.2em]">Reporte General de Entregas de Combustible</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-secondary text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                    Resumen Filtrado
                  </div>
                  <p className="text-[8pt] font-black text-text-muted uppercase tracking-widest">
                    Tipo: {deliveryFilters.type === 'all' ? 'Todos' : deliveryFilters.type === 'qr' ? 'QR' : 'Vale'}
                  </p>
                  <p className="text-[8pt] font-black text-text-muted uppercase tracking-widest mt-1">
                    Rango: {deliveryFilters.startDate || deliveryFilters.endDate
                      ? `${deliveryFilters.startDate ? new Date(`${deliveryFilters.startDate}T00:00:00`).toLocaleDateString('es-ES') : 'Inicio'} - ${deliveryFilters.endDate ? new Date(`${deliveryFilters.endDate}T00:00:00`).toLocaleDateString('es-ES') : 'Hoy'}`
                      : 'Todas las fechas'}
                  </p>
                  <p className="text-[9pt] text-text-muted font-bold mt-2">
                    Emision: {new Date().toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'})}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                  <p className="text-[8pt] font-black text-blue-600 uppercase tracking-widest mb-1">Entregado Total</p>
                  <p className="text-2xl font-black text-text">${(deliveryTotals.totalAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                  <p className="text-[8pt] font-black text-emerald-600 uppercase tracking-widest mb-1">Entregas QR</p>
                  <p className="text-2xl font-black text-text">${(deliveryTotals.qrAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[8pt] font-bold text-text-muted mt-1">{deliveryTotals.qrCount} entregas QR</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
                  <p className="text-[8pt] font-black text-amber-600 uppercase tracking-widest mb-1">Entregas Vales</p>
                  <p className="text-2xl font-black text-text">${(deliveryTotals.vouchersAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[8pt] font-bold text-text-muted mt-1">{deliveryTotals.vouchersCount} entregas con vale</p>
                </div>
              </div>

              <div className="mb-8">
                <table className="print-report-table print-report-table-del w-full border-collapse border border-slate-300">
                  <thead className="bg-surface-subtle">
                    <tr>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Consec.</th>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Fecha</th>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Adquisición</th>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Tipo</th>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Area</th>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Recibe</th>
                      <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeliveries.map((entry, idx) => {
                      const acquisition = fuelAcquisitions.find(item => item.id === entry.acquisitionId);
                      const deliveryType = entry.acquisitionType || (acquisition?.isQr ? 'qr' : 'voucher');
                      return (
                      <tr key={`${entry.id || 'delivery'}-${idx}`} className="border-b border-slate-300">
                        <td className="px-2 py-2 text-[8pt] font-black text-amber-700 text-center">{entry.consecutiveNumber || '---'}</td>
                        <td className="px-2 py-2 text-[8pt] font-bold text-center text-text-muted">{entry.date ? new Date(entry.date).toLocaleDateString('es-ES') : '---'}</td>
                        <td className="px-2 py-2 text-[8pt] font-bold text-text uppercase">ADQ #{entry.acquisitionConsecutiveNumber || '---'}</td>
                        <td className="px-2 py-2 text-[8pt] font-black uppercase text-center">{deliveryType === 'qr' ? 'QR' : 'VALE'}</td>
                        <td className="px-2 py-2 text-[8pt] font-bold text-text uppercase">{entry.area || '---'}</td>
                        <td className="px-2 py-2 text-[8pt] font-bold text-text uppercase">{entry.recipientName || '---'}</td>
                        <td className="px-2 py-2 text-[8pt] text-right font-black text-text font-mono">${(Number(entry.amount) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                    })}
                    {filteredDeliveries.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-2 py-6 text-[9pt] text-center font-bold text-text-muted">
                          Sin entregas para el filtro seleccionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="signature-section mt-12">
                <div className="grid grid-cols-2 gap-24 text-center">
                  <div className="signature-line border-t-2 border-slate-900 pt-4">
                    <p className="text-[9pt] font-black uppercase text-text">{managerName}</p>
                    <p className="text-[7pt] font-bold text-text-muted mt-1 uppercase tracking-widest">Encargado del Parque Vehicular</p>
                    <p className="text-[7pt] font-bold text-text-muted uppercase tracking-widest">Elaboro</p>
                  </div>
                  <div className="signature-line border-t-2 border-slate-900 pt-4">
                    <p className="text-[9pt] font-black uppercase text-text">{directorName}</p>
                    <p className="text-[7pt] font-bold text-text-muted mt-1 uppercase tracking-widest">Director General</p>
                    <p className="text-[7pt] font-bold text-text-muted uppercase tracking-widest">Enterado</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      , document.getElementById('print-portal')!)}

      {showDeliveryReceiptPreview && selectedDelivery && document.getElementById('print-portal') && createPortal(
        <div id="fuel-delivery-receipt-modal" className="fixed inset-0 z-[207] bg-surface flex flex-col overflow-y-auto">
          <div className="sticky top-0 bg-secondary p-4 flex justify-between items-center text-white shadow-lg no-print">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowDeliveryReceiptPreview(false)} className="bg-surface/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-surface/20 transition-all">Cerrar</button>
              <h3 className="font-black uppercase tracking-widest text-sm">Recibo de Entrega</h3>
            </div>
            <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-md font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Recibo PDF
            </button>
          </div>
          <div className="print-page-host flex-1 bg-surface-subtle p-10 flex justify-center">
            <div id="fuel-delivery-receipt-printable" className="bg-surface w-[21.59cm] min-h-[27.94cm] p-[1.5cm] shadow-2xl relative text-text">
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
                    <span className="text-lg font-black text-text uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                    <span className="text-lg font-black text-text uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                    <span className="text-[8pt] font-bold uppercase text-text-muted mt-2 tracking-[0.2em]">Recibo de Entrega de Combustible</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-secondary text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                    Entrega
                  </div>
                  <p className="text-xs font-bold text-text-muted">
                    No. <span className="font-black text-amber-700 text-lg ml-1">{selectedDelivery.consecutiveNumber || '---'}</span>
                  </p>
                  <p className="text-[9pt] text-text-muted font-bold mt-1">
                    Fecha: {selectedDelivery.date ? new Date(selectedDelivery.date).toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'}) : '---'}
                  </p>
                </div>
              </div>

              <div className="bg-surface-subtle border border-border rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-3 text-[9pt]">
                  <p><span className="font-black text-text-muted uppercase tracking-wider">Adquisición:</span> <span className="font-bold text-text">#{selectedDelivery.acquisitionConsecutiveNumber || '---'} {`(${(selectedDelivery.acquisitionType || (fuelAcquisitions.find(item => item.id === selectedDelivery.acquisitionId)?.isQr ? 'qr' : 'voucher')) === 'qr' ? 'QR' : 'VALE'})`}</span></p>
                  <p><span className="font-black text-text-muted uppercase tracking-wider">Folio:</span> <span className="font-bold text-text">{(selectedDelivery.acquisitionInternalFolio || 'S/N').toUpperCase()}</span></p>
                  <p><span className="font-black text-text-muted uppercase tracking-wider">Área Destino:</span> <span className="font-bold text-text">{selectedDelivery.area}</span></p>
                  <p><span className="font-black text-text-muted uppercase tracking-wider">Monto Entregado:</span> <span className="font-black text-primary text-lg">${(Number(selectedDelivery.amount) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></p>
                </div>
              </div>

              <div className="mb-6 bg-surface-subtle border border-border rounded-lg p-6">
                <p className="text-[8pt] font-black text-text-muted uppercase tracking-widest mb-2">Motivo / Justificacion</p>
                <p className="text-[10pt] text-text leading-relaxed break-words">{selectedDelivery.purpose || '---'}</p>
              </div>

              <div className="mb-8 bg-surface-subtle border border-border rounded-lg p-6">
                <p className="text-[8pt] font-black text-text-muted uppercase tracking-widest mb-2">Recibe</p>
                <p className="text-[11pt] font-black text-text uppercase">{selectedDelivery.recipientName || '---'}</p>
                <p className="text-[8pt] font-bold text-text-muted uppercase tracking-widest mt-1">{selectedDelivery.recipientPosition || 'SIN CARGO CAPTURADO'}</p>
                <p className="text-[8pt] font-bold text-text-muted mt-3">{selectedDelivery.notes || ''}</p>
              </div>

              <div className="signature-section mt-14">
                <div className="grid grid-cols-3 gap-12 text-center">
                  <div className="signature-line border-t-2 border-slate-900 pt-4">
                    <p className="text-[9pt] font-black uppercase text-text">{administrativeCoordinatorName}</p>
                    <p className="text-[7pt] font-bold text-text-muted mt-1 uppercase tracking-widest">{administrativeCoordinatorPos}</p>
                    <p className="text-[7pt] font-bold text-text-muted uppercase tracking-widest">Vo. Bo.</p>
                  </div>
                  <div className="signature-line border-t-2 border-slate-900 pt-4">
                    <p className="text-[9pt] font-black uppercase text-text">{directorName}</p>
                    <p className="text-[7pt] font-bold text-text-muted mt-1 uppercase tracking-widest">Director General</p>
                    <p className="text-[7pt] font-bold text-text-muted uppercase tracking-widest">Autorizacion</p>
                  </div>
                  <div className="signature-line border-t-2 border-slate-900 pt-4">
                    <p className="text-[9pt] font-black uppercase text-text">{selectedDelivery.recipientName || 'Nombre y Firma'}</p>
                    <p className="text-[7pt] font-bold text-text-muted mt-1 uppercase tracking-widest">Recibido</p>
                    <p className="text-[7pt] font-bold text-text-muted uppercase tracking-widest">Sello</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      , document.getElementById('print-portal')!)}

      {showAcquisitionPrintPreview && selectedAcquisition && document.getElementById('print-portal') && createPortal(
        <div id="fuel-acquisition-ticket-modal" className="fixed inset-0 z-[210] bg-surface flex flex-col overflow-y-auto">
          <div className="sticky top-0 bg-secondary p-4 flex justify-between items-center text-white shadow-lg no-print">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAcquisitionPrintPreview(false)}
                className="bg-surface/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-surface/20 transition-all"
              >
                Cerrar
              </button>
              <h3 className="font-black uppercase tracking-widest text-sm">Vista Previa Ticket Adquisición</h3>
            </div>
            <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-md font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Ticket PDF
            </button>
          </div>
          <div className="print-page-host flex-1 bg-surface-subtle p-10 flex justify-center">
            <div id="fuel-acquisition-printable" className="bg-surface w-[21.59cm] min-h-[27.94cm] p-[1.5cm] shadow-2xl relative text-text">
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
                    <span className="text-lg font-black text-text uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                    <span className="text-lg font-black text-text uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                    <span className="text-[8pt] font-bold uppercase text-text-muted mt-2 tracking-[0.2em]">Ticket de Adquisición de Combustible</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-secondary text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                    {selectedAcquisition.isQr ? 'Compra QR' : 'Vales de Gasolina'}
                  </div>
                  <p className="text-xs font-bold text-text-muted">
                    No. <span className="font-black text-blue-600 text-lg ml-1">{selectedAcquisition.consecutiveNumber || '---'}</span>
                  </p>
                  <p className="text-xs font-bold text-text-muted">
                    FOLIO INTERNO: <span className="font-black text-text text-lg ml-1">{(selectedAcquisition.internalFolio || 'S/N').toUpperCase()}</span>
                  </p>
                  <p className="text-[9pt] text-text-muted font-bold mt-1">
                    Fecha: {selectedAcquisition.date ? new Date(selectedAcquisition.date).toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'}) : '---'}
                  </p>
                  <p className="text-[8pt] text-slate-300 font-bold mt-1">
                    Generado: {new Date().toLocaleDateString('es-ES', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}
                  </p>
                </div>
              </div>

              <div className="bg-surface-subtle border border-border rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-3 text-[9pt]">
                  <p><span className="font-black text-text-muted uppercase tracking-wider">Fecha Registro:</span> <span className="font-bold text-text">{selectedAcquisition.date ? new Date(selectedAcquisition.date).toLocaleDateString('es-ES') : '---'}</span></p>
                  <p><span className="font-black text-text-muted uppercase tracking-wider">Área:</span> <span className="font-bold text-text">{selectedAcquisition.area}</span></p>
                  <p><span className="font-black text-text-muted uppercase tracking-wider">Rango Vigencia:</span> <span className="font-bold text-text">{selectedAcquisition.validFrom ? new Date(selectedAcquisition.validFrom).toLocaleDateString('es-ES') : '---'} - {selectedAcquisition.validTo ? new Date(selectedAcquisition.validTo).toLocaleDateString('es-ES') : '---'}</span></p>
                  <p><span className="font-black text-text-muted uppercase tracking-wider">Modalidad:</span> <span className="font-bold text-text">{selectedAcquisition.isQr ? 'CÓDIGO QR' : 'VALES'}</span></p>
                </div>
              </div>

              <div className="mb-8 bg-surface-subtle border border-border rounded-lg p-6">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[8pt] font-black text-text-muted uppercase tracking-widest mb-1">Proveedor</p>
                    <p className="text-[12pt] font-black text-text uppercase break-words">{selectedAcquisition.supplier}</p>
                  </div>
                  <div className="text-right border-l border-border pl-8">
                    <p className="text-[8pt] font-black text-text-muted uppercase tracking-widest mb-1">Monto de Adquisición</p>
                    <p className="text-[20pt] font-black text-primary tracking-tighter">${(Number(selectedAcquisition.amount) || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-12">
                <div className="bg-secondary text-white px-4 py-1.5 text-[9pt] font-black uppercase tracking-widest mb-4 inline-block rounded-sm">
                  Descripcion / Concepto
                </div>
                <div className="bg-surface p-4 rounded-lg border border-border">
                  <p className="text-[10pt] text-text leading-relaxed break-words">
                    {selectedAcquisition.description || 'Sin descripción.'}
                  </p>
                </div>
              </div>

              <div className="signature-section">
                <div className="grid grid-cols-3 gap-12 text-center">
                  <div className="signature-line border-t-2 border-slate-900 pt-4">
                    <p className="text-[9pt] font-black uppercase text-text">{administrativeCoordinatorName}</p>
                    <p className="text-[7pt] font-bold text-text-muted mt-1 uppercase tracking-widest">{administrativeCoordinatorPos}</p>
                    <p className="text-[7pt] font-bold text-text-muted uppercase tracking-widest">Vo. Bo.</p>
                  </div>
                  <div className="signature-line border-t-2 border-slate-900 pt-4">
                    <p className="text-[9pt] font-black uppercase text-text">{directorName}</p>
                    <p className="text-[7pt] font-bold text-text-muted mt-1 uppercase tracking-widest">Director General</p>
                    <p className="text-[7pt] font-bold text-text-muted uppercase tracking-widest">Autorizacion</p>
                  </div>
                  <div className="signature-line border-t-2 border-slate-900 pt-4">
                    <p className="text-[9pt] font-black uppercase text-text">Nombre y Firma</p>
                    <p className="text-[7pt] font-bold text-text-muted mt-1 uppercase tracking-widest">Recibido</p>
                    <p className="text-[7pt] font-bold text-text-muted uppercase tracking-widest">Sello</p>
                  </div>
                </div>
                <div className="text-center mt-8 border-t border-border pt-2">
                  <p className="text-[7pt] font-black text-slate-300 uppercase tracking-[0.3em]">Sistema de Gestion de Parque Vehicular • DIF Municipal La Paz</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      , document.getElementById('print-portal')!)}

      {showPrintPreview && document.getElementById('print-portal') && createPortal(
        <div id="fuel-loads-report-modal" className="fixed inset-0 z-[200] bg-surface flex flex-col overflow-y-auto">
           <div className="sticky top-0 bg-secondary p-4 flex justify-between items-center text-white shadow-lg no-print">
             <div className="flex items-center gap-4">
               <button onClick={() => setShowPrintPreview(false)} className="bg-surface/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-surface/20 transition-all">Cerrar</button>
               <h3 className="font-black uppercase tracking-widest text-sm">Vista Previa de Impresión</h3>
             </div>
             <button onClick={() => window.print()} className="bg-primary px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
               <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Imprimir Reporte PDF
             </button>
           </div>
           <div className="print-page-host flex-1 bg-surface-subtle p-10 flex justify-center">
              <div id="fuel-printable" className="bg-surface w-[27.94cm] min-h-[21.59cm] p-[1.5cm] shadow-2xl relative text-text">
                
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
                      <span className="text-lg font-black text-text uppercase leading-none tracking-tight">Sistema para el Desarrollo Integral de la Familia</span>
                      <span className="text-lg font-black text-text uppercase leading-tight tracking-tight">del Municipio de La Paz B.C.S.</span>
                      <span className="text-[8pt] font-bold uppercase text-text-muted mt-2 tracking-[0.2em]">Parque Vehicular • Control de Combustible</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-secondary text-white px-4 py-1.5 font-black text-[10pt] uppercase tracking-widest rounded-sm mb-2">
                        Bitácora General
                    </div>
                    <p className="text-[9pt] text-text-muted font-bold mt-1">Fecha de Emisión: {new Date().toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
                  </div>
                </div>

                <div className="flex gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex-1">
                        <p className="text-[8pt] font-black text-blue-600 uppercase tracking-widest mb-1">Total Ejercido</p>
                        <p className="text-2xl font-black text-text">${(totalCost || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-surface-subtle border border-border p-4 rounded-lg flex-1">
                        <p className="text-[8pt] font-black text-text-muted uppercase tracking-widest mb-1">Litros Consumidos</p>
                        <p className="text-2xl font-black text-text">{(totalLiters || 0).toLocaleString()} L</p>
                    </div>
                    <div className="bg-surface-subtle border border-border p-4 rounded-lg flex-1">
                        <p className="text-[8pt] font-black text-text-muted uppercase tracking-widest mb-1">Rendimiento Promedio</p>
                        <p className="text-2xl font-black text-text">{globalAveragePerformance > 0 ? globalAveragePerformance.toFixed(2) : "---"} KM/L</p>
                    </div>
                </div>

                {/* Tabla */}
                <div className="mb-8">
                  <table className="w-full border-collapse border border-slate-300">
                    <thead className="bg-surface-subtle">
                      <tr>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted w-24">Fecha</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Vehículo</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted">Conductor</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted text-right">Odómetro</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted text-right">Litros</th>
                        <th className="border border-slate-300 px-2 py-2 text-[8pt] font-black uppercase text-text-muted text-right">Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedHistory.map((entry, idx) => {
                        const vehicle = vehicles.find(v => v.id === entry.vehicleId);
                        const driver = drivers.find(d => d.id === entry.driverId);
                        return (
                          <tr key={idx} className="border-b border-slate-300">
                            <td className="px-2 py-2 text-[8pt] font-bold text-center text-text-muted">
                              {entry.date ? new Date(entry.date).toLocaleDateString('es-ES') : '-'}
                            </td>
                            <td className="px-2 py-2 text-[8pt] font-black text-text uppercase">
                              {vehicle?.plate || '---'} ({vehicle?.model || ''})
                            </td>
                            <td className="px-2 py-2 text-[8pt] font-bold text-text uppercase">
                              {driver?.name || '---'}
                            </td>
                            <td className="px-2 py-2 text-[8pt] text-right font-mono">
                              {(Number(entry.odometer) || 0).toLocaleString()}
                            </td>
                            <td className="px-2 py-2 text-[8pt] text-right font-mono">
                              {entry.liters}
                            </td>
                            <td className="px-2 py-2 text-[8pt] text-right font-black text-text font-mono">
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
                             <p className="text-[9pt] font-black uppercase text-text">{managerName}</p>
                             <p className="text-[7pt] font-bold text-text-muted mt-1 uppercase tracking-widest">Encargado del Parque Vehicular</p>
                             <p className="text-[7pt] font-bold text-text-muted uppercase tracking-widest">Elaboró</p>
                         </div>
                         <div className="signature-line border-t-2 border-slate-900 pt-4">
                             <p className="text-[9pt] font-black uppercase text-text">{directorName}</p>
                             <p className="text-[7pt] font-bold text-text-muted mt-1 uppercase tracking-widest">Director General</p>
                             <p className="text-[7pt] font-bold text-text-muted uppercase tracking-widest">Enterado</p>
                         </div>
                     </div>
                     <div className="text-center mt-8 border-t border-border pt-2">
                         <p className="text-[7pt] font-black text-slate-300 uppercase tracking-[0.3em]">Sistema de Gestion de Parque Vehicular • DIF Municipal La Paz</p>
                     </div>
                 </div>
              </div>
           </div>
        </div>
      , document.getElementById('print-portal')!)}
    </div>
  );
};

const FuelStat: React.FC<{ label: string, value: string, unit?: string, icon: string, trend?: string, isNegativeTrend?: boolean, desc?: string }> = ({ label, value, unit, icon, trend, isNegativeTrend, desc }) => (
  <div className="bg-surface p-6 rounded-2xl border border-border group hover:border-blue-500/30 transition-all">
    <div className="flex items-center justify-between mb-4">
      <p className="text-text-muted text-xs font-bold uppercase tracking-widest">{label}</p>
      <div className="bg-blue-50 text-blue-600 p-2 rounded-xl group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-text text-3xl font-black tracking-tighter">
        {value} {unit && <span className="text-lg text-text-muted font-bold ml-1">{unit}</span>}
      </p>
      {trend && <p className={`${isNegativeTrend ? 'text-rose-600' : 'text-green-600'} text-[11px] font-black`}>{trend}</p>}
      {desc && <p className="text-[11px] text-text-muted font-bold uppercase tracking-wider">{desc}</p>}
    </div>
  </div>
);

export default Fuel;
