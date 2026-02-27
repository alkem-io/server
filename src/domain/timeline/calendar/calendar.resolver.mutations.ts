import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { NotificationInputCommunityCalendarEventCreated } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.calendar.event.created';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { TimelineResolverService } from '@services/infrastructure/entity-resolver/timeline.resolver.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { ICalendarEvent } from '../event/event.interface';
import { CalendarEventService } from '../event/event.service';
import { CalendarEventAuthorizationService } from '../event/event.service.authorization';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventOnCalendarInput } from './dto/calendar.dto.create.event';

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
    @CurrentActor() actorContext: ActorContext,
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
      actorContext.actorID
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
          triggeredBy: actorContext.actorID,
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
