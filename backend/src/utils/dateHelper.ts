/**
 * JBJ Indian Standard Time (IST, UTC+05:30) Central Utility
 * Ensures all database insertions, updates, and fetches use exact IST timestamps.
 */

/**
 * Returns exact current timestamp in IST ISO format with +05:30 offset
 * e.g. "2026-09-05T18:00:00.000+05:30"
 */
export function getNowISTISO(customDate?: Date | string | null): string {
  const d = customDate ? (typeof customDate === 'string' ? new Date(customDate) : customDate) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString();

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');
  const ms = String(d.getMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}+05:30`;
}

/**
 * Returns date-only string in IST (YYYY-MM-DD)
 * e.g. "2026-09-05"
 */
export function getTodayIST(customDate?: Date | string | null): string {
  const d = customDate ? (typeof customDate === 'string' ? new Date(customDate) : customDate) : new Date();
  if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/**
 * Converts any date or timestamp input into exact IST ISO string with +05:30 offset
 */
export function toISTTimestamp(dateVal?: any): string {
  if (!dateVal) return getNowISTISO();
  if (typeof dateVal === 'string' && dateVal.includes('+05:30')) return dateVal;
  return getNowISTISO(dateVal);
}

/**
 * Extracts YYYY-MM-DD in IST from any date input
 */
export function toISTDateOnly(dateVal?: any): string {
  if (!dateVal) return getTodayIST();
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
    return dateVal.trim();
  }
  return getTodayIST(dateVal);
}
