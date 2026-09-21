import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from '../types';

export type NotificationTone = 'warning' | 'danger' | 'info' | 'success';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  icon: string;
  tone: NotificationTone;
  view: View;
  timestamp?: string;
}

interface NotificationCenterProps {
  items: NotificationItem[];
  userKey?: string;
  onOpen: (item: NotificationItem) => void;
}

const toneStyles: Record<NotificationTone, { icon: string; text: string }> = {
  warning: { icon: 'bg-amber-50 text-amber-700', text: 'text-amber-700' },
  danger: { icon: 'bg-rose-50 text-rose-700', text: 'text-rose-700' },
  info: { icon: 'bg-blue-50 text-blue-700', text: 'text-blue-700' },
  success: { icon: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700' },
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ items, userKey = 'default', onOpen }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const storageKey = `fleet_notifications_seen_${userKey}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setSeenIds(stored ? JSON.parse(stored) : []);
    } catch {
      setSeenIds([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const seenSet = useMemo(() => new Set(seenIds), [seenIds]);
  const unreadCount = items.filter(item => !seenSet.has(item.id)).length;

  const persistSeenIds = (nextIds: string[]) => {
    setSeenIds(nextIds);
    localStorage.setItem(storageKey, JSON.stringify(nextIds.slice(-80)));
  };

  const markAsSeen = (id: string) => {
    if (seenSet.has(id)) return;
    persistSeenIds([...seenIds, id]);
  };

  const markAllAsSeen = () => persistSeenIds(Array.from(new Set([...seenIds, ...items.map(item => item.id)])));

  const handleOpen = (item: NotificationItem) => {
    markAsSeen(item.id);
    setIsOpen(false);
    onOpen(item);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(previous => !previous)}
        className="relative btn-icon rounded-xl border border-border bg-surface-subtle hover:bg-surface text-text-muted hover:text-text"
        title="Notificaciones"
        aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin revisar` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="material-symbols-outlined">{unreadCount ? 'notifications' : 'notifications_none'}</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 h-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold leading-4 text-center border-2 border-surface">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[120] w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_18px_45px_-24px_rgb(15_23_42_/_0.45)]">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-text">Notificaciones</p>
              <p className="mt-1 text-xs text-text-muted">
                {unreadCount ? `${unreadCount} por revisar` : 'Todo está al día'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsSeen}
                className="shrink-0 text-xs font-semibold text-primary hover:text-primary/75 transition-colors"
              >
                Marcar revisadas
              </button>
            )}
          </div>

          <div className="max-h-[min(70vh,480px)] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <span className="material-symbols-outlined text-3xl text-text-muted/60">notifications_off</span>
                <p className="mt-3 text-sm font-semibold text-text">Sin novedades importantes</p>
                <p className="mt-1 text-xs text-text-muted">Las alertas operativas aparecerán aquí.</p>
              </div>
            ) : (
              items.map(item => {
                const isUnread = !seenSet.has(item.id);
                const tone = toneStyles[item.tone];
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleOpen(item)}
                    className={`flex w-full gap-3 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-surface-subtle ${isUnread ? 'bg-primary/[0.025]' : ''}`}
                  >
                    <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
                      <span className="material-symbols-outlined ui-icon text-[19px]">{item.icon}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-text">{item.title}</span>
                        {isUnread && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-label="Sin revisar" />}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-text-muted">{item.message}</span>
                      {item.timestamp && <span className={`mt-2 block text-[11px] font-semibold ${tone.text}`}>{item.timestamp}</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
