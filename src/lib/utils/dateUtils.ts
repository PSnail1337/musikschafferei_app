import {
  format, startOfDay, endOfDay, addMinutes, isBefore, isAfter,
  differenceInMinutes, setHours, setMinutes, parseISO, addDays,
  startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay,
} from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import type { Locale } from './constants';

// ─── Locale helper ────────────────────────────────────────────
export function getDateFnsLocale(locale: Locale) {
  return locale === 'de' ? de : enUS;
}

// ─── Slot helpers ─────────────────────────────────────────────
/** Build time-slot labels for the calendar grid (e.g. "08:00", "08:15", …) */
export function buildTimeSlots(startHour = 6, endHour = 24, slotMinutes = 15): Date[] {
  const slots: Date[] = [];
  const base = new Date();
  base.setHours(startHour, 0, 0, 0);
  const end = new Date(base);
  end.setHours(endHour, 0, 0, 0);
  let cur = base;
  while (isBefore(cur, end)) {
    slots.push(new Date(cur));
    cur = addMinutes(cur, slotMinutes);
  }
  return slots;
}

/** Round a date down to the nearest 15-minute slot */
export function floorToSlot(date: Date, slotMinutes = 15): Date {
  const mins = date.getMinutes();
  const floored = Math.floor(mins / slotMinutes) * slotMinutes;
  return setMinutes(date, floored);
}

/** Round a date up to the nearest 15-minute slot */
export function ceilToSlot(date: Date, slotMinutes = 15): Date {
  const mins = date.getMinutes();
  const ceiled = Math.ceil(mins / slotMinutes) * slotMinutes;
  if (ceiled === 60) return setMinutes(setHours(date, date.getHours() + 1), 0);
  return setMinutes(date, ceiled);
}

/** Duration in hours as a formatted string, e.g. "2h 30min" */
export function formatDuration(startTime: Date, endTime: Date): string {
  const mins = differenceInMinutes(endTime, startTime);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** Position a booking inside the calendar column as a CSS top% and height% */
export function bookingToStyle(
  bookingStart: Date,
  bookingEnd: Date,
  calStart: Date,
  calEnd: Date,
): { top: string; height: string } {
  const totalMins = differenceInMinutes(calEnd, calStart);
  const topMins   = differenceInMinutes(bookingStart, calStart);
  const heightMins = differenceInMinutes(bookingEnd, bookingStart);
  return {
    top:    `${(topMins / totalMins) * 100}%`,
    height: `${(heightMins / totalMins) * 100}%`,
  };
}

// ─── Calendar helpers ─────────────────────────────────────────
export function getMonthDays(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month, 1));
  const end   = endOfMonth(start);
  return eachDayOfInterval({ start, end });
}

export { format, startOfDay, endOfDay, addDays, isToday, isSameDay, parseISO };
