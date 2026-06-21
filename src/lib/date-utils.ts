import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, addDays, differenceInCalendarDays, parseISO } from "date-fns";

// ISO week starts Monday
export const weekStart = (d = new Date()) => startOfWeek(d, { weekStartsOn: 1 });
export const weekEnd = (d = new Date()) => endOfWeek(d, { weekStartsOn: 1 });
export const monthStart = (d = new Date()) => startOfMonth(d);
export const monthEnd = (d = new Date()) => endOfMonth(d);
export const ymd = (d: Date) => format(d, "yyyy-MM-dd");
export const daysBetween = (a: Date, b: Date) => differenceInCalendarDays(a, b);
export const addD = addDays;
export const fmt = format;
export const parse = parseISO;

export function lastNDays(n: number, end = new Date()): Date[] {
  return Array.from({ length: n }, (_, i) => addDays(end, -(n - 1 - i)));
}
