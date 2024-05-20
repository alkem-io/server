import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { ICalendar } from './calendar.interface';
import { ICalendarEvent } from '../event/event.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CalendarArgsEvents } from './dto/calendar.args.events';
import { CalendarService } from './calendar.service';
import { UUID_NAMEID } from '@domain/common/scalars';

@Resolver(() => ICalendar)
export class CalendarResolverFields {
  constructor(private calendarService: CalendarService) {}

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
      type: () => UUID_NAMEID,
      description: 'The ID or NAMEID of the CalendarEvent',
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
  async events(
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
