import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppSetting, Area, User, Vehicle, VehicleRequest } from '../types';
import { formatDate, formatTime, timeToMinutes } from '../utils/dateTime';

const DEFAULT_LOGO_SRC = '/images/logo-dif.png';

const resolveLogoSrc = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_LOGO_SRC;
  if (/^(https?:|data:|blob:|file:)/i.test(trimmed)) return trimmed;
  return '/' + trimmed.replace(/^\/+/, '');
};

interface VehicleRequestsProps {
  requests: VehicleRequest[];
  vehicles: Vehicle[];
  areas: Area[];
  settings?: AppSetting[];
  currentUser: User;
  variant?: 'desktop' | 'tablet';
  onAddRequest: (request: Omit<VehicleRequest, 'id' | 'status'>) => Promise<void>;
  onSync: () => void | Promise<void>;
  onLogout?: () => void;
  onOpenTravelLog?: () => void;
  onUpdateRequestStatus?: (request: VehicleRequest) => Promise<void>;
  onStartTravelLog?: (request: VehicleRequest) => void;
}

type RequestFormData = Omit<VehicleRequest, 'id' | 'status'>;
type RequestStep = 0 | 1 | 2 | 3;

const requestSteps = [
  { title: 'Datos de solicitud', icon: 'calendar_month' },
  { title: 'Área y vehículo', icon: 'directions_car' },
  { title: 'Datos del traslado', icon: 'schedule' },
  { title: 'Nombre y firma', icon: 'draw' }
] as const;

const initialFormData = (): RequestFormData => ({
  filledDate: new Date().toISOString().split('T')[0],
  travelDate: new Date().toISOString().split('T')[0],
  requesterName: '',
  areaId: '',
  vehicleId: '',
  passengers: 1,
  departureTime: '',
  returnTime: '',
  activity: '',
  signatureName: '',
  signatureData: ''
});

const SHARED_TRIP_WINDOW_MINUTES = 60;


