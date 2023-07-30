import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalendarService } from './calendar.service';
import { ICalendarEvent } from '../event/event.interface';
import { CalendarEventAuthorizationService } from '../event/event.service.authorization';
import { CreateCalendarEventOnCalendarInput } from './dto/calendar.dto.create.event';
import { ActivityInputCalendarEventCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.calendar.event.created';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ICalendar } from './calendar.interface';
import { ElasticsearchService } from '@services/external/elasticsearch';
import { TimelineResolverService } from '@services/infrastructure/entity-resolver/timeline.resolver.service';

@Resolver()
export class CalendarResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private calendarService: CalendarService,
    private calendarEventAuthorizationService: CalendarEventAuthorizationService,
    private activityAdapter: ActivityAdapter,
    private elasticSearchService: ElasticsearchService,
    private timelineResolverService: TimelineResolverService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICalendarEvent, {
    description: 'Create a new CalendarEvent on the Calendar.',
  })
  @Profiling.api
  async createEventOnCalendar(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('eventData') eventData: CreateCalendarEventOnCalendarInput
  ): Promise<ICalendarEvent> {
    const calendar = await this.calendarService.getCalendarOrFail(
      eventData.calendarID
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      calendar.authorization,
      AuthorizationPrivilege.CREATE,
      `create calendarEvent on calendar: ${calendar.id}`
    );

    const calendarEvent = await this.calendarService.createCalendarEvent(
      eventData,
      agentInfo.userID
    );

    const calendarEventAuthorized =
      await this.calendarEventAuthorizationService.applyAuthorizationPolicy(
        calendarEvent,
        calendar.authorization
      );

    await this.processActivityCalendarEventCreated(
      calendar,
      calendarEventAuthorized,
      agentInfo
    );

    return calendarEventAuthorized;
  }

  private async processActivityCalendarEventCreated(
    calendar: ICalendar,
    calendarEvent: ICalendarEvent,
    agentInfo: AgentInfo
  ) {
    const activityLogInput: ActivityInputCalendarEventCreated = {
      triggeredBy: agentInfo.userID,
      calendar: calendar,
      calendarEvent: calendarEvent,
    };
    this.activityAdapter.calendarEventCreated(activityLogInput);

    const spaceID = await this.timelineResolverService.getSpaceIdForCalendar(
      calendar.id
    );

    if (spaceID) {
      this.elasticSearchService.calendarEventCreated(
        {
          id: calendarEvent.id,
          name: calendarEvent.profile.displayName,
          space: spaceID,
        },
        {
          id: agentInfo.userID,
          email: agentInfo.email,
        }
      );
    }
  }
}
