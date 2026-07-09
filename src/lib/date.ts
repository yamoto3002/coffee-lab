const DAY_MS = 24 * 60 * 60 * 1000;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

export function todayDateString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function datePartsToString({ year, month, day }: DateParts): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isValidDateParts(parts: DateParts): boolean {
  const date = new Date(parts.year, parts.month - 1, parts.day);
  return date.getFullYear() === parts.year
    && date.getMonth() === parts.month - 1
    && date.getDate() === parts.day;
}

function parseDateParts(value: unknown): DateParts | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // Old records sometimes contain ISO timestamps made from local date inputs.
  // Convert those through local calendar fields so 2026-04-25T15:00:00.000Z
  // becomes 2026-04-26 in a JST browser instead of being truncated to the 25th.
  if (/[T ]\d{1,2}:\d{2}/.test(raw) || /\bGMT\b|\bUTC\b|Z$/i.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate(),
      };
    }
  }

  const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
    || raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s|$)/);
  if (!match) return null;

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  return isValidDateParts(parts) ? parts : null;
}

export function normalizeDateOnly(value: unknown): string {
  const parts = parseDateParts(value);
  if (parts) return datePartsToString(parts);
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function formatDate(value: unknown): string {
  const normalized = normalizeDateOnly(value);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return normalized || '-';
  return `${match[1]}/${match[2]}/${match[3]}`;
}

export function parseDateOnly(value: unknown): Date | null {
  const parts = parseDateParts(value);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day);
}

export function diffDateDays(from: unknown, to: unknown = todayDateString()): number {
  const start = parseDateParts(from);
  const end = parseDateParts(to);
  if (!start || !end) return 0;
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  return Math.round((endUtc - startUtc) / DAY_MS);
}

export function addDateDays(value: unknown, days: number): string {
  const parts = parseDateParts(value);
  if (!parts) return '';
  const date = new Date(parts.year, parts.month - 1, parts.day);
  date.setDate(date.getDate() + days);
  return datePartsToString({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}
