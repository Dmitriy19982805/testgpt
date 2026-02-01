import { format } from "date-fns";

export function formatDate(iso: string, template = "MMM d, yyyy") {
  return format(new Date(iso), template);
}

export function formatDateTime(iso: string) {
  return format(new Date(iso), "MMM d, yyyy • h:mm a");
}
