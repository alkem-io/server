import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ISpace } from '@domain/space/space/space.interface';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { InAppNotificationPayloadSpaceCommunityCalendarEvent } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.calendar.event';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { CalendarEventLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/calendar.event.loader.creator';

@Resolver(() => InAppNotificationPayloadSpaceCommunityCalendarEvent)
export class InAppNotificationPayloadSpaceCommunityCalendarEventResolverFields {
  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The Space where the calendar event was created.',
  })
  public space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunityCalendarEvent,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }

  @ResolveField(() => ICalendarEvent, {
    nullable: true,
    description: 'The CalendarEvent that was created.',
  })
  public calendarEvent(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunityCalendarEvent,
    @Loader(CalendarEventLoaderCreator, { resolveToNull: true })
    loader: ILoader<ICalendarEvent | null>
  ) {
    return loader.load(payload.calendarEventID);
  }
}
