export const toTimeInputValue = (value: unknown): string => {
  if (value === undefined || value === null) return '';

  if (typeof value === 'number' && Number.isFinite(value)) {
    const totalMinutes = Math.round(value * 24 * 60) % (24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const raw = String(value).trim();
  if (!raw) return '';

  const isoTime = raw.match(/T(\d{2}):(\d{2})(?::\d{2})?/);
  if (isoTime) return `${isoTime[1]}:${isoTime[2]}`;

  const hms = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hms) {
    const hours = Number(hms[1]);
    const minutes = Number(hms[2]);
    if (hours <= 23 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    let hours = Number(twelveHour[1]);
    const minutes = Number(twelveHour[2]);
    if (hours >= 1 && hours <= 12 && minutes <= 59) {
      const meridiem = twelveHour[3].toUpperCase();
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  return '';
};

export const formatTime = (value: unknown): string => {
  const normalized = toTimeInputValue(value);
  if (!normalized) return '';

  const [hours, minutes] = normalized.split(':').map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const toDateInputValue = (value: unknown, fallback = ''): string => {
  if (value === undefined || value === null) return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return fallback;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDate = (value: unknown, fallback = 'Sin fecha'): string => {
  const normalized = toDateInputValue(value);
  if (!normalized) return fallback;

  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const timeToMinutes = (value: unknown): number | null => {
  const normalized = toTimeInputValue(value);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
};