const VehicleRequests: React.FC<VehicleRequestsProps> = ({
  requests,
  vehicles,
  areas,
  settings = [],
  currentUser,
  variant = 'desktop',
  onAddRequest,
  onSync,
  onLogout,
  onOpenTravelLog,
  onUpdateRequestStatus,
  onStartTravelLog
}) => {
  const isTablet = variant === 'tablet';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<RequestStep>(0);
  const [form, setForm] = useState<RequestFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureDataRef = useRef('');
  const drawingRef = useRef(false);
  const settingsMap = useMemo(() => Object.fromEntries(settings.map(setting => [setting.key, setting.value])), [settings]);
  const logoSrc = resolveLogoSrc(settingsMap.APP_LOGO);
  const availableVehicles = useMemo(() => vehicles.filter(vehicle => vehicle.status !== 'inactive'), [vehicles]);
  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => String(b.filledDate || '').localeCompare(String(a.filledDate || ''))),
    [requests]
  );


  const sharedTripSuggestions = useMemo(() => {
    const candidates = sortedRequests.filter(request => request.status === 'pending' || request.status === 'approved');
    const suggestions: Array<{ first: VehicleRequest; second: VehicleRequest; departureGap: number }> = [];

    for (let firstIndex = 0; firstIndex < candidates.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
        const first = candidates[firstIndex];
        const second = candidates[secondIndex];
        if (first.travelDate !== second.travelDate) continue;

        const firstDeparture = timeToMinutes(first.departureTime);
        const secondDeparture = timeToMinutes(second.departureTime);
        const firstReturn = timeToMinutes(first.returnTime);
        const secondReturn = timeToMinutes(second.returnTime);
        if (firstDeparture === null || secondDeparture === null || firstReturn === null || secondReturn === null) continue;

        const departureGap = Math.abs(firstDeparture - secondDeparture);
        const returnGap = Math.abs(firstReturn - secondReturn);
        if (departureGap <= SHARED_TRIP_WINDOW_MINUTES && returnGap <= SHARED_TRIP_WINDOW_MINUTES) {
          suggestions.push({ first, second, departureGap });
        }
      }
    }

    return suggestions.sort((a, b) => a.departureGap - b.departureGap).slice(0, 6);
  }, [sortedRequests]);
  const inputClass = 'form-input mt-2 text-lg font-semibold disabled:opacity-60';
  const labelClass = 'label';

  const updateField = <K extends keyof RequestFormData>(key: K, value: RequestFormData[K]) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setError('');
    setSuccess('');
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
    setForm(previous => ({ ...previous, signatureData: '' }));
    setError('');
  };

  const resetForm = () => {
    setStep(0);
    setForm(initialFormData());
    signatureDataRef.current = '';
    drawingRef.current = false;
    setError('');
    setSuccess('');
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isSaving) {
      setIsModalOpen(false);
      setError('');
    }
  };

  const validateStep = (currentStep: RequestStep) => {
    if (currentStep === 0) {
      if (!form.filledDate) return 'Selecciona la fecha de llenado.';
      if (!form.travelDate) return 'Selecciona la fecha de traslado.';
      if (!form.requesterName.trim()) return 'Escribe el nombre de quien solicita.';
    }

    if (currentStep === 1) {
      if (!form.areaId) return 'Selecciona el área solicitante.';
      if (!form.vehicleId) return 'Selecciona el vehículo solicitado.';
    }

    if (currentStep === 2) {
      if (!Number.isInteger(Number(form.passengers)) || Number(form.passengers) < 1) return 'Indica al menos un pasajero.';
      if (!form.departureTime) return 'Indica la hora estimada de salida.';
      if (!form.returnTime) return 'Indica la hora estimada de regreso.';
      if (!form.activity.trim()) return 'Escribe la actividad o motivo de salida.';
    }

    if (currentStep === 3) {
      if (!form.signatureName.trim()) return 'Escribe el nombre de quien firma.';
      if (!signatureDataRef.current) return 'Realiza la firma antes de guardar la solicitud.';
    }

    return '';
  };

  const handleNext = () => {
    const stepError = validateStep(step);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError('');
    setStep(previous => Math.min(3, previous + 1) as RequestStep);
  };

  const handleBack = () => {
    setError('');
    setStep(previous => Math.max(0, previous - 1) as RequestStep);
  };

  const prepareCanvas = () => {
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
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 4;
    context.strokeStyle = '#0f172a';

    if (signatureDataRef.current) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = signatureDataRef.current;
    }
  };

  useEffect(() => {
    if (!isModalOpen || step !== 3) return;
    const frame = window.requestAnimationFrame(prepareCanvas);
    window.addEventListener('resize', prepareCanvas);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', prepareCanvas);
    };
  }, [isModalOpen, step]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handleSignatureStart = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const context = event.currentTarget.getContext('2d');
    if (!context) return;
    const point = getCanvasPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const handleSignatureMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const context = event.currentTarget.getContext('2d');
    if (!context) return;
    const point = getCanvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const finishSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const dataUrl = event.currentTarget.toDataURL('image/png');
    signatureDataRef.current = dataUrl;
    setForm(previous => ({ ...previous, signatureData: dataUrl }));
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const stepsToValidate: RequestStep[] = [0, 1, 2, 3];
    for (const currentStep of stepsToValidate) {
      const stepError = validateStep(currentStep);
      if (stepError) {
        setStep(currentStep);
        setError(stepError);
        return;
      }
    }

    setIsSaving(true);
    setError('');
    try {
      await onAddRequest({
        ...form,
        requesterName: form.requesterName.trim().toUpperCase(),
        activity: form.activity.trim().toUpperCase(),
        signatureName: form.signatureName.trim().toUpperCase(),
        passengers: Number(form.passengers),
        signatureData: signatureDataRef.current
      });
      setSuccess('Solicitud registrada.');
      setTimeout(() => {
        setIsModalOpen(false);
        resetForm();
      }, 550);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo registrar la solicitud.');
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

  const getVehicleLabel = (id: string) => {
    const vehicle = vehicles.find(item => item.id === id);
    return vehicle ? vehicle.plate + ' · ' + vehicle.model : id || 'Sin unidad';
  };

  const getAreaLabel = (id: string) => areas.find(item => item.id === id)?.name || id || 'Sin área';

  return (
    <div className={isTablet ? 'unified-ui min-h-screen bg-surface-subtle' : 'unified-ui h-full'}>
      {isTablet && (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-surface/95 px-4 py-4 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={logoSrc}
                alt="DIF"
                className="h-11 w-11 rounded-xl object-contain"
                onError={event => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = DEFAULT_LOGO_SRC;
                }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-black tracking-tight text-slate-900">Solicitudes de vehículo</p>
                <p className="truncate text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{currentUser.name}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {onOpenTravelLog && (
                <button type="button" onClick={onOpenTravelLog} className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 sm:inline-flex">
                  <span className="material-symbols-outlined ui-icon mr-1 text-base">route</span>
                  Bitácora
                </button>
              )}
              {onLogout && (
                <button type="button" onClick={onLogout} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">
                  Salir
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      <main className={isTablet ? 'mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10' : 'w-full space-y-8 pb-20'}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="page-title text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Solicitudes de vehículo</h1>
            <p className="page-subtitle mt-2 max-w-xl text-sm font-medium text-slate-500">Los horarios reales se completan en la bitácora.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleSync} disabled={isSyncing} className="btn btn-secondary px-4 py-3 text-xs font-black uppercase tracking-wide disabled:opacity-60">
              <span className={'material-symbols-outlined ui-icon mr-2 text-lg ' + (isSyncing ? 'animate-spin' : '')}>sync</span>
              Actualizar
            </button>
            <button type="button" onClick={openModal} className="btn btn-primary px-4 py-3 text-xs font-black uppercase tracking-wide">
              <span className="material-symbols-outlined ui-icon mr-2 text-lg">add</span>
              Nueva solicitud
            </button>
          </div>
        </div>


        {onUpdateRequestStatus && sharedTripSuggestions.length > 0 && (
          <section className="overflow-hidden rounded-3xl border border-amber-200 bg-amber-50/60 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-amber-100 px-5 py-4 sm:px-7">
              <div>
                <h2 className="text-lg font-black text-slate-950">Optimización de viajes</h2>
                <p className="mt-1 max-w-2xl text-xs font-semibold text-amber-900/70">Candidatos por fecha y horarios estimados cercanos. Confirma destino y ruta antes de compartir vehículo y tripulación.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-800 shadow-sm">{sharedTripSuggestions.length}</span>
            </div>
            <div className="divide-y divide-amber-100">
              {sharedTripSuggestions.map(suggestion => (
                <div key={suggestion.first.id + '-' + suggestion.second.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <div>
                    <p className="text-sm font-black text-slate-900">{suggestion.first.requesterName} + {suggestion.second.requesterName}</p>
                    <p className="mt-1 text-xs font-semibold text-amber-900/70">{formatDate(suggestion.first.travelDate)} · Salidas {formatTime(suggestion.first.departureTime) || '--:--'} / {formatTime(suggestion.second.departureTime) || '--:--'} · Regresos {formatTime(suggestion.first.returnTime) || '--:--'} / {formatTime(suggestion.second.returnTime) || '--:--'}</p>
                  </div>
                  <span className="text-xs font-black text-amber-900">{suggestion.first.passengers + suggestion.second.passengers} pasajeros</span>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-8">
            <div>
              <h2 className="text-lg font-black text-slate-950">Historial</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{sortedRequests.length}</span>
          </div>
          {sortedRequests.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="material-symbols-outlined ui-icon text-5xl text-slate-300">assignment</span>
              <p className="mt-3 text-sm font-black text-slate-700">Aún no hay solicitudes</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedRequests.map(request => (
                <article key={request.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#d5003b]/10 text-[#d5003b]">
                      <span className="material-symbols-outlined ui-icon">assignment</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">{request.requesterName || 'Sin solicitante'}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{request.activity || 'Sin motivo'}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-400">{formatDate(request.travelDate)} · {getAreaLabel(request.areaId)} · {getVehicleLabel(request.vehicleId)}</p>
                      <p className="mt-1 text-xs font-bold text-slate-400">Estimado: {formatTime(request.departureTime) || '--:--'} – {formatTime(request.returnTime) || '--:--'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-14 sm:justify-end sm:pl-0">
                    <span className="text-xs font-bold text-slate-500">{request.passengers} pasajero{request.passengers === 1 ? '' : 's'}</span>
                    <span className={'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ' + (
                      request.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                      request.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                      request.status === 'rejected' ? 'bg-rose-50 text-rose-700' :
                      'bg-amber-50 text-amber-700'
                    )}>
                      {request.status === 'approved' ? 'Aprobada' : request.status === 'completed' ? 'Atendida' : request.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                    </span>
                    {onUpdateRequestStatus && request.status === 'pending' && (
                      <>
                        <button type="button" onClick={() => onUpdateRequestStatus({ ...request, status: 'approved' })} className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white hover:bg-emerald-700">
                          Aprobar
                        </button>
                        <button type="button" onClick={() => onUpdateRequestStatus({ ...request, status: 'rejected' })} className="rounded-xl border border-rose-200 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-rose-700 hover:bg-rose-50">
                          Rechazar
                        </button>
                      </>
                    )}
                    {onStartTravelLog && request.status === 'approved' && (
                      <button type="button" onClick={() => onStartTravelLog(request)} className="rounded-xl bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white hover:opacity-90">
                        {request.travelLogId ? 'Abrir bitácora' : 'Crear bitácora'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={event => {
          if (event.target === event.currentTarget) closeModal();
        }}>
          <div role="dialog" aria-modal="true" aria-labelledby="vehicle-request-title" className="modal my-1 max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-y-auto sm:my-6 sm:max-h-[calc(100dvh-3rem)]">
            <form onSubmit={handleSubmit} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-8">
                <div>
                  <h2 id="vehicle-request-title" className="text-2xl font-black tracking-tight text-slate-950">{requestSteps[step].title}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex">
                    <span className="material-symbols-outlined ui-icon text-2xl">{requestSteps[step].icon}</span>
                  </span>
                  <button type="button" onClick={closeModal} disabled={isSaving} aria-label="Cerrar formulario" className="flex h-12 w-12 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50">
                    <span className="material-symbols-outlined ui-icon text-2xl">close</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border-b border-slate-100 px-5 py-4 sm:px-8">
                <ol className="flex min-w-[560px] items-start">
                  {requestSteps.map((item, index) => (
                    <li key={item.title} className="flex flex-1 items-start">
                      <div className="flex min-w-0 flex-col items-center text-center">
                        <div className={'flex h-10 w-10 items-center justify-center rounded-full border-2 transition ' + (index <= step ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-transparent text-slate-400')}>
                          {index < step ? <span className="material-symbols-outlined ui-icon">check</span> : <span className="material-symbols-outlined ui-icon">{item.icon}</span>}
                        </div>
                        <span className={'mt-2 text-[10px] font-black uppercase tracking-widest ' + (index === step ? 'text-primary' : 'text-slate-500')}>{item.title}</span>
                      </div>
                      {index < requestSteps.length - 1 && <div className={'mt-5 h-0.5 flex-1 ' + (index < step ? 'bg-primary' : 'bg-slate-300')} />}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="min-h-[330px] px-5 py-7 sm:px-8 sm:py-9">
                {step === 0 && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="request-filled-date">Fecha de llenado</label>
                      <input id="request-filled-date" type="date" className={inputClass} value={form.filledDate} onChange={event => updateField('filledDate', event.target.value)} disabled={isSaving} />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="request-travel-date">Fecha de traslado</label>
                      <input id="request-travel-date" type="date" className={inputClass} value={form.travelDate} onChange={event => updateField('travelDate', event.target.value)} disabled={isSaving} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass} htmlFor="requester-name">Nombre de quien solicita</label>
                      <input id="requester-name" className={inputClass} value={form.requesterName} onChange={event => updateField('requesterName', event.target.value)} placeholder="Nombre completo" disabled={isSaving} />
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="request-area">Área solicitante</label>
                      <select id="request-area" className={inputClass} value={form.areaId} onChange={event => updateField('areaId', event.target.value)} disabled={isSaving}>
                        <option value="">Seleccionar área...</option>
                        {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="request-vehicle">Vehículo solicitado</label>
                      <select id="request-vehicle" className={inputClass} value={form.vehicleId} onChange={event => updateField('vehicleId', event.target.value)} disabled={isSaving}>
                        <option value="">Seleccionar unidad...</option>
                        {availableVehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} · {vehicle.model}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-3">
                      <div>
                        <label className={labelClass} htmlFor="request-passengers">Número de pasajeros</label>
                        <input id="request-passengers" type="number" min="1" step="1" inputMode="numeric" className={inputClass} value={form.passengers} onChange={event => updateField('passengers', Number(event.target.value))} disabled={isSaving} />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="request-departure">Hora estimada de salida</label>
                        <input id="request-departure" type="time" className={inputClass} value={form.departureTime} onChange={event => updateField('departureTime', event.target.value)} disabled={isSaving} />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="request-return">Hora estimada de regreso</label>
                        <input id="request-return" type="time" className={inputClass} value={form.returnTime} onChange={event => updateField('returnTime', event.target.value)} disabled={isSaving} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="request-activity">Actividad / motivo de salida</label>
                      <textarea id="request-activity" rows={4} className={inputClass + ' py-4'} value={form.activity} onChange={event => updateField('activity', event.target.value)} placeholder="Describe brevemente el motivo del traslado" disabled={isSaving} />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <div className="mb-5">
                      <label className={labelClass} htmlFor="request-signature-name">Nombre de quien solicita</label>
                      <input id="request-signature-name" className={inputClass} value={form.signatureName} onChange={event => updateField('signatureName', event.target.value)} placeholder="Nombre escrito de quien firma" disabled={isSaving} />
                    </div>
                    <div className="overflow-hidden rounded-3xl border-2 border-dashed border-slate-300 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                        <p className="text-sm font-black text-slate-900">Firma digital</p>
                        <button type="button" onClick={clearSignature} disabled={!signatureDataRef.current || isSaving} className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black uppercase tracking-widest text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-40">
                          <span className="material-symbols-outlined ui-icon text-lg">restart_alt</span>
                          Limpiar
                        </button>
                      </div>
                      <canvas
                        ref={canvasRef}
                        className="block h-[58vh] min-h-[360px] w-full cursor-crosshair touch-none bg-white"
                        onPointerDown={handleSignatureStart}
                        onPointerMove={handleSignatureMove}
                        onPointerUp={finishSignature}
                        onPointerCancel={finishSignature}
                        aria-label="Área para firmar"
                      />
                      <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        <span className="material-symbols-outlined ui-icon text-base">draw</span>
                        {signatureDataRef.current ? 'Firma capturada' : 'Tu firma aparecerá aquí'}
                      </div>
                    </div>
                  </div>
                )}

                {error && <p role="alert" className="mt-6 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-relaxed text-rose-800"><span className="material-symbols-outlined ui-icon text-lg">error</span>{error}</p>}
                {success && <p role="status" className="mt-6 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold leading-relaxed text-emerald-800"><span className="material-symbols-outlined ui-icon text-lg">check_circle</span>{success}</p>}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:flex-row sm:justify-between sm:px-8">
                <button type="button" onClick={handleBack} disabled={step === 0 || isSaving} className="min-h-14 rounded-2xl px-5 text-sm font-black uppercase tracking-widest text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:invisible">Atrás</button>
                {step < 3 ? (
                  <button type="button" onClick={handleNext} disabled={isSaving} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-8 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:opacity-50 sm:min-w-[220px]">
                    Continuar
                    <span className="material-symbols-outlined ui-icon text-lg">arrow_forward</span>
                  </button>
                ) : (
                  <button type="submit" disabled={isSaving} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50 sm:min-w-[300px]">
                    <span className={'material-symbols-outlined ui-icon text-lg ' + (isSaving ? 'animate-spin' : '')}>{isSaving ? 'sync' : 'check_circle'}</span>
                    {isSaving ? 'Guardando...' : 'Registrar solicitud'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleRequests;
