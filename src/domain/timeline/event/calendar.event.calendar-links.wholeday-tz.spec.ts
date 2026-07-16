import { formatDatesForCalendar } from './calendar.event.calendar-links';

/**
 * SC-001: a whole-day event exports on the picked calendar date regardless of the
 * server's process timezone. The client sends a whole-day date as UTC-midnight of
 * the intended day; the export derives the date-only value in UTC, so the result
 * is identical under every server TZ — including west of UTC, where #6271's
 * process-local derivation slipped a day.
 *
 * The process timezone is fixed at Node startup (runtime `process.env.TZ` reassignment
 * does NOT take effect), so this file is designed to be run under several launch-time
 * timezones and assert the SAME output each time:
 *
 *   for z in UTC Europe/Amsterdam Europe/Sofia America/Los_Angeles; do \
 *     TZ=$z npx vitest run src/domain/timeline/event/calendar.event.calendar-links.wholeday-tz.spec.ts; done
 */
describe('whole-day export is timezone-independent', () => {
  it('exports a whole-day "3 Dec 2026" event on the 3rd under any server timezone', () => {
    // Whole-day 3 Dec → 4 Dec (last covered day = 4th), stored as UTC-midnight.
    const result = formatDatesForCalendar(
      '2026-12-03T00:00:00.000Z',
      '2026-12-04T00:00:00.000Z',
      true
    );

    expect(result.icalStart).toBe('20261203');
    // Exclusive end (RFC 5545) = last covered day (4th) + 1 = 5th.
    expect(result.icalEnd).toBe('20261205');
    expect(result.outlookStart).toBe('2026-12-03');
    expect(result.outlookEnd).toBe('2026-12-05');
    expect(result.google).toBe('20261203/20261205');
  });

  it('keeps a single-day whole-day event on its day (exclusive end = next day)', () => {
    const result = formatDatesForCalendar(
      '2026-12-03T00:00:00.000Z',
      '2026-12-03T00:00:00.000Z',
      true
    );

    expect(result.icalStart).toBe('20261203');
    expect(result.icalEnd).toBe('20261204');
  });
});
