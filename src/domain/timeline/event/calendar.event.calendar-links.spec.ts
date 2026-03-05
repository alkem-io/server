import {
  foldIcsLine,
  formatDatesForCalendar,
  generateCalendarUrls,
  generateICS,
} from './calendar.event.calendar-links';

describe('NotificationExternalAdapter', () => {
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
