import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ILocation } from '@domain/common/location/location.interface';
import { convertMarkdownToPlainText } from '@library/markdown';
import { ICalendarEvent } from './event.interface';

const MAX_DESCRIPTION_IN_URL_LENGTH = 1000;
const MAX_DESCRIPTION_IN_ICS_LENGTH = 8000;
export interface CalendarEventCalendarData {
  id: string;
  title: string;
  url: string;
  startDate: string;
  endDate: string;
  wholeDay: boolean;
  description?: string;
  location?: string;
}

export interface CalendarUrls {
  googleCalendarUrl: string;
  outlookCalendarUrl: string;
  icsDownloadUrl: string;
}

export const generateCalendarUrls = (
  event: CalendarEventCalendarData,
  icsRestUrl: string
): CalendarUrls => {
  const encodedTitle = encodeURIComponent(event.title);
  const plainTextDescription = convertMarkdownToPlainText(
    event.description ?? ''
  ).slice(0, MAX_DESCRIPTION_IN_URL_LENGTH);

  const encodedDescription = encodeURIComponent(plainTextDescription);
  const encodedLocation = encodeURIComponent(event.location ?? '');
  const dates = formatDatesForCalendar(
    event.startDate,
    event.endDate,
    event.wholeDay
  );

  const outlookAllDay = event.wholeDay ? '&allday=true' : '';

  return {
    googleCalendarUrl: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${dates.google}&details=${encodedDescription}&location=${encodedLocation}`,
    outlookCalendarUrl: `https://outlook.office.com/calendar/deeplink/compose?subject=${encodedTitle}&startdt=${dates.outlookStart}&enddt=${dates.outlookEnd}&body=${encodedDescription}&location=${encodedLocation}${outlookAllDay}`,
    icsDownloadUrl: icsRestUrl,
  };
};

export const formatDatesForCalendar = (
  start: string,
  end: string,
  wholeDay = false
): {
  google: string;
  outlookStart: string;
  outlookEnd: string;
  icalStart: string;
  icalEnd: string;
  wholeDay: boolean;
} => {
  const startIso = toIsoString(start, 'startDate');
  const endIso = toIsoString(end, 'endDate');

  if (wholeDay) {
    const dateStart = formatDateOnly(startIso);
    // For Google Calendar, end date must be exclusive for all-day events, so add 1 day
    const endDateObj = new Date(endIso);
    endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
    const dateEndGoogle = formatDateOnly(endDateObj.toISOString());
    const dateEnd = formatDateOnly(endIso);
    return {
      google: `${dateStart}/${dateEndGoogle}`,
      outlookStart: startIso.slice(0, 10),
      outlookEnd: endIso.slice(0, 10),
      icalStart: dateStart,
      icalEnd: dateEnd,
      wholeDay: true,
    };
  }

  const googleStart = formatDateForCalendar(startIso);
  const googleEnd = formatDateForCalendar(endIso);

  return {
    google: `${googleStart}/${googleEnd}`,
    outlookStart: startIso,
    outlookEnd: endIso,
    icalStart: googleStart,
    icalEnd: googleEnd,
    wholeDay: false,
  };
};

