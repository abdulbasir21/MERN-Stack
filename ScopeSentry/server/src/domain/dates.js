/**
 * Date calculations in UTC
 * Calendar dates YYYY-MM-DD with no time of day.
 * Schedule impact = calendarDateDiffDays only when both dates are CONFIRMED values for the same milestone.
 */

export function isValidCalendarDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  const date = new Date(Date.UTC(year, month, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month &&
    date.getUTCDate() === day
  );
}

export function parseUtcDateOnly(dateStr) {
  if (!isValidCalendarDate(dateStr)) {
    throw new Error(`Invalid calendar date format (expected YYYY-MM-DD): "${dateStr}"`);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * Returns whole calendar days between two dates: endDate − startDate (signed integer)
 */
export function calendarDateDiffDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) {
    return null;
  }
  const startMs = parseUtcDateOnly(startDateStr);
  const endMs = parseUtcDateOnly(endDateStr);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((endMs - startMs) / MS_PER_DAY);
}
