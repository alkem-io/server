import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { CalendarEventAuthorizationService } from '../event/event.service.authorization';
import { ICalendar } from './calendar.interface';
import { CalendarService } from './calendar.service';

@Injectable()
export class CalendarAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private calendarEventAuthorizationService: CalendarEventAuthorizationService,
    private calendarService: CalendarService
  ) {}

  async applyAuthorizationPolicy(
    calendarInput: ICalendar,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const calendar = await this.calendarService.getCalendarOrFail(
      calendarInput.id,
      {
        relations: {
          events: true,
        },
      }
    );
    if (!calendar.events) {
      throw new RelationshipNotFoundException(
        `Unable to load entities for calendar auth reset: ${calendarInput.id} `,
        LogContext.AUTH
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Ensure always applying from a clean state
    calendar.authorization = this.authorizationPolicyService.reset(
      calendar.authorization
    );
    calendar.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        calendar.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(calendar.authorization);

    for (const event of calendar.events) {
      const eventAuthorizations =
        await this.calendarEventAuthorizationService.applyAuthorizationPolicy(
          event,
          calendar.authorization
        );
      updatedAuthorizations.push(...eventAuthorizations);
    }

    return updatedAuthorizations;
  }
}
