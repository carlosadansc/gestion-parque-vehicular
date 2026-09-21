import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppSetting, Area, Driver, TravelLog, User, Vehicle } from '../types';
import { formatDate as formatDateValue, toTimeInputValue } from '../utils/dateTime';

const DEFAULT_LOGO_SRC = '/images/logo-dif.png';

const resolveLogoSrc = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_LOGO_SRC;
  if (/^(https?:|data:|blob:|file:)/i.test(trimmed)) return trimmed;
  return '/' + trimmed.replace(/^\/+/, '');
};

interface TabletTravelLogProps {
  travelLogs: TravelLog[];
  vehicles: Vehicle[];
  drivers: Driver[];
  areas: Area[];
  settings?: AppSetting[];
  currentUser: User;
  onAddTravelLog: (log: Omit<TravelLog, 'id'>) => Promise<void>;
  onUpdateTravelLog?: (log: TravelLog) => Promise<void>;
  onSync: () => void | Promise<void>;
  onLogout: () => void;
  onOpenRequests?: () => void;
}

type Step = 0 | 1 | 2 | 3 | 4;

type TabletFormData = {
  date: string;
  departureTime: string;
  arrivalTime: string;
  driverId: string;
  vehicleId: string;
  initialOdometer: string;
  finalOdometer: string;
  destination: string;
  areaId: string;
  notes: string;
  initialFuelLevel: string;
  finalFuelLevel: string;
  signatureName: string;
  requestId: string;
};

const today = () => new Date().toISOString().split('T')[0];

const initialFormData = (): TabletFormData => ({
  date: today(),
  departureTime: '',
  arrivalTime: '',
  driverId: '',
  vehicleId: '',
  initialOdometer: '',
  finalOdometer: '',
  destination: '',
  areaId: '',
  notes: '',
  initialFuelLevel: '100',
  finalFuelLevel: '100',
  signatureName: '',
  requestId: ''
});

const formatDate = (value: string) => formatDateValue(value);

const formDataFromLog = (log: TravelLog): TabletFormData => ({
  date: String(log.date || '').slice(0, 10) || today(),
  departureTime: toTimeInputValue(log.departureTime),
  arrivalTime: toTimeInputValue(log.arrivalTime),
  driverId: String(log.driverId || ''),
  vehicleId: String(log.vehicleId || ''),
  initialOdometer: String(log.initialOdometer ?? ''),
  finalOdometer: Number(log.finalOdometer) > 0 ? String(log.finalOdometer) : '',
  destination: String(log.destination || ''),
  areaId: String(log.areaId || ''),
  notes: String(log.notes || ''),
  initialFuelLevel: String(log.initialFuelLevel ?? 100),
  finalFuelLevel: String(log.finalFuelLevel ?? 100),
  signatureName: String(log.signatureName || ''),
  requestId: String(log.requestId || '')
});

