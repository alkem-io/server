import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalendarService } from './calendar.service';
import { ICalendarEvent } from '../event/event.interface';
import { CalendarEventAuthorizationService } from '../event/event.service.authorization';
import { CreateCalendarEventOnCalendarInput } from './dto/calendar.dto.create.event';

@Resolver()
export class CalendarResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private calendarService: CalendarService,
    private calendarEventAuthorizationService: CalendarEventAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICalendarEvent, {
    description: 'Create a new CalendarEvent on the Calendar.',
  })
  @Profiling.api
  async createCalendarEventOnCalendar(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('packData') eventData: CreateCalendarEventOnCalendarInput
  ): Promise<ICalendarEvent> {
    const calendar = await this.calendarService.getCalendarOrFail();

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      calendar.authorization,
      AuthorizationPrivilege.CREATE,
      `create calendarEvent on calendar: ${calendar.id}`
    );

    const calendarEvent = await this.calendarService.createCalendarEvent(
      eventData,
      agentInfo.userID
    );
    const communityPolicy = await this.calendarService.getCommunityPolicy(
      calendar.id
    );
    const calendarEventAuthorized =
      await this.calendarEventAuthorizationService.applyAuthorizationPolicy(
        calendarEvent,
        calendar.authorization,
        communityPolicy
      );
    return calendarEventAuthorized;
  }
}
