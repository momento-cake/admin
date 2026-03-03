/**
 * Payroll Calculation Engine
 *
 * Implements CCT Panificação e Confeitaria SP 2025/2026 (MR051146/2025) rates:
 * - Overtime: hourlyRate * 1.55 (55% premium, Cláusula 12ª)
 * - Night premium: hourlyRate * 1.37 (37%, Cláusula 14ª), period 22:00-05:00, reduced hour 52.5 min
 * - Rest day work: hourlyRate * 2.00 (100% premium, Cláusula 5ª)
 * - DSR: lost on unjustified absence in the week
 * - Cesta básica: lost with 1 unjustified absence or 5+ tardiness/60min+ tardiness in month
 */

import {
  TimeEntry,
  TimeMarking,
  TimeEntrySummary,
  WorkSchedule,
  PayrollCalculation,
  DaySchedule,
  NIGHT_HOUR_MINUTES,
  OVERTIME_MULTIPLIER,
  NIGHT_MULTIPLIER,
  REST_DAY_MULTIPLIER,
  REGULAR_DAY_MINUTES,
  NIGHT_PERIOD_START,
  NIGHT_PERIOD_END,
  CESTA_BASICA_MAX_ABSENCES,
  CESTA_BASICA_MAX_TARDINESS_COUNT,
  CESTA_BASICA_MAX_TARDINESS_MINUTES,
} from '@/types/time-tracking';
import {
  parseISO,
  getDay,
  differenceInMinutes,
  setHours,
  setMinutes,
  setSeconds,
  startOfDay,
  addDays,
  isBefore,
  isAfter,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
} from 'date-fns';

// ---------------------------------------------------------------------------
// Helper: get Date from a marking timestamp (handles Firestore Timestamps)
// ---------------------------------------------------------------------------

function toDate(value: Date | { toDate: () => Date }): Date {
  if (value instanceof Date) return value;
  if (typeof (value as any).toDate === 'function') return (value as any).toDate();
  return new Date(value as any);
}

// ---------------------------------------------------------------------------
// Night Minutes Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the number of real minutes that fall within the night period
 * (22:00 to 05:00) for a given time range.
 */
function nightMinutesInRange(start: Date, end: Date): number {
  if (isAfter(start, end)) return 0;

  let totalNightMinutes = 0;
  let current = new Date(start);

  while (isBefore(current, end)) {
    const dayStart = startOfDay(current);
    // Night period for this calendar day: 00:00-05:00 and 22:00-00:00
    const nightEnd = setHours(setMinutes(setSeconds(dayStart, 0), 0), NIGHT_PERIOD_END); // 05:00
    const nightStart = setHours(setMinutes(setSeconds(dayStart, 0), 0), NIGHT_PERIOD_START); // 22:00
    const nextDayStart = addDays(dayStart, 1);

    // Segment 1: 00:00 - 05:00
    const seg1Start = isBefore(current, dayStart) ? dayStart : current;
    const seg1End = isAfter(end, nightEnd) ? nightEnd : end;
    if (isBefore(seg1Start, nightEnd) && isBefore(seg1Start, seg1End)) {
      totalNightMinutes += Math.max(0, differenceInMinutes(seg1End, seg1Start));
    }

    // Segment 2: 22:00 - 00:00 (next day)
    const seg2Start = isAfter(current, nightStart) ? current : nightStart;
    const seg2End = isAfter(end, nextDayStart) ? nextDayStart : end;
    if (isBefore(seg2Start, nextDayStart) && isBefore(seg2Start, seg2End) && isAfter(seg2End, nightStart)) {
      totalNightMinutes += Math.max(0, differenceInMinutes(seg2End, seg2Start));
    }

    // Move to next day
    current = nextDayStart;
  }

  return totalNightMinutes;
}

/**
 * Calculate night minutes from an array of markings.
 * Considers work periods: clock_in -> lunch_out, lunch_in -> clock_out.
 */
export function calculateNightMinutes(markings: TimeMarking[]): number {
  const sorted = [...markings].sort(
    (a, b) => toDate(a.timestamp).getTime() - toDate(b.timestamp).getTime()
  );

  const clockIn = sorted.find((m) => m.type === 'clock_in');
  const lunchOut = sorted.find((m) => m.type === 'lunch_out');
  const lunchIn = sorted.find((m) => m.type === 'lunch_in');
  const clockOut = sorted.find((m) => m.type === 'clock_out');

  let totalNight = 0;

  // Period 1: clock_in -> lunch_out (or clock_out if no lunch)
  if (clockIn) {
    const period1End = lunchOut || clockOut;
    if (period1End) {
      totalNight += nightMinutesInRange(toDate(clockIn.timestamp), toDate(period1End.timestamp));
    }
  }

  // Period 2: lunch_in -> clock_out
  if (lunchIn && clockOut) {
    totalNight += nightMinutesInRange(toDate(lunchIn.timestamp), toDate(clockOut.timestamp));
  }

  return totalNight;
}

