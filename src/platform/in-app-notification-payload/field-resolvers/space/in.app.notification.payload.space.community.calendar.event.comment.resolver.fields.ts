import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { InAppNotificationPayloadSpaceCommunityCalendarEventComment } from '@platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.calendar.event.comment';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { CalendarEventLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/calendar.event.loader.creator';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceLoaderCreator } from '@core/dataloader/creators/loader.creators/in-app-notification/space.loader.creator';

@Resolver(() => InAppNotificationPayloadSpaceCommunityCalendarEventComment)
export class InAppNotificationPayloadSpaceCommunityCalendarEventCommentResolverFields {
  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'The space details.',
  })
  public space(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunityCalendarEventComment,
    @Loader(SpaceLoaderCreator, { resolveToNull: true })
    loader: ILoader<ISpace | null>
  ) {
    return loader.load(payload.spaceID);
  }

  @ResolveField('calendarEvent', () => ICalendarEvent, {
    nullable: true,
    description: 'The calendar event that was commented on.',
  })
  async calendarEvent(
    @Parent()
    payload: InAppNotificationPayloadSpaceCommunityCalendarEventComment,
    @Loader(CalendarEventLoaderCreator)
    loader: ILoader<ICalendarEvent>
  ): Promise<ICalendarEvent | null> {
    try {
      return await loader.load(payload.calendarEventID);
    } catch {
      return null;
    }
  }
}
