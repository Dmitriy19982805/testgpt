import { format } from "date-fns";
import { ru as ruLocale } from "date-fns/locale";

export function formatDate(iso: string, template = "d MMM yyyy") {
  return format(new Date(iso), template, { locale: ruLocale });
}

export function formatDateTime(iso: string) {
  return format(new Date(iso), "d MMM yyyy • HH:mm", { locale: ruLocale });
}
