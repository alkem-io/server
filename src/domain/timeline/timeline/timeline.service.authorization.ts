import { Injectable } from '@nestjs/common';
import { ITimeline } from './timeline.interface';
import { TimelineService } from './timeline.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalendarAuthorizationService } from '../calendar/calendar.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums/logging.context';

@Injectable()
export class TimelineAuthorizationService {
  constructor(
    private calendarAuthorizationService: CalendarAuthorizationService,
    private timelineService: TimelineService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  async applyAuthorizationPolicy(
    timelineInput: ITimeline,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const timeline = await this.timelineService.getTimelineOrFail(
      timelineInput.id,
      {
        relations: { calendar: true },
      }
    );
    if (!timeline.calendar) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on auth reset for timeline ${timeline.id} `,
        LogContext.CALENDAR
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    timeline.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        timeline.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(timeline.authorization);

    // Cascade down
    const calendarAuthorizations =
      await this.calendarAuthorizationService.applyAuthorizationPolicy(
        timeline.calendar,
        timeline.authorization
      );
    updatedAuthorizations.push(...calendarAuthorizations);

    return updatedAuthorizations;
  }
}