// ---------------------------------------------------------------------------
// Summary Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the summary for a time entry based on its markings.
 * Called every time a new marking is added.
 */
export function calculateEntrySummary(
  markings: TimeMarking[],
  scheduledMinutes: number = REGULAR_DAY_MINUTES,
  isRestDay: boolean = false,
  isHoliday: boolean = false
): TimeEntrySummary {
  const sorted = [...markings].sort(
    (a, b) => toDate(a.timestamp).getTime() - toDate(b.timestamp).getTime()
  );

  const clockIn = sorted.find((m) => m.type === 'clock_in');
  const lunchOut = sorted.find((m) => m.type === 'lunch_out');
  const lunchIn = sorted.find((m) => m.type === 'lunch_in');
  const clockOut = sorted.find((m) => m.type === 'clock_out');

  let totalWorkedMinutes = 0;
  let totalBreakMinutes = 0;

  // Period 1: clock_in -> lunch_out
  if (clockIn && lunchOut) {
    totalWorkedMinutes += differenceInMinutes(toDate(lunchOut.timestamp), toDate(clockIn.timestamp));
  } else if (clockIn && clockOut && !lunchOut) {
    // No lunch break - entire period is worked
    totalWorkedMinutes += differenceInMinutes(toDate(clockOut.timestamp), toDate(clockIn.timestamp));
  }

  // Lunch break duration
  if (lunchOut && lunchIn) {
    totalBreakMinutes = differenceInMinutes(toDate(lunchIn.timestamp), toDate(lunchOut.timestamp));
  }

  // Period 2: lunch_in -> clock_out
  if (lunchIn && clockOut) {
    totalWorkedMinutes += differenceInMinutes(toDate(clockOut.timestamp), toDate(lunchIn.timestamp));
  }

  // If we only have clock_in with lunch_out (period 1 already counted above),
  // but also have clock_in -> clock_out without lunch, prevent double-counting.
  // The logic above handles this correctly because the conditions are mutually exclusive.

  const nightMinutes = calculateNightMinutes(sorted);
  const regularMinutes = Math.min(totalWorkedMinutes, scheduledMinutes);
  const overtimeMinutes = Math.max(0, totalWorkedMinutes - scheduledMinutes);

  // Determine status
  const hasAllMarkings = !!(clockIn && lunchOut && lunchIn && clockOut);
  const hasAnyMarking = sorted.length > 0;
  let status: TimeEntrySummary['status'] = 'incomplete';
  if (hasAllMarkings) {
    status = 'complete';
  } else if (!hasAnyMarking) {
    status = 'absent';
  }

  return {
    totalWorkedMinutes,
    totalBreakMinutes,
    regularMinutes,
    overtimeMinutes,
    nightMinutes,
    isRestDay,
    isHoliday,
    status,
  };
}

// ---------------------------------------------------------------------------
// Overtime Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate overtime minutes.
 */
export function calculateOvertimeMinutes(
  totalWorkedMinutes: number,
  scheduledMinutes: number = REGULAR_DAY_MINUTES
): number {
  return Math.max(0, totalWorkedMinutes - scheduledMinutes);
}

// ---------------------------------------------------------------------------
// Day Payroll Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate payroll for a single day.
 */
