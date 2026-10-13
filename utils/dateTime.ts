const pad2 = (value: number): string => String(value).padStart(2, '0');

const isValidDateParts = (year: number, month: number, day: number): boolean => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const localDateInputValue = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const localDateTimeInputValue = (date: Date): string =>
  `${localDateInputValue(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const hasExplicitTimeZone = (value: string): boolean => /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);

const parseDateTime = (raw: string): Date | null => {
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getLocalDateInputValue = (date: Date = new Date()): string => localDateInputValue(date);

export const getLocalDateTimeInputValue = (date: Date = new Date()): string => localDateTimeInputValue(date);

export const toDateInputValue = (value: unknown, fallback = ''): string => {
  if (value === undefined || value === null || value === '') return fallback;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : localDateInputValue(value);
  }

  const raw = String(value).trim();
  if (!raw) return fallback;

  const isoParts = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/);
  if (isoParts) {
    const year = Number(isoParts[1]);
    const month = Number(isoParts[2]);
    const day = Number(isoParts[3]);
    if (!isValidDateParts(year, month, day)) return fallback;

    // Calendar dates and timezone-free local datetimes keep their entered day.
    if (!raw.includes('T') && !raw.includes(' ')) return `${isoParts[1]}-${isoParts[2]}-${isoParts[3]}`;
    if (!hasExplicitTimeZone(raw)) return `${isoParts[1]}-${isoParts[2]}-${isoParts[3]}`;

    const zonedDate = parseDateTime(raw);
    return zonedDate ? localDateInputValue(zonedDate) : fallback;
  }

  // Google Sheets and browser exports may provide a localized date string.
  const dmyParts = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (dmyParts) {
    const day = Number(dmyParts[1]);
    const month = Number(dmyParts[2]);
    const year = Number(dmyParts[3]);
    return isValidDateParts(year, month, day)
      ? `${year}-${pad2(month)}-${pad2(day)}`
      : fallback;
  }

  const parsed = parseDateTime(raw);
  return parsed ? localDateInputValue(parsed) : fallback;
};

export const toDateTimeLocalInputValue = (value: unknown, fallback = ''): string => {
  if (value === undefined || value === null || value === '') return fallback;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : localDateTimeInputValue(value);
  }

  const raw = String(value).trim();
  if (!raw) return fallback;

  const localParts = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (localParts && !hasExplicitTimeZone(raw)) {
    const date = toDateInputValue(localParts[1]);
    const hours = Number(localParts[2]);
    const minutes = Number(localParts[3]);
    if (!date || hours > 23 || minutes > 59) return fallback;
    return `${date}T${pad2(hours)}:${pad2(minutes)}`;
  }

  const dateOnly = toDateInputValue(raw);
  if (dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${dateOnly}T00:00`;

  const parsed = parseDateTime(raw);
  return parsed ? localDateTimeInputValue(parsed) : fallback;
};

export const toTimeInputValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const totalMinutes = ((Math.round(value * 24 * 60) % (24 * 60)) + (24 * 60)) % (24 * 60);
    return `${pad2(Math.floor(totalMinutes / 60))}:${pad2(totalMinutes % 60)}`;
  }

  const raw = String(value).trim();
  if (!raw) return '';

  const isoTime = raw.match(/[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/);
  if (isoTime) {
    if (hasExplicitTimeZone(raw)) {
      const zonedDate = parseDateTime(raw);
      if (!zonedDate) return '';
      return `${pad2(zonedDate.getHours())}:${pad2(zonedDate.getMinutes())}`;
    }
    return `${isoTime[1]}:${isoTime[2]}`;
  }

  const hms = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (hms) {
    const hours = Number(hms[1]);
    const minutes = Number(hms[2]);
    if (hours <= 23 && minutes <= 59) return `${pad2(hours)}:${pad2(minutes)}`;
    return '';
  }

  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    let hours = Number(twelveHour[1]);
    const minutes = Number(twelveHour[2]);
    if (hours < 1 || hours > 12 || minutes > 59) return '';
    const meridiem = twelveHour[3].toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return `${pad2(hours)}:${pad2(minutes)}`;
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

export const formatDate = (value: unknown, fallback = 'Sin fecha'): string => {
  const normalized = toDateInputValue(value);
  if (!normalized) return fallback;

  const [year, month, day] = normalized.split('-').map(Number);
  // Noon avoids a calendar-day change at timezone and daylight-saving boundaries.
  return new Date(year, month - 1, day, 12).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (value: unknown, fallback = 'Sin fecha'): string => {
  if (value === undefined || value === null || value === '') return fallback;
  const raw = value instanceof Date ? '' : String(value).trim();
  if (raw && !/[T ]\d{1,2}:\d{2}/.test(raw)) return formatDate(value, fallback);

  const date = formatDate(value, fallback);
  const time = formatTime(value);
  return time ? `${date} · ${time}` : date;
};

export const timeToMinutes = (value: unknown): number | null => {
  const normalized = toTimeInputValue(value);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
};
