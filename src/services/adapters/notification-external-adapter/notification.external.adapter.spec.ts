import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import {
  formatDatesForCalendar,
  generateCalendarUrls,
  generateICS,
} from '../../../domain/timeline/event/calendar.event.calendar-links';
import { NotificationExternalAdapter } from './notification.external.adapter';

describe('NotificationExternalAdapter', () => {
  let service: NotificationExternalAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationExternalAdapter],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<NotificationExternalAdapter>(
      NotificationExternalAdapter
    );
  });

  it('formats calendar dates for Google and Outlook', () => {
    const result = formatDatesForCalendar(
      '2026-02-20T10:00:00Z',
      '2026-02-20T11:00:00Z'
    );

    expect(result.google).toBe('20260220T100000Z/20260220T110000Z');
    expect(result.outlookStart).toBe('2026-02-20T10:00:00Z');
    expect(result.outlookEnd).toBe('2026-02-20T11:00:00Z');
    expect(result.icalStart).toBe('20260220T100000Z');
    expect(result.icalEnd).toBe('20260220T110000Z');
  });

  it('generates calendar URLs with encoded fields', () => {
    const urls = generateCalendarUrls({
      id: 'event-1',
      title: 'Team Sync & Review',
      url: 'https://alkem.io/events/1',
      startDate: '2026-02-20T10:00:00Z',
      endDate: '2026-02-20T11:00:00Z',
      description: 'Agenda: Q1, Q2',
      location: 'HQ, Amsterdam',
    });

    expect(urls.googleCalendarUrl).toContain(
      'text=Team%20Sync%20%26%20Review'
    );
    expect(urls.googleCalendarUrl).toContain(
      'details=Agenda%3A%20Q1%2C%20Q2'
    );
    expect(urls.googleCalendarUrl).toContain('location=HQ%2C%20Amsterdam');
    expect(urls.outlookCalendarUrl).toContain(
      'subject=Team%20Sync%20%26%20Review'
    );
    expect(urls.appleCalendarUrl).toMatch(
      /^data:text\/calendar;charset=utf8,/u
    );
    expect(urls.icsDownloadUrl).toBe(urls.appleCalendarUrl);
  });

  it('generates RFC5545 iCalendar content', () => {
    const ics = generateICS(
      {
        id: 'event-1',
        title: 'Event Title',
        url: 'https://alkem.io/events/1',
        startDate: '2026-02-20T10:00:00Z',
        endDate: '2026-02-20T11:00:00Z',
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
});
