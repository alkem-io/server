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
  appleCalendarUrl: string;
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
  const dates = formatDatesForCalendar(event.startDate, event.endDate);

  return {
    googleCalendarUrl: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${dates.google}&details=${encodedDescription}&location=${encodedLocation}`,
    outlookCalendarUrl: `https://outlook.live.com/calendar/deeplink/compose?subject=${encodedTitle}&startTime=${dates.outlookStart}&endTime=${dates.outlookEnd}&body=${encodedDescription}`,
    appleCalendarUrl: icsRestUrl,
    icsDownloadUrl: icsRestUrl,
  };
};

export const formatDatesForCalendar = (
  start: string,
  end: string
): {
  google: string;
  outlookStart: string;
  outlookEnd: string;
  icalStart: string;
  icalEnd: string;
} => {
  const startIso = toIsoString(start, 'startDate');
  const endIso = toIsoString(end, 'endDate');

  const googleStart = formatDateForCalendar(startIso);
  const googleEnd = formatDateForCalendar(endIso);

  return {
    google: `${googleStart}/${googleEnd}`,
    outlookStart: startIso,
    outlookEnd: endIso,
    icalStart: googleStart,
    icalEnd: googleEnd,
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
    'BEGIN:VEVENT',
    `UID:${event.id}@alkemio.local`,
    `DTSTAMP:${formatDateForCalendar(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(plainTextDescription.length > 0
      ? [`DESCRIPTION:${escapeIcsText(plainTextDescription)}`]
      : []),
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    `URL:${escapeIcsText(event.url)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
};

export const escapeIcsText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');

export const formatDateForCalendar = (iso: string): string =>
  iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

export const calculateCalendarEventEndDate = (event: ICalendarEvent): Date => {
  const start = toDate(event.startDate, 'startDate');
  if (event.durationDays && event.durationDays > 0) {
    const end = new Date(start.getTime());
    end.setUTCDate(end.getUTCDate() + event.durationDays);
    return end;
  }

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
        LogContext.NOTIFICATIONS,
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
      LogContext.NOTIFICATIONS,
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
      LogContext.NOTIFICATIONS,
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
      LogContext.NOTIFICATIONS,
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
      LogContext.NOTIFICATIONS,
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
