/**
 * Formats any ISO date string, Date object, or date timestamp into DD-MM-YYYY format.
 * Example: '2026-08-18T11:40:00Z' -> '18-08-2026'
 */
export const formatDDMMYYYY = (dateVal?: string | Date | null): string => {
  if (!dateVal) return '-';
  
  // If it's already a ISO date string like YYYY-MM-DD
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
    const parts = dateVal.split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  if (isNaN(d.getTime())) {
    return String(dateVal);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};
