import {
  foldIcsLine,
  formatDateOnly,
  formatDatesForCalendar,
  generateCalendarUrls,
  generateICS,
} from './calendar.event.calendar-links';

describe('CalendarEventCalendarLinks', () => {
  it('formats calendar dates for Google and Outlook', () => {
    const result = formatDatesForCalendar(
      '2026-02-20T10:00:00Z',
      '2026-02-20T11:00:00Z'
    );

    expect(result.google).toBe('20260220T100000Z/20260220T110000Z');
    expect(result.outlookStart).toBe('2026-02-20T10:00:00.000Z');
    expect(result.outlookEnd).toBe('2026-02-20T11:00:00.000Z');
    expect(result.icalStart).toBe('20260220T100000Z');
    expect(result.icalEnd).toBe('20260220T110000Z');
  });

  it('formats whole-day dates as date-only values', () => {
    const result = formatDatesForCalendar(
      '2026-02-20T00:00:00Z',
      '2026-02-21T00:00:00Z',
      true
    );

    expect(result.google).toBe('20260220/20260222');
    expect(result.outlookStart).toBe('2026-02-20');
    expect(result.outlookEnd).toBe('2026-02-21');
    expect(result.icalStart).toBe('20260220');
    expect(result.icalEnd).toBe('20260221');
    expect(result.wholeDay).toBe(true);
  });

  it('formatDateOnly extracts YYYYMMDD from ISO string', () => {
    expect(formatDateOnly('2026-02-20T10:00:00.000Z')).toBe('20260220');
  });

  it('generates calendar URLs with encoded fields', () => {
    const icsRestUrl =
      'https://alkem.io/api/private/rest/calendar/event/event-1/ics';
    const urls = generateCalendarUrls(
      {
        id: 'event-1',
        title: 'Team Sync & Review',
        url: 'https://alkem.io/events/1',
        startDate: '2026-02-20T10:00:00Z',
        endDate: '2026-02-20T11:00:00Z',
        wholeDay: false,
        description: 'Agenda: Q1, Q2',
        location: 'HQ, Amsterdam',
      },
      icsRestUrl
    );

    expect(urls.googleCalendarUrl).toContain('text=Team%20Sync%20%26%20Review');
    expect(urls.googleCalendarUrl).toContain('details=Agenda%3A%20Q1%2C%20Q2');
    expect(urls.googleCalendarUrl).toContain('location=HQ%2C%20Amsterdam');
    expect(urls.outlookCalendarUrl).toContain(
      'subject=Team%20Sync%20%26%20Review'
    );
    expect(urls.icsDownloadUrl).toBe(icsRestUrl);
  });

  it('generates whole-day calendar URLs with allday flag', () => {
    const icsRestUrl =
      'https://alkem.io/api/private/rest/calendar/event/event-2/ics';
    const urls = generateCalendarUrls(
      {
        id: 'event-2',
        title: 'All-Day Workshop',
        url: 'https://alkem.io/events/2',
        startDate: '2026-03-10T00:00:00Z',
        endDate: '2026-03-11T00:00:00Z',
        wholeDay: true,
        description: 'Full day event',
        location: 'Berlin',
      },
      icsRestUrl
    );

    expect(urls.googleCalendarUrl).toContain('dates=20260310/20260312');
    expect(urls.outlookCalendarUrl).toContain('allday=true');
    expect(urls.outlookCalendarUrl).toContain('startTime=2026-03-10');
    expect(urls.outlookCalendarUrl).toContain('endTime=2026-03-11');
  });

  it('generates RFC5545 iCalendar content', () => {
    const ics = generateICS(
      {
        id: 'event-1',
        title: 'Event Title',
        url: 'https://alkem.io/events/1',
        startDate: '2026-02-20T10:00:00Z',
        endDate: '2026-02-20T11:00:00Z',
        wholeDay: false,
        description: 'Event Description',
        location: 'Amsterdam',
      },
      '20260220T100000Z',
      '20260220T110000Z'
    );

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20260220T100000Z');
    expect(ics).toContain('DTEND:20260220T110000Z');
    expect(ics).toContain('SUMMARY:Event Title');
    expect(ics).toContain('DESCRIPTION:Event Description');
    expect(ics).toContain('LOCATION:Amsterdam');
    expect(ics).toContain('URL:https://alkem.io/events/1');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('generates whole-day ICS with VALUE=DATE properties', () => {
    const ics = generateICS(
      {
        id: 'event-allday',
        title: 'All-Day Workshop',
        url: 'https://alkem.io/events/allday',
        startDate: '2026-03-10T00:00:00Z',
        endDate: '2026-03-11T00:00:00Z',
        wholeDay: true,
        description: 'Full day',
        location: 'Berlin',
      },
      '20260310',
      '20260311'
    );

    expect(ics).toContain('DTSTART;VALUE=DATE:20260310');
    expect(ics).toContain('DTEND;VALUE=DATE:20260311');
    expect(ics).not.toContain('DTSTART:2026');
    expect(ics).not.toContain('DTEND:2026');
  });

  describe('foldIcsLine', () => {
    it('returns short lines unchanged', () => {
      const line = 'SUMMARY:Short title';
      expect(foldIcsLine(line)).toBe(line);
    });

    it('returns a line of exactly 75 bytes unchanged', () => {
      const line = 'DESCRIPTION:' + 'A'.repeat(63); // 12 + 63 = 75
      expect(foldIcsLine(line)).toBe(line);
      expect(new TextEncoder().encode(foldIcsLine(line)).length).toBe(75);
    });

    it('folds a line exceeding 75 bytes with CRLF + SPACE', () => {
      const line = 'DESCRIPTION:' + 'A'.repeat(100); // 112 bytes total
      const folded = foldIcsLine(line);

      // First line is 75 chars, then CRLF + SPACE + continuation
      const parts = folded.split('\r\n ');
      expect(parts.length).toBeGreaterThan(1);

      // First part is exactly 75 bytes
      expect(new TextEncoder().encode(parts[0]).length).toBe(75);

      // Continuation parts are at most 74 bytes each
      for (let i = 1; i < parts.length; i++) {
        expect(new TextEncoder().encode(parts[i]).length).toBeLessThanOrEqual(
          74
        );
      }

      // Roundtrip: unfolding by removing CRLF+SPACE recovers the original
      const unfolded = folded.replace(/\r\n /g, '');
      expect(unfolded).toBe(line);
    });

    it('handles multi-byte UTF-8 characters without splitting them', () => {
      // 'é' is 2 bytes in UTF-8; build a line that forces a fold near the boundary
      const line = 'SUMMARY:' + 'é'.repeat(40); // 8 + 80 = 88 bytes
      const folded = foldIcsLine(line);
      const parts = folded.split('\r\n ');

      expect(parts.length).toBeGreaterThan(1);
      expect(new TextEncoder().encode(parts[0]).length).toBeLessThanOrEqual(75);

      // Verify no broken characters — unfolding produces the original
      const unfolded = folded.replace(/\r\n /g, '');
      expect(unfolded).toBe(line);
    });

    it('handles emoji (4-byte UTF-8 characters)', () => {
      // '🎉' is 4 bytes in UTF-8
      const line = 'SUMMARY:' + '🎉'.repeat(20); // 8 + 80 = 88 bytes
      const folded = foldIcsLine(line);
      const parts = folded.split('\r\n ');

      expect(parts.length).toBeGreaterThan(1);
      expect(new TextEncoder().encode(parts[0]).length).toBeLessThanOrEqual(75);

      const unfolded = folded.replace(/\r\n /g, '');
      expect(unfolded).toBe(line);
    });
  });

  it('generateICS folds long DESCRIPTION lines per RFC 5545', () => {
    const longDescription = 'A'.repeat(200);
    const ics = generateICS(
      {
        id: 'event-long',
        title: 'Short',
        url: 'https://alkem.io/events/long',
        startDate: '2026-02-20T10:00:00Z',
        endDate: '2026-02-20T11:00:00Z',
        wholeDay: false,
        description: longDescription,
        location: 'Amsterdam',
      },
      '20260220T100000Z',
      '20260220T110000Z'
    );

    // Split the ICS into physical lines (CRLF separated)
    const physicalLines = ics.split('\r\n');

    // Every physical line must be at most 75 bytes
    for (const physLine of physicalLines) {
      expect(new TextEncoder().encode(physLine).length).toBeLessThanOrEqual(75);
    }

    // Unfolding should recover the full DESCRIPTION
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain(`DESCRIPTION:${'A'.repeat(200)}`);
  });
});