const TabletTravelLog: React.FC<TabletTravelLogProps> = ({
  travelLogs,
  vehicles,
  drivers,
  areas,
  settings = [],
  currentUser,
  onAddTravelLog,
  onSync,
  onLogout, onOpenRequests, onUpdateTravelLog
}) => {
  const [step, setStep] = useState<Step>(0);
  const [formData, setFormData] = useState<TabletFormData>(initialFormData);
  const [editingLog, setEditingLog] = useState<TravelLog | null>(null);
  const [signatureData, setSignatureData] = useState('');
  const signatureDataRef = useRef('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    settings.forEach(setting => { map[setting.key] = setting.value; });
    return map;
  }, [settings]);

  const logoSrc = resolveLogoSrc(settingsMap.APP_LOGO);

  const recentLogs = travelLogs.slice(0, 6);

  const steps = [
    { title: 'Unidad y chofer', icon: 'directions_car' },
    { title: 'Datos de salida', icon: 'logout' },
    { title: 'Destino', icon: 'location_on' },
    { title: 'Datos de regreso', icon: 'login' },
    { title: 'Nombre y firma', icon: 'draw' }
  ] as const;

  const updateField = <K extends keyof TabletFormData>(field: K, value: TabletFormData[K]) => {
    setFormData(previous => ({ ...previous, [field]: value }));
    setFormError('');
    setSuccessMessage('');
  };

  const validateStep = (currentStep: Step) => {
    if (currentStep === 0) {
      if (!formData.vehicleId) return 'Selecciona el vehículo que realizará el viaje.';
      if (!formData.driverId) return 'Selecciona el chofer responsable.';
    }

    if (currentStep === 1) {
      if (!formData.date) return 'Selecciona la fecha del viaje.';
      if (!formData.departureTime) return 'Indica la hora de salida.';
      const initialOdometer = Number(formData.initialOdometer);
      if (formData.initialOdometer === '' || !Number.isFinite(initialOdometer) || initialOdometer < 0) {
        return 'Captura un odómetro inicial válido.';
      }
      const initialFuel = Number(formData.initialFuelLevel);
      if (!Number.isFinite(initialFuel) || initialFuel < 0 || initialFuel > 100) {
        return 'El combustible inicial debe estar entre 0 y 100%.';
      }
    }

    if (currentStep === 2) {
      if (!formData.areaId) return 'Selecciona el área solicitante.';
      if (!formData.destination.trim()) return 'Escribe el destino o motivo de la comisión.';
    }

    if (currentStep === 3) {
      if (formData.arrivalTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(formData.arrivalTime)) {
        return 'La hora de llegada no es válida.';
      }
      if (formData.finalOdometer !== '') {
        const initialOdometer = Number(formData.initialOdometer);
        const finalOdometer = Number(formData.finalOdometer);
        if (!Number.isFinite(finalOdometer) || finalOdometer < initialOdometer) {
          return 'El odómetro final no puede ser menor al inicial.';
        }
      }
      const finalFuel = Number(formData.finalFuelLevel);
      if (!Number.isFinite(finalFuel) || finalFuel < 0 || finalFuel > 100) {
        return 'El combustible final debe estar entre 0 y 100%.';
      }
    }

    if (currentStep === 4) {
      if (!formData.signatureName.trim()) return 'Escribe el nombre de la persona responsable.';
      if (!signatureDataRef.current) return 'Realiza la firma antes de guardar la bitácora.';
    }

    return '';
  };

  const handleNext = () => {
    const error = validateStep(step);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError('');
    setStep(previous => Math.min(4, previous + 1) as Step);
  };

  const handleBack = () => {
    setFormError('');
    setStep(previous => Math.max(0, previous - 1) as Step);
  };

  const resizeSignatureCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, rect.width, rect.height);
    if (signatureDataRef.current) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = signatureDataRef.current;
    }
  };

  useEffect(() => {
    if (step !== 4) return;
    const frame = window.requestAnimationFrame(resizeSignatureCanvas);
    window.addEventListener('resize', resizeSignatureCanvas);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resizeSignatureCanvas);
    };
  }, [step]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handleSignatureStart = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getCanvasPoint(event);
  };

  const handleSignatureMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = event.currentTarget;
    const context = canvas.getContext('2d');
    if (!context) return;
    const point = getCanvasPoint(event);
    hasInkRef.current = true;
    context.strokeStyle = '#0f172a';
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPointRef.current = point;
  };

  const finishSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (!hasInkRef.current) return;
    const dataUrl = event.currentTarget.toDataURL('image/png');
    signatureDataRef.current = dataUrl;
    setSignatureData(dataUrl);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) {
      const rect = canvas.getBoundingClientRect();
      context.clearRect(0, 0, rect.width, rect.height);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, rect.width, rect.height);
    }
    signatureDataRef.current = '';
    hasInkRef.current = false;
    setSignatureData('');
    setFormError('');
  };

  const resetFlow = (closeModal = true) => {
    setStep(0);
    setEditingLog(null);
    setFormData(initialFormData());
    signatureDataRef.current = '';
    hasInkRef.current = false;
    setSignatureData('');
    setFormError('');
    if (closeModal) setIsModalOpen(false);
  };

  const openForm = (log?: TravelLog) => {
    setStep(0);
    setFormError('');
    setSuccessMessage('');
    if (log) {
      setEditingLog(log);
      const nextForm = formDataFromLog(log);
      setFormData(nextForm);
      const existingSignature = log.signatureData || '';
      signatureDataRef.current = existingSignature;
      hasInkRef.current = Boolean(existingSignature);
      setSignatureData(existingSignature);
    } else {
      resetFlow(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const error = validateStep(4);
    if (error) {
      setFormError(error);
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      const payload = {
        date: formData.date,
        departureTime: formData.departureTime,
        arrivalTime: formData.arrivalTime,
        driverId: formData.driverId,
        vehicleId: formData.vehicleId,
        initialOdometer: Number(formData.initialOdometer),
        finalOdometer: Number(formData.finalOdometer) || 0,
        destination: formData.destination,
        areaId: formData.areaId,
        notes: formData.notes,
        initialFuelLevel: Number(formData.initialFuelLevel),
        finalFuelLevel: Number(formData.finalFuelLevel),
        signatureName: formData.signatureName.trim(),
        signatureData: signatureDataRef.current,
        requestId: formData.requestId || undefined,
        status: 'completed' as const
      };

      if (editingLog) {
        if (!onUpdateTravelLog) throw new Error('No se puede actualizar esta bitácora desde la tablet.');
        await onUpdateTravelLog({
          ...editingLog,
          ...payload,
          status: 'completed'
        });
      } else {
        await onAddTravelLog(payload);
      }
      setSuccessMessage(editingLog ? 'Viaje completado. La bitácora quedó actualizada.' : 'Bitácora guardada. Ya aparece en la lista de registros.');
      resetFlow();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar la bitácora.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const inputClass = 'form-input mt-2 text-lg font-semibold disabled:opacity-60';
  const labelClass = 'label';

  return (
    <div className="unified-ui min-h-screen bg-surface-subtle text-text">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-surface/95 px-4 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logoSrc}
              alt="DIF"
              className="h-11 w-11 object-contain"
              onError={event => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = DEFAULT_LOGO_SRC;
              }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight text-slate-900">{settingsMap.APP_NAME || 'DIF La Paz Flota'}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-black text-slate-900">{currentUser.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Auxiliar</p>
            </div>
            {onOpenRequests && (
              <button onClick={onOpenRequests} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:border-slate-300 hover:text-slate-900" type="button">
                <span className="material-symbols-outlined ui-icon text-lg">assignment</span>
                <span className="hidden sm:inline">Solicitudes</span>
              </button>
            )}
            <button onClick={onLogout} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:border-slate-300 hover:text-slate-900" type="button">
              <span className="material-symbols-outlined ui-icon text-lg">logout</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-8 sm:py-10">
        <div className="page-header mb-8">
          <div>
            <h1 className="page-title max-w-2xl text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">Captura el viaje, paso a paso.</h1>
          </div>
          <button onClick={handleSync} disabled={isSyncing || isSaving} type="button" className="btn btn-secondary px-5 text-xs font-black uppercase tracking-widest disabled:opacity-50">
            <span className={`material-symbols-outlined ui-icon text-lg ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
            {isSyncing ? 'Actualizando...' : 'Actualizar datos'}
          </button>
        </div>

        <div className="mb-6 overflow-x-auto pb-2">
          <ol className="flex min-w-[680px] items-start">
            {steps.map((item, index) => (
              <li key={item.title} className="flex flex-1 items-start">
                <div className="flex min-w-0 flex-col items-center text-center">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition ${index <= step ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-transparent text-slate-400'}`}>
                    {index < step ? <span className="material-symbols-outlined ui-icon">check</span> : <span className="material-symbols-outlined ui-icon">{item.icon}</span>}
                  </div>
                  <span className={`mt-2 text-[10px] font-black uppercase tracking-widest ${index === step ? 'text-primary' : 'text-slate-500'}`}>{item.title}</span>
                </div>
                {index < steps.length - 1 && <div className={`mt-6 h-0.5 flex-1 ${index < step ? 'bg-primary' : 'bg-slate-300'}`} />}
              </li>
            ))}
          </ol>
        </div>

        {!isModalOpen && (
          <section className="card-lg mb-10 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-end sm:p-8">
            <button type="button" onClick={openForm} className="flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition hover:opacity-90">
              <span className="material-symbols-outlined ui-icon text-lg">add</span>
              Nueva bitácora
            </button>
          </section>
        )}

        {successMessage && !isModalOpen && <p role="status" className="mb-8 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold leading-relaxed text-emerald-800"><span className="material-symbols-outlined ui-icon text-lg">check_circle</span>{successMessage}</p>}

        {isModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-6">
            <div className="modal my-1 max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-y-auto sm:my-6 sm:max-h-[calc(100dvh-3rem)]">
        <form onSubmit={handleSubmit} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-8">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{steps[step].title}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex">
                <span className="material-symbols-outlined ui-icon text-2xl">{steps[step].icon}</span>
              </span>
              <button type="button" onClick={() => { if (!isSaving) setIsModalOpen(false); }} disabled={isSaving} className="flex h-12 w-12 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50" aria-label="Cerrar formulario">
                <span className="material-symbols-outlined ui-icon text-2xl">close</span>
              </button>
            </div>
          </div>

          <div className="min-h-[330px] px-5 py-7 sm:px-8 sm:py-9">
            {step === 0 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="tablet-vehicle">Unidad / vehículo</label>
                  <select id="tablet-vehicle" className={inputClass} value={formData.vehicleId} onChange={event => updateField('vehicleId', event.target.value)} disabled={isSaving}>
                    <option value="">Seleccionar unidad...</option>
                    {vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate || vehicle.id} · {vehicle.model || 'Sin modelo'}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="tablet-driver">Chofer responsable</label>
                  <select id="tablet-driver" className={inputClass} value={formData.driverId} onChange={event => updateField('driverId', event.target.value)} disabled={isSaving}>
                    <option value="">Seleccionar chofer...</option>
                    {drivers.map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="tablet-date">Fecha</label>
                  <input id="tablet-date" type="date" className={inputClass} value={formData.date} onChange={event => updateField('date', event.target.value)} disabled={isSaving} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="tablet-departure">Hora de salida</label>
                  <input id="tablet-departure" type="time" className={inputClass} value={formData.departureTime} onChange={event => updateField('departureTime', event.target.value)} disabled={isSaving} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="tablet-initial-odometer">Odómetro inicial (km)</label>
                  <input id="tablet-initial-odometer" type="number" min="0" inputMode="numeric" className={inputClass} placeholder="Ej. 128450" value={formData.initialOdometer} onChange={event => updateField('initialOdometer', event.target.value)} disabled={isSaving} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="tablet-initial-fuel">Combustible inicial (%)</label>
                  <input id="tablet-initial-fuel" type="number" min="0" max="100" inputMode="numeric" className={inputClass} value={formData.initialFuelLevel} onChange={event => updateField('initialFuelLevel', event.target.value)} disabled={isSaving} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className={labelClass} htmlFor="tablet-area">Área solicitante</label>
                  <select id="tablet-area" className={inputClass} value={formData.areaId} onChange={event => updateField('areaId', event.target.value)} disabled={isSaving}>
                    <option value="">Seleccionar área...</option>
                    {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="tablet-destination">Destino / motivo de la comisión</label>
                  <input id="tablet-destination" type="text" className={inputClass} placeholder="Ej. Traslado a consulta médica" value={formData.destination} onChange={event => updateField('destination', event.target.value)} disabled={isSaving} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="tablet-notes">Observaciones <span className="font-semibold normal-case tracking-normal text-slate-400">(opcional)</span></label>
                  <textarea id="tablet-notes" rows={3} className={`${inputClass} py-4`} placeholder="Algún dato que deba quedar registrado..." value={formData.notes} onChange={event => updateField('notes', event.target.value)} disabled={isSaving} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="tablet-arrival">Hora de llegada <span className="font-semibold normal-case tracking-normal text-slate-400">(opcional)</span></label>
                    <input id="tablet-arrival" type="time" className={inputClass} value={formData.arrivalTime} onChange={event => updateField('arrivalTime', event.target.value)} disabled={isSaving} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tablet-final-odometer">Odómetro final <span className="font-semibold normal-case tracking-normal text-slate-400">(opcional)</span></label>
                    <input id="tablet-final-odometer" type="number" min="0" inputMode="numeric" className={inputClass} placeholder="Pendiente" value={formData.finalOdometer} onChange={event => updateField('finalOdometer', event.target.value)} disabled={isSaving} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="tablet-final-fuel">Combustible final (%)</label>
                    <input id="tablet-final-fuel" type="number" min="0" max="100" inputMode="numeric" className={inputClass} value={formData.finalFuelLevel} onChange={event => updateField('finalFuelLevel', event.target.value)} disabled={isSaving} />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <div className="mb-5">
                  <label className={labelClass} htmlFor="tablet-signature-name">Nombre de quien registra</label>
                  <input id="tablet-signature-name" type="text" className={inputClass} placeholder="Escribe tu nombre completo" value={formData.signatureName} onChange={event => updateField('signatureName', event.target.value)} disabled={isSaving} />
                </div>
                <div className="overflow-hidden rounded-3xl border-2 border-dashed border-slate-300 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                    <div>
                      <p className="text-sm font-black text-slate-900">Firma digital</p>
                    </div>
                    <button type="button" onClick={clearSignature} disabled={!signatureData || isSaving} className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black uppercase tracking-widest text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-40">
                      <span className="material-symbols-outlined ui-icon text-lg">restart_alt</span> Limpiar
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    className="block h-[58vh] min-h-[360px] w-full cursor-crosshair touch-none bg-white sm:h-[62vh]"
                    onPointerDown={handleSignatureStart}
                    onPointerMove={handleSignatureMove}
                    onPointerUp={finishSignature}
                    onPointerCancel={finishSignature}
                    aria-label="Área para firmar"
                  />
                  <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    <span className="material-symbols-outlined ui-icon text-base">draw</span>
                    {signatureData ? 'Firma capturada' : 'Tu firma aparecerá aquí'}
                  </div>
                </div>
              </div>
            )}

            {formError && <p role="alert" className="mt-6 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-relaxed text-rose-800"><span className="material-symbols-outlined ui-icon text-lg">error</span>{formError}</p>}
            {successMessage && <p role="status" className="mt-6 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold leading-relaxed text-emerald-800"><span className="material-symbols-outlined ui-icon text-lg">check_circle</span>{successMessage}</p>}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:flex-row sm:justify-between sm:px-8">
            <button type="button" onClick={handleBack} disabled={step === 0 || isSaving} className="min-h-14 rounded-2xl px-5 text-sm font-black uppercase tracking-widest text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:invisible">Atrás</button>
            {step < 4 ? (
              <button type="button" onClick={handleNext} disabled={isSaving} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-8 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:opacity-50 sm:min-w-[220px]">
                Continuar <span className="material-symbols-outlined ui-icon text-lg">arrow_forward</span>
              </button>
            ) : (
              <button type="submit" disabled={isSaving} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50 sm:min-w-[300px]">
                <span className={`material-symbols-outlined ui-icon text-lg ${isSaving ? 'animate-spin' : ''}`}>{isSaving ? 'sync' : 'check_circle'}</span>
                {isSaving ? 'Guardando...' : 'Guardar bitácora'}
              </button>
            )}
          </div>
        </form>
            </div>
          </div>
        )}

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title text-2xl font-black tracking-tight text-slate-950">Bitácoras capturadas</h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">{travelLogs.length} registros</span>
          </div>
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {recentLogs.map(log => {
              const vehicle = vehicles.find(item => item.id === log.vehicleId);
              const area = areas.find(item => item.id === log.areaId);
              const isComplete = log.status === 'completed' || Boolean(log.arrivalTime && Number(log.finalOdometer) > 0);
              return (
                <div key={log.id} className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><span className="material-symbols-outlined ui-icon">route</span></span>
                    <div>
                      <p className="font-black text-slate-900">{vehicle?.plate || log.vehicleId} <span className="font-semibold text-slate-400">· {log.destination}</span></p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(log.date)} · {area?.name || 'Área general'} · {log.signatureName || 'Sin firma'}</p>
                    </div>
                  </div>
                  <span className={`self-start rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest sm:self-auto ${isComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                    {isComplete ? 'Completada' : 'En ruta'}
                  </span>
                  {!isComplete && onUpdateTravelLog && (
                    <button type="button" onClick={() => openForm(log)} className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:opacity-90">
                      <span className="material-symbols-outlined ui-icon text-lg">edit</span>
                      Completar viaje
                    </button>
                    )}
                </div>
              );
            })}
            {recentLogs.length === 0 && <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500">Las bitácoras guardadas aparecerán aquí.</div>}
          </div>
        </section>
      </main>
    </div>
  );
};

export default TabletTravelLog;
