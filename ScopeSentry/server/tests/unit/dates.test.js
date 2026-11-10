import { describe, it, expect } from 'vitest';
import { calendarDateDiffDays, isValidCalendarDate } from '../../src/domain/dates.js';

describe('Phase 1: Calendar Date Calculations (UTC Whole Days)', () => {
  it('validates calendar date format YYYY-MM-DD strictly', () => {
    expect(isValidCalendarDate('2025-04-15')).toBe(true);
    expect(isValidCalendarDate('2025-02-29')).toBe(false); // Not a leap year
    expect(isValidCalendarDate('2024-02-29')).toBe(true);  // 2024 is a leap year
    expect(isValidCalendarDate('invalid-date')).toBe(false);
    expect(isValidCalendarDate('2025/04/15')).toBe(false);
  });

  it('calculates 0 days for identical calendar dates', () => {
    expect(calendarDateDiffDays('2025-05-01', '2025-05-01')).toBe(0);
  });

  it('calculates positive days when revised milestone is delayed', () => {
    // 2025-05-01 to 2025-05-15 is +14 days
    expect(calendarDateDiffDays('2025-05-01', '2025-05-15')).toBe(14);
  });

  it('calculates negative days when revised milestone is completed earlier (signed)', () => {
    expect(calendarDateDiffDays('2025-05-15', '2025-05-01')).toBe(-14);
  });

  it('calculates days correctly across month boundaries', () => {
    // 2025-01-30 to 2025-02-02 (Jan has 31 days -> 1 day to 31st, + 2 days in Feb = 3 days)
    expect(calendarDateDiffDays('2025-01-30', '2025-02-02')).toBe(3);
  });

  it('calculates days correctly across leap year February', () => {
    // 2024 is leap year: Feb 28 to Mar 01 is 2 days (Feb 29 exists)
    expect(calendarDateDiffDays('2024-02-28', '2024-03-01')).toBe(2);

    // 2025 is non-leap year: Feb 28 to Mar 01 is 1 day
    expect(calendarDateDiffDays('2025-02-28', '2025-03-01')).toBe(1);
  });

  it('calculates days correctly across year boundaries', () => {
    expect(calendarDateDiffDays('2024-12-31', '2025-01-01')).toBe(1);
    expect(calendarDateDiffDays('2025-01-01', '2024-12-31')).toBe(-1);
  });

  it('returns null if either date string is null, empty or undefined', () => {
    expect(calendarDateDiffDays(null, '2025-05-01')).toBeNull();
    expect(calendarDateDiffDays('2025-05-01', undefined)).toBeNull();
  });
});
