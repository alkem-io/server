import { CalendarEventLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/calendar.event.loader.creator';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InAppNotificationPayloadSpaceCommunityCalendarEventComment } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.calendar.event.comment';

@Resolver(() => InAppNotificationPayloadSpaceCommunityCalendarEventComment)
export class InAppNotificationPayloadSpaceCommunityCalendarEventCommentResolverFields {
  @ResolveField(() => ISpace, {
    nullable: false,
    description: 'The space details.',
  })
  public space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunityCalendarEventComment,
    @Loader(SpaceLoaderCreator)
    loader: ILoader<ISpace>
  ) {
    return loader.load(payload.spaceID);
  }

  @ResolveField('calendarEvent', () => ICalendarEvent, {
    nullable: false,
    description: 'The calendar event that was commented on.',
  })
  async calendarEvent(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunityCalendarEventComment,
    @Loader(CalendarEventLoaderCreator)
    loader: ILoader<ICalendarEvent>
  ): Promise<ICalendarEvent> {
    return loader.load(payload.calendarEventID);
  }
}
