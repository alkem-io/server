import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { ICalendar } from './calendar.interface';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CalendarEventService } from '../event/event.service';
import { ICalendarEvent } from '../event/event.interface';
import { AgentInfo } from '@core/authentication/agent-info';
import { CalendarArgsEvents } from './dto/calendar.args.events';
import { CalendarService } from './calendar.service';

@Resolver(() => ICalendar)
export class CalendarResolverFields {
  constructor(
    private calendarEventService: CalendarEventService,
    private calendarService: CalendarService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('event', () => ICalendarEvent, {
    nullable: true,
    description: 'A single CalendarEvent',
  })
  @UseGuards(GraphqlGuard)
  async event(
    @Parent() calendar: ICalendar,
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID,
      description: 'The ID of the CalendarEvent',
    })
    ID: string
  ): Promise<ICalendarEvent> {
    const results = await this.calendarService.getCalendarEventsArgs(
      calendar,
      { IDs: [ID] },
      agentInfo
    );
    return results[0];
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('events', () => [ICalendarEvent], {
    nullable: true,
    description: 'The list of CalendarEvents for this Calendar.',
  })
  async callouts(
    @Parent() calendar: ICalendar,
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) args: CalendarArgsEvents
  ) {
    return await this.calendarService.getCalendarEventsArgs(
      calendar,
      args,
      agentInfo
    );
  }
}
