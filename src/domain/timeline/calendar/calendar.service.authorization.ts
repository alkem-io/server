import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalendarService } from './calendar.service';
import { ICalendar } from './calendar.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { CalendarEventAuthorizationService } from '../event/event.service.authorization';
import { ICalendarEvent } from '../event/event.interface';

@Injectable()
export class CalendarAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private calendarEventAuthorizationService: CalendarEventAuthorizationService,
    private calendarService: CalendarService
  ) {}

  async applyAuthorizationPolicy(
    calendar: ICalendar,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICalendar> {
    // Ensure always applying from a clean state
    calendar.authorization = this.authorizationPolicyService.reset(
      calendar.authorization
    );
    calendar.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        calendar.authorization,
        parentAuthorization
      );

    // Cascade down
    const calendarPropagated = await this.propagateAuthorizationToChildEntities(
      calendar
    );

    return calendarPropagated;
  }

  private async propagateAuthorizationToChildEntities(
    calendar: ICalendar
  ): Promise<ICalendar> {
    calendar.events = await this.calendarService.getCalendarEvents(calendar);
    const updatedEvents: ICalendarEvent[] = [];
    for (const event of calendar.events) {
      const updatedEvent =
        await this.calendarEventAuthorizationService.applyAuthorizationPolicy(
          event,
          calendar.authorization
        );
      updatedEvents.push(updatedEvent);
    }
    calendar.events = updatedEvents;

    return calendar;
  }
}
