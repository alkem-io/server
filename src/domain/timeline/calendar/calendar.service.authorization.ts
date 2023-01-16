import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Calendar } from './calendar.entity';
import { CalendarService } from './calendar.service';
import { ICalendar } from './calendar.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { CalendarEventAuthorizationService } from '../event/event.service.authorization';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';

@Injectable()
export class CalendarAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private calendarEventAuthorizationService: CalendarEventAuthorizationService,
    private calendar: CalendarService,
    @InjectRepository(Calendar)
    private calendarRepository: Repository<Calendar>
  ) {}

  async applyAuthorizationPolicy(
    calendar: ICalendar,
    parentAuthorization: IAuthorizationPolicy | undefined,
    communityPolicy: ICommunityPolicy
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
      calendar,
      communityPolicy
    );

    return await this.calendarRepository.save(calendarPropagated);
  }

  private async propagateAuthorizationToChildEntities(
    calendar: ICalendar,
    communityPolicy: ICommunityPolicy
  ): Promise<ICalendar> {
    calendar.events = await this.calendar.getCalendarEvents(calendar);
    for (const event of calendar.events) {
      await this.calendarEventAuthorizationService.applyAuthorizationPolicy(
        event,
        calendar.authorization,
        communityPolicy
      );
    }

    return calendar;
  }
}
