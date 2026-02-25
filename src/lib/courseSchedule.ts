import type { Course } from "@/types";

/** Parse a date+time string as Hong Kong time (UTC+8) and return a Date */
function parseAsHongKongTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}+08:00`);
}

/**
 * Given a recurring course, compute all individual session dates.
 * Returns ISO date strings sorted ascending.
 */
export function getSessionDates(course: Course): string[] {
  if (!course.recurringDays || course.totalSessions <= 1) {
    return [course.date];
  }

  const days = course.recurringDays.split(",").map(Number).filter((n) => !isNaN(n));
  if (days.length === 0) return [course.date];

  const dates: string[] = [];
  const current = new Date(course.date + "T00:00:00");
  if (isNaN(current.getTime())) return [course.date];

  // Walk forward day by day until we have enough sessions
  const maxIterations = 365 * 2; // safety limit
  let iterations = 0;
  while (dates.length < course.totalSessions && iterations < maxIterations) {
    if (days.includes(current.getDay())) {
      dates.push(current.toISOString().split("T")[0]);
    }
    current.setDate(current.getDate() + 1);
    iterations++;
  }

  return dates;
}

/**
 * Count how many sessions have been completed (end time has passed).
 */
export function countCompletedSessions(course: Course): number {
  const sessionDates = getSessionDates(course);
  const now = new Date();
  let completed = 0;

  for (const dateStr of sessionDates) {
    const endTime = course.timeEnd || course.time || "23:59:59";
    const sessionEnd = parseAsHongKongTime(dateStr, endTime);
    if (!isNaN(sessionEnd.getTime()) && sessionEnd < now) {
      completed++;
    }
  }

  return Math.min(completed, course.totalSessions);
}

/** Weekday labels in Chinese */
export const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

/** Format recurring days for display */
export function formatRecurringDays(recurringDays: string): string {
  if (!recurringDays) return "";
  const days = recurringDays.split(",").map(Number).filter((n) => !isNaN(n));
  return days.map((d) => `星期${WEEKDAY_LABELS[d]}`).join("、");
}

/** Get next upcoming session date */
export function getNextSessionDate(course: Course): string | null {
  const dates = getSessionDates(course);
  const now = new Date();
  const endTime = course.timeEnd || course.time || "23:59:59";

  for (const dateStr of dates) {
    const sessionEnd = parseAsHongKongTime(dateStr, endTime);
    if (!isNaN(sessionEnd.getTime()) && sessionEnd >= now) {
      return dateStr;
    }
  }
  return null;
}
