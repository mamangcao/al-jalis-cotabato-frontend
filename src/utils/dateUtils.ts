const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

/**
 * Formats a date into "MMMM D, YYYY" (e.g., "September 8, 2026").
 * 
 * Protects against timezone date shifts:
 * For ISO strings (e.g., "2026-09-08T00:00:00.000000Z") and date-only strings (e.g., "2026-09-08"),
 * extracts the calendar date directly rather than converting via local timezone,
 * preventing September 8 from shifting to September 7 in negative UTC offsets.
 */
export function formatDisplayDate(
  date: string | Date | number | null | undefined,
  fallback: string = '-'
): string {
  if (date === null || date === undefined || date === '') {
    return fallback;
  }

  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return fallback;

    // Direct extraction for YYYY-MM-DD patterns to prevent UTC-to-local timezone rollback
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const monthIndex = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);

      if (monthIndex >= 0 && monthIndex < 12 && day >= 1 && day <= 31) {
        return `${MONTH_NAMES[monthIndex]} ${day}, ${year}`;
      }
    }

    // Fallback parsing for other string formats
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      return fallback;
    }
    return `${MONTH_NAMES[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}`;
  }

  if (typeof date === 'number') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return fallback;
    return `${MONTH_NAMES[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}`;
  }

  if (date instanceof Date) {
    if (isNaN(date.getTime())) return fallback;
    return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  return fallback;
}

/**
 * Formats a datetime into "MMMM D, YYYY, h:mm A" (e.g., "September 8, 2026, 2:30 PM").
 */
export function formatDisplayDateTime(
  date: string | Date | number | null | undefined,
  fallback: string = '-'
): string {
  if (date === null || date === undefined || date === '') {
    return fallback;
  }

  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return fallback;
  }

  const formattedDate = formatDisplayDate(d, fallback);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour should be 12

  return `${formattedDate}, ${hours}:${minutes} ${ampm}`;
}

