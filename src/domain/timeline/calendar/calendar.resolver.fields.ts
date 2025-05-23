import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CalendarService } from './calendar.service';
import { UUID } from '@domain/common/scalars';
import { SpaceSettingsService } from '@domain/space/space.settings/space.settings.service';
import { ICalendarEvent } from '../event/event.interface';
import { ICalendar } from './calendar.interface';

@Resolver(() => ICalendar)
export class CalendarResolverFields {
  constructor(
    private calendarService: CalendarService,
    private spaceSettingsService: SpaceSettingsService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('event', () => ICalendarEvent, {
    nullable: true,
    description: 'A single CalendarEvent',
  })
  async event(
    @Parent() calendar: ICalendar,
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'ID',
      nullable: false,
      type: () => UUID,
      description: 'The ID of the CalendarEvent',
    })
    idOrNameId: string
  ): Promise<ICalendarEvent> {
    return this.calendarService.getCalendarEvent(calendar.id, idOrNameId);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('events', () => [ICalendarEvent], {
    nullable: false,
    description: 'The list of CalendarEvents for this Calendar.',
  })
  public async events(
    @Parent() calendar: ICalendar,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    const space = await this.calendarService.getSpaceFromCalendarOrFail(
      calendar.id
    );

    const spaceSettings = space.settings;
    const shouldSubspaceEventsBubble =
      spaceSettings.collaboration.allowEventsFromSubspaces;

    return this.calendarService.getCalendarEvents(
      calendar,
      agentInfo,
      shouldSubspaceEventsBubble ? space.id : undefined
    );
  }
}
