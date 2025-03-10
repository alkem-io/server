import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalendarService } from './calendar.service';
import { ICalendarEvent } from '../event/event.interface';
import { CalendarEventAuthorizationService } from '../event/event.service.authorization';
import { CreateCalendarEventOnCalendarInput } from './dto/calendar.dto.create.event';
import { CalendarEventService } from '../event/event.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class CalendarResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calendarService: CalendarService,
    private calendarEventService: CalendarEventService,
    private calendarEventAuthorizationService: CalendarEventAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICalendarEvent, {
    description: 'Create a new CalendarEvent on the Calendar.',
  })
  @Profiling.api
  async createEventOnCalendar(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('eventData') eventData: CreateCalendarEventOnCalendarInput
  ): Promise<ICalendarEvent> {
    const calendar = await this.calendarService.getCalendarOrFail(
      eventData.calendarID
    );

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
    await this.calendarEventService.save(calendarEvent);

    const updatedAuthorizations =
      await this.calendarEventAuthorizationService.applyAuthorizationPolicy(
        calendarEvent,
        calendar.authorization
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    await this.calendarService.processActivityCalendarEventCreated(
      calendar,
      calendarEvent,
      agentInfo
    );

    return await this.calendarEventService.getCalendarEventOrFail(
      calendarEvent.id
    );
  }
}
