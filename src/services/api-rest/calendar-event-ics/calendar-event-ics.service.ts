import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  CalendarEventCalendarData,
  calculateCalendarEventEndDate,
  formatDatesForCalendar,
  formatLocation,
  generateICS,
  toIsoString,
  validateCalendarDateRange,
} from '@domain/timeline/event/calendar.event.calendar-links';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

export interface CalendarEventIcsResult {
  filename: string;
  content: string;
}

@Injectable()
export class CalendarEventIcsService {
  constructor(
    private readonly calendarEventService: CalendarEventService,
    private readonly authorizationService: AuthorizationService,
    private readonly urlGeneratorService: UrlGeneratorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async generateIcs(
    eventId: string,
    agentInfo: AgentInfo
  ): Promise<CalendarEventIcsResult> {
    const event = await this.calendarEventService.getCalendarEventOrFail(
      eventId,
      { relations: { profile: true } }
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      event.authorization,
      AuthorizationPrivilege.READ,
      `ics download for calendar event`
    );

    const calendarEventUrl =
      await this.urlGeneratorService.getCalendarEventUrlPath(eventId);

    const startDateIso = toIsoString(event.startDate, 'startDate');
    const endDateIso = toIsoString(
      calculateCalendarEventEndDate(event).toISOString(),
      'endDate'
    );
    validateCalendarDateRange(startDateIso, endDateIso, eventId);

    const profile = await this.calendarEventService.getProfileOrFail(event);
    const description = profile.description ?? undefined;
    const location = formatLocation(profile.location);

    const calendarEventData: CalendarEventCalendarData = {
      id: event.id,
      title: profile.displayName,
      url: calendarEventUrl,
      startDate: startDateIso,
      endDate: endDateIso,
      wholeDay: event.wholeDay,
      description,
      location,
    };

    const dates = formatDatesForCalendar(startDateIso, endDateIso);
    const content = generateICS(
      calendarEventData,
      dates.icalStart,
      dates.icalEnd
    );

    this.logger.verbose?.(
      `ICS generated for calendar event ${eventId} by user ${agentInfo.userID}`,
      LogContext.CALENDAR
    );

    return {
      filename: `${event.nameID}.ics`,
      content,
    };
  }
}
