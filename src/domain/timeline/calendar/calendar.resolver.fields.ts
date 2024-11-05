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
import { SpaceLevel } from '@common/enums/space.level';
import { SpaceSettingsService } from '@domain/space/space.settings/space.settings.service';

@Resolver(() => ICalendar)
export class CalendarResolverFields {
  constructor(
    private calendarService: CalendarService,
    private spaceSettingsService: SpaceSettingsService
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
  public async events(
    @Parent() calendar: ICalendar,
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) args: CalendarArgsEvents
  ) {
    return this.calendarService.getCalendarEventsArgs(
      calendar,
      args,
      agentInfo
    );
  }
  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('subspaceEvents', () => [ICalendarEvent], {
    nullable: true,
    description:
      'List of events in the immediate Subspaces. Only visible if allowed in the Space settings and per event.',
  })
  public async subspaceEvents(
    @Parent() calendar: ICalendar,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    const space = await this.calendarService.getSpaceFromCalendarOrFail(
      calendar.id
    );

    if (space.level !== SpaceLevel.SPACE) {
      return null;
    }

    const spaceSettings = this.spaceSettingsService.getSettings(
      space.settingsStr
    );
    const subspaceEventsShouldBubble =
      spaceSettings.collaboration.allowEventsFromSubspaces;

    if (!subspaceEventsShouldBubble) {
      return null;
    }

    return this.calendarService.getCalendarEventsFromSubspaces(
      space.id,
      agentInfo
    );
  }
}