export function calculateDayPayroll(
  entry: TimeEntry,
  schedule: WorkSchedule,
  isHoliday: boolean,
  isRestDay: boolean
): PayrollCalculation {
  const dayOfWeek = getDay(parseISO(entry.date));
  const daySchedule: DaySchedule | undefined = schedule.weeklySchedule[dayOfWeek];
  const scheduledMinutes = daySchedule?.isWorkDay
    ? differenceInMinutes(
        parseTimeToDate(daySchedule.expectedEnd!, entry.date),
        parseTimeToDate(daySchedule.expectedStart!, entry.date)
      ) - (daySchedule.expectedBreakMinutes || 0)
    : 0;

  const summary = entry.summary;
  const hourlyRate = schedule.hourlyRate;

  const regularHours = summary.regularMinutes / 60;
  const overtimeHours = summary.overtimeMinutes / 60;
  // Night hours use reduced hour: 52.5 real minutes = 1 night hour
  const nightHours = summary.nightMinutes / NIGHT_HOUR_MINUTES;
  const restDayHours = (isRestDay || isHoliday) ? summary.totalWorkedMinutes / 60 : 0;

  const overtimeRate = hourlyRate * OVERTIME_MULTIPLIER;
  const nightRate = hourlyRate * NIGHT_MULTIPLIER;
  const restDayRate = hourlyRate * REST_DAY_MULTIPLIER;

  let regularPay: number;
  let overtimePay: number;
  let nightPremiumPay: number;
  let restDayPay: number;

  if (isRestDay || isHoliday) {
    // All hours on rest/holiday are paid at rest day rate
    regularPay = 0;
    overtimePay = 0;
    nightPremiumPay = nightHours * (nightRate - hourlyRate);
    restDayPay = restDayHours * restDayRate;
  } else {
    regularPay = regularHours * hourlyRate;
    overtimePay = overtimeHours * overtimeRate;
    // Night premium is the difference (only the additional premium, not the full rate)
    nightPremiumPay = nightHours * (nightRate - hourlyRate);
    restDayPay = 0;
  }

  const grossPay = regularPay + overtimePay + nightPremiumPay + restDayPay;

  const isAbsent = summary.status === 'absent';
  const isJustified = summary.status === 'justified_absence';

  return {
    employeeId: entry.userId,
    period: { start: entry.date, end: entry.date },
    regularHours,
    overtimeHours,
    nightHours,
    restDayHours,
    hourlyRate,
    overtimeRate,
    nightRate,
    restDayRate,
    regularPay,
    overtimePay,
    nightPremiumPay,
    restDayPay,
    dsrValue: 0, // calculated at period level
    dsrLost: false,
    cestaBasicaEligible: true, // calculated at period level
    grossPay,
    totalWorkDays: daySchedule?.isWorkDay ? 1 : 0,
    daysPresent: isAbsent ? 0 : 1,
    daysAbsent: isAbsent ? 1 : 0,
    justifiedAbsences: isJustified ? 1 : 0,
    unjustifiedAbsences: isAbsent && !isJustified ? 1 : 0,
    tardiness: { count: 0, totalMinutes: 0 },
  };
}

// ---------------------------------------------------------------------------
// Period Payroll Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate payroll for a period (e.g., a month).
 */
export function calculatePeriodPayroll(
  entries: TimeEntry[],
  schedule: WorkSchedule,
  holidays: string[] // Array of ISO date strings that are holidays
): PayrollCalculation {
  const holidaySet = new Set(holidays);

  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalNightHours = 0;
  let totalRestDayHours = 0;
  let totalRegularPay = 0;
  let totalOvertimePay = 0;
  let totalNightPremiumPay = 0;
  let totalRestDayPay = 0;
  let totalWorkDays = 0;
  let daysPresent = 0;
  let daysAbsent = 0;
  let justifiedAbsences = 0;
  let unjustifiedAbsences = 0;
  let tardinessCount = 0;
  let tardinessMinutes = 0;

  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const startDate = sortedEntries.length > 0 ? sortedEntries[0].date : '';
  const endDate = sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1].date : '';

  for (const entry of sortedEntries) {
    const dayOfWeek = getDay(parseISO(entry.date));
    const daySchedule = schedule.weeklySchedule[dayOfWeek];
    const isHoliday = holidaySet.has(entry.date);
    const isRestDay = daySchedule ? !daySchedule.isWorkDay : dayOfWeek === 0;

    const dayCalc = calculateDayPayroll(entry, schedule, isHoliday, isRestDay);

    totalRegularHours += dayCalc.regularHours;
    totalOvertimeHours += dayCalc.overtimeHours;
    totalNightHours += dayCalc.nightHours;
    totalRestDayHours += dayCalc.restDayHours;
    totalRegularPay += dayCalc.regularPay;
    totalOvertimePay += dayCalc.overtimePay;
    totalNightPremiumPay += dayCalc.nightPremiumPay;
    totalRestDayPay += dayCalc.restDayPay;
    totalWorkDays += dayCalc.totalWorkDays;
    daysPresent += dayCalc.daysPresent;
    daysAbsent += dayCalc.daysAbsent;
    justifiedAbsences += dayCalc.justifiedAbsences;
    unjustifiedAbsences += dayCalc.unjustifiedAbsences;

    // Tardiness: check if employee arrived late
    if (daySchedule?.isWorkDay && daySchedule.expectedStart && entry.markings.length > 0) {
      const clockIn = entry.markings.find((m) => m.type === 'clock_in');
      if (clockIn) {
        const expectedStart = parseTimeToDate(daySchedule.expectedStart, entry.date);
        const actualStart = toDate(clockIn.timestamp);
        const lateMinutes = differenceInMinutes(actualStart, expectedStart);
        if (lateMinutes > 0) {
          tardinessCount++;
          tardinessMinutes += lateMinutes;
        }
      }
    }
  }

  // DSR Calculation
  const { dsrValue, dsrLost } = calculateDSR(sortedEntries, schedule, holidays);

  // Cesta Basica eligibility (Clausula 19a)
  const cestaBasicaEligible =
    unjustifiedAbsences <= CESTA_BASICA_MAX_ABSENCES &&
    tardinessCount <= CESTA_BASICA_MAX_TARDINESS_COUNT &&
    tardinessMinutes <= CESTA_BASICA_MAX_TARDINESS_MINUTES;

  const grossPay =
    totalRegularPay + totalOvertimePay + totalNightPremiumPay + totalRestDayPay + dsrValue;

  return {
    employeeId: sortedEntries[0]?.userId || '',
    period: { start: startDate, end: endDate },
    regularHours: totalRegularHours,
    overtimeHours: totalOvertimeHours,
    nightHours: totalNightHours,
    restDayHours: totalRestDayHours,
    hourlyRate: schedule.hourlyRate,
    overtimeRate: schedule.hourlyRate * OVERTIME_MULTIPLIER,
    nightRate: schedule.hourlyRate * NIGHT_MULTIPLIER,
    restDayRate: schedule.hourlyRate * REST_DAY_MULTIPLIER,
    regularPay: totalRegularPay,
    overtimePay: totalOvertimePay,
    nightPremiumPay: totalNightPremiumPay,
    restDayPay: totalRestDayPay,
    dsrValue,
    dsrLost,
    cestaBasicaEligible,
    grossPay,
    totalWorkDays,
    daysPresent,
    daysAbsent,
    justifiedAbsences,
    unjustifiedAbsences,
    tardiness: { count: tardinessCount, totalMinutes: tardinessMinutes },
  };
}

