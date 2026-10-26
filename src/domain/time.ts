// Fechas en la zona horaria del negocio (America/Bogota, UTC−5 sin horario de verano).
import { TZDate } from "@date-fns/tz";
import { addDays, differenceInCalendarDays, endOfDay, format, startOfDay, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { business } from "../config";

export const TZ = business.timeZone;
export const HOUR = 36e5;
export const DAY = 864e5;

/** Fecha en la zona del negocio */
export const inTz = (d: Date | string | number) => new TZDate(new Date(d).getTime(), TZ);

export const startOfDayTz = (d: Date | string | number) => startOfDay(inTz(d));
export const endOfDayTz = (d: Date | string | number) => endOfDay(inTz(d));
/** Lunes 00:00 de la semana */
export const startOfWeekTz = (d: Date | string | number) => startOfWeek(inTz(d), { weekStartsOn: 1 });
export const addDaysTz = (d: Date | string | number, n: number) => addDays(inTz(d), n);
/** Días de calendario entre dos fechas en la zona del negocio (b − a) */
export const calendarDaysBetween = (a: Date | string | number, b: Date | string | number) => differenceInCalendarDays(inTz(b), inTz(a));

/**
 * Crea una fecha a partir de día + "HH:mm" en la zona del negocio.
 * Un día "yyyy-MM-dd" (p. ej. de un <input type="date">) se toma como día de Bogotá, no como medianoche UTC.
 */
export function atTime(day: Date | string | number, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  let d: TZDate;
  if (typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const [y, mo, dd] = day.split("-").map(Number);
    d = new TZDate(y, mo - 1, dd, h, m, 0, TZ);
  } else {
    d = startOfDayTz(day);
    d.setHours(h, m, 0, 0);
  }
  // Date normal: toISOString() siempre en UTC ("…Z"), igual que el resto de fechas guardadas
  return new Date(d.getTime());
}

export const fmt = (d: Date | string | number, pattern: string) => format(inTz(d), pattern, { locale: es });
export const fmtDay = (d: Date | string | number) => fmt(d, "EEE d MMM");
export const fmtDayLong = (d: Date | string | number) => fmt(d, "EEEE d 'de' MMMM");
export const fmtTime = (d: Date | string | number) => fmt(d, "HH:mm");
export const fmtDateTime = (d: Date | string | number) => fmt(d, "d MMM yyyy, HH:mm");
export const isoDay = (d: Date | string | number) => fmt(d, "yyyy-MM-dd");
