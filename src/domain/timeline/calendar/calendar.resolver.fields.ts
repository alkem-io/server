import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationActorPrivilege,
  CurrentActor,
} from '@src/common/decorators';
import { ActorContext } from '@core/actor-context';
import { CalendarService } from './calendar.service';
import { UUID } from '@domain/common/scalars';
import { SpaceSettingsService } from '@domain/space/space.settings/space.settings.service';
import { ICalendarEvent } from '@domain/timeline/event';
import { ICalendar } from './calendar.interface';

@Resolver(() => ICalendar)
export class CalendarResolverFields {
  constructor(
    private calendarService: CalendarService,
    private spaceSettingsService: SpaceSettingsService
  ) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('event', () => ICalendarEvent, {
    nullable: true,
    description: 'A single CalendarEvent',
  })
  async event(
    @Parent() calendar: ICalendar,
    @CurrentActor() actorContext: ActorContext,
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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('events', () => [ICalendarEvent], {
    nullable: false,
    description: 'The list of CalendarEvents for this Calendar.',
  })
  public async events(
    @Parent() calendar: ICalendar,
    @CurrentActor() actorContext: ActorContext
  ) {
    const space = await this.calendarService.getSpaceFromCalendarOrFail(
      calendar.id
    );

    const spaceSettings = space.settings;
    const shouldSubspaceEventsBubble =
      spaceSettings.collaboration.allowEventsFromSubspaces;

    return this.calendarService.getCalendarEvents(
      calendar,
      actorContext,
      shouldSubspaceEventsBubble ? space.id : undefined
    );
  }
}