// ---------------------------------------------------------------------------
// DSR Calculation (Descanso Semanal Remunerado)
// ---------------------------------------------------------------------------

/**
 * Calculate DSR (weekly rest pay).
 * DSR is lost for a week if there is an unjustified absence in that week.
 * DSR value = (sum of weekly work pay) / (work days in week).
 */
export function calculateDSR(
  entries: TimeEntry[],
  schedule: WorkSchedule,
  holidays: string[]
): { dsrValue: number; dsrLost: boolean } {
  if (entries.length === 0) return { dsrValue: 0, dsrLost: false };

  const holidaySet = new Set(holidays);
  let totalDsr = 0;
  let anyDsrLost = false;

  // Group entries by week (Monday to Sunday)
  const entryMap = new Map<string, TimeEntry>();
  for (const entry of entries) {
    entryMap.set(entry.date, entry);
  }

  // Get the range of dates covered
  const startDate = parseISO(entries[0].date);
  const endDate = parseISO(entries[entries.length - 1].date);

  let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 }); // Monday
  while (isBefore(currentWeekStart, addDays(endDate, 1))) {
    const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

    let weekWorkPay = 0;
    let weekWorkDays = 0;
    let hasUnjustifiedAbsence = false;

    for (const day of weekDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayOfWeek = getDay(day);
      const daySchedule = schedule.weeklySchedule[dayOfWeek];
      const isWorkDay = daySchedule?.isWorkDay ?? false;

      if (!isWorkDay) continue;

      weekWorkDays++;
      const entry = entryMap.get(dateStr);

      if (entry) {
        const isHoliday = holidaySet.has(dateStr);
        if (!isHoliday) {
          const hours = entry.summary.totalWorkedMinutes / 60;
          weekWorkPay += hours * schedule.hourlyRate;
        }

        if (entry.summary.status === 'absent') {
          hasUnjustifiedAbsence = true;
        }
      } else {
        // No entry for a work day = absent
        hasUnjustifiedAbsence = true;
      }
    }

    if (hasUnjustifiedAbsence) {
      anyDsrLost = true;
    } else if (weekWorkDays > 0) {
      // DSR = weekly pay / work days (gives 1 day's equivalent pay)
      totalDsr += weekWorkPay / weekWorkDays;
    }

    currentWeekStart = addDays(currentWeekEnd, 1);
  }

  return { dsrValue: totalDsr, dsrLost: anyDsrLost };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a time string (HH:mm) into a Date for a given ISO date.
 */
function parseTimeToDate(time: string, isoDate: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = parseISO(isoDate);
  return setSeconds(setMinutes(setHours(date, hours), minutes), 0);
}
