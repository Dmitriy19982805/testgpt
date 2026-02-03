import { format } from "date-fns";
import { ru as ruLocale } from "date-fns/locale";

export const DEFAULT_DUE_TIME = "12:00";

const getDatePart = (value: string) => value.slice(0, 10);

const getTimeValue = (value?: string) => {
  if (!value || !value.trim()) {
    return DEFAULT_DUE_TIME;
  }
  return value;
};

const buildDueDateTime = (dueAt: string, dueTime?: string) => {
  const datePart = getDatePart(dueAt);
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = getTimeValue(dueTime).split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

export function formatDate(iso: string, template = "d MMM yyyy") {
  return format(new Date(iso), template, { locale: ruLocale });
}

export function formatDateTime(iso: string) {
  return format(new Date(iso), "d MMM yyyy • HH:mm", { locale: ruLocale });
}

export function toDueAtIso(dueAt: string, dueTime?: string) {
  return buildDueDateTime(dueAt, dueTime).toISOString();
}

export function formatDueDateTime(
  dueAt: string,
  dueTime?: string,
  template = "d MMM yyyy • HH:mm"
) {
  return format(buildDueDateTime(dueAt, dueTime), template, { locale: ruLocale });
}

export function resolveDueTime(dueTime?: string) {
  return getTimeValue(dueTime);
}
