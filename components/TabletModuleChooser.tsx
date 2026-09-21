import React, { useMemo } from 'react';
import { AppSetting, User } from '../types';

const DEFAULT_LOGO_SRC = '/images/logo-dif.png';

const resolveLogoSrc = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_LOGO_SRC;
  if (/^(https?:|data:|blob:|file:)/i.test(trimmed)) return trimmed;
  return '/' + trimmed.replace(/^\/+/, '');
};

interface TabletModuleChooserProps {
  settings?: AppSetting[];
  currentUser: User;
  onOpenRequest: () => void;
  onOpenTravelLog: () => void;
  onLogout: () => void;
}

const TabletModuleChooser: React.FC<TabletModuleChooserProps> = ({
  settings = [],
  currentUser,
  onOpenRequest,
  onOpenTravelLog,
  onLogout
}) => {
  const settingsMap = useMemo(() => Object.fromEntries(settings.map(setting => [setting.key, setting.value])), [settings]);
  const logoSrc = resolveLogoSrc(settingsMap.APP_LOGO);

  return (
    <div className="unified-ui min-h-screen bg-surface-subtle text-text">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-surface/95 px-4 py-4 backdrop-blur sm:px-8">
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
              <p className="truncate text-sm font-black tracking-tight text-slate-900">{settingsMap.APP_NAME || 'DIF La Paz Flota'}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-black text-slate-900">{currentUser.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Auxiliar</p>
            </div>
            <button type="button" onClick={onLogout} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:border-slate-300 hover:text-slate-900">
              <span className="material-symbols-outlined ui-icon text-lg">logout</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-5xl flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 text-center">
          <h1 className="page-title text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">¿Qué deseas registrar?</h1>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <button
            type="button"
            onClick={onOpenRequest}
            className="card-lg group flex min-h-[280px] flex-col justify-between p-7 text-left transition hover:-translate-y-1 sm:p-9"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d5003b]/10 text-[#d5003b] transition group-hover:bg-[#d5003b] group-hover:text-white">
              <span className="material-symbols-outlined ui-icon text-4xl">assignment</span>
            </span>
            <span className="mt-8">
              <span className="block text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Solicitud de viaje</span>
              <span className="mt-2 block text-sm font-semibold text-slate-500">Registra una salida solicitada o imprevista.</span>
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenTravelLog}
            className="card-lg group flex min-h-[280px] flex-col justify-between bg-secondary p-7 text-left text-secondary-invert transition hover:-translate-y-1 sm:p-9"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white transition group-hover:bg-white group-hover:text-slate-950">
              <span className="material-symbols-outlined ui-icon text-4xl">route</span>
            </span>
            <span className="mt-8">
              <span className="block text-2xl font-black tracking-tight text-white sm:text-3xl">Llenar bitácora</span>
              <span className="mt-2 block text-sm font-semibold text-slate-300">Captura el viaje real de la unidad.</span>
            </span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default TabletModuleChooser;