export const generateICS = (
  event: CalendarEventCalendarData,
  start: string,
  end: string
): string => {
  const plainTextDescription = convertMarkdownToPlainText(
    event.description ?? ''
  ).slice(0, MAX_DESCRIPTION_IN_ICS_LENGTH);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Alkemio//Calendar Event//EN',
    'X-WR-TIMEZONE:Europe/Amsterdam',
    'BEGIN:VEVENT',
    `UID:${event.id}@alkem.io`,
    `DTSTAMP:${formatDateForCalendar(new Date().toISOString())}`,
    event.wholeDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
    event.wholeDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(plainTextDescription.length > 0
      ? [`DESCRIPTION:${escapeIcsText(plainTextDescription)}`]
      : []),
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    `URL:${escapeIcsText(event.url)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(foldIcsLine).join('\r\n');
};

export const escapeIcsText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n?/g, '\n')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');

/**
 * Folds a content line per RFC 5545 §3.1.
 * Lines SHOULD NOT exceed 75 octets (bytes). Long lines are split by
 * inserting CRLF followed by a single SPACE continuation character.
 * Operates on UTF-8 byte length to handle multi-byte characters correctly.
 */
export const foldIcsLine = (line: string): string => {
  const MAX_OCTETS = 75;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);

  if (bytes.length <= MAX_OCTETS) {
    return line;
  }

  const parts: string[] = [];
  let offset = 0;

  // First line: up to 75 octets
  parts.push(sliceByBytes(line, offset, MAX_OCTETS));
  offset += parts[0].length;

  // Continuation lines: CRLF + SPACE prefix counts as overhead,
  // so each continuation carries up to 74 octets of content
  const CONTINUATION_MAX = MAX_OCTETS - 1;
  while (offset < line.length) {
    const chunk = sliceByBytes(line, offset, CONTINUATION_MAX);
    parts.push('\r\n ' + chunk);
    offset += chunk.length;
  }

  return parts.join('');
};

/**
 * Returns the longest substring starting at `charOffset` whose
 * UTF-8 encoding does not exceed `maxBytes`.
 */
const sliceByBytes = (
  str: string,
  charOffset: number,
  maxBytes: number
): string => {
  const encoder = new TextEncoder();
  let end = charOffset;

  while (end < str.length) {
    const candidate = str.slice(charOffset, end + 1);
    if (encoder.encode(candidate).length > maxBytes) {
      break;
    }
    end++;
  }

  return str.slice(charOffset, end);
};

export const formatDateForCalendar = (iso: string): string =>
  iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

/** Extracts a date-only iCal value (YYYYMMDD) from an ISO-8601 string. */
export const formatDateOnly = (iso: string): string =>
  iso.slice(0, 10).replace(/-/g, '');

export const calculateCalendarEventEndDate = (event: ICalendarEvent): Date => {
  const start = toDate(event.startDate, 'startDate');
  // durationMinutes always holds the full event duration (including days
  // converted to minutes), so plain millisecond arithmetic is sufficient
  // and avoids the month-boundary pitfalls of setUTCDate().
  const durationMinutes = event.durationMinutes ?? 0;
  return new Date(start.getTime() + durationMinutes * 60 * 1000);
};

export const toIsoString = (
  value: string | Date,
  fieldName: string
): string => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new ValidationException(
        'Invalid calendar event date',
        LogContext.CALENDAR,
        {
          field: fieldName,
          value,
        }
      );
    }
    return value.toISOString();
  }

  if (!isIsoDateString(value)) {
    throw new ValidationException(
      'Invalid calendar event date format',
      LogContext.CALENDAR,
      {
        field: fieldName,
        value,
      }
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationException(
      'Invalid calendar event date',
      LogContext.CALENDAR,
      {
        field: fieldName,
        value,
      }
    );
  }

  return parsed.toISOString();
};

export const toDate = (value: string | Date, fieldName: string): Date => {
  const iso = toIsoString(value, fieldName);
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationException(
      'Invalid calendar event date',
      LogContext.CALENDAR,
      {
        field: fieldName,
        value,
      }
    );
  }
  return parsed;
};

export const isIsoDateString = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value);

export const validateCalendarDateRange = (
  startIso: string,
  endIso: string,
  eventId: string
): void => {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
    throw new ValidationException(
      'Invalid calendar event date range',
      LogContext.CALENDAR,
      {
        eventId,
        startDate: startIso,
        endDate: endIso,
      }
    );
  }
};

export const formatLocation = (location?: ILocation): string | undefined => {
  if (!location) {
    return undefined;
  }

  const parts = [
    location.addressLine1,
    location.addressLine2,
    location.city,
    location.stateOrProvince,
    location.postalCode,
    location.country,
  ].filter(part => part && part.trim().length > 0) as string[];

  return parts.length > 0 ? parts.join(', ') : undefined;
};
