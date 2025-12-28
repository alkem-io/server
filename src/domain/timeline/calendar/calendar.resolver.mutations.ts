import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalendarService } from './calendar.service';
import { ICalendarEvent } from '@domain/timeline/event';
import { CalendarEventAuthorizationService } from '../event/event.service.authorization';
import { CreateCalendarEventOnCalendarInput } from './dto/calendar.dto.create.event';
import { CalendarEventService } from '../event/event.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { TimelineResolverService } from '@services/infrastructure/entity-resolver/timeline.resolver.service';
import { NotificationInputCommunityCalendarEventCreated } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.calendar.event.created';

@InstrumentResolver()
@Resolver()
export class CalendarResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calendarService: CalendarService,
    private calendarEventService: CalendarEventService,
    private calendarEventAuthorizationService: CalendarEventAuthorizationService,
    private notificationSpaceAdapter: NotificationSpaceAdapter,
    private timelineResolverService: TimelineResolverService
  ) {}

  @Mutation(() => ICalendarEvent, {
    description: 'Create a new CalendarEvent on the Calendar.',
  })
  @Profiling.api
  async createEventOnCalendar(
    @CurrentUser() actorContext: ActorContext,
    @Args('eventData') eventData: CreateCalendarEventOnCalendarInput
  ): Promise<ICalendarEvent> {
    const calendar = await this.calendarService.getCalendarOrFail(
      eventData.calendarID
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      calendar.authorization,
      AuthorizationPrivilege.CREATE,
      `create calendarEvent on calendar: ${calendar.id}`
    );

    const calendarEvent = await this.calendarService.createCalendarEvent(
      eventData,
      actorContext.actorId
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
      actorContext
    );

    // Send notification to community members
    const spaceID = await this.timelineResolverService.getSpaceIdForCalendar(
      calendar.id
    );

    if (spaceID) {
      const notificationInput: NotificationInputCommunityCalendarEventCreated =
        {
          triggeredBy: actorContext.actorId,
          calendarEvent: calendarEvent,
        };

      await this.notificationSpaceAdapter.spaceCommunityCalendarEventCreated(
        notificationInput,
        spaceID
      );
    }

    return await this.calendarEventService.getCalendarEventOrFail(
      calendarEvent.id
    );
  }
}
