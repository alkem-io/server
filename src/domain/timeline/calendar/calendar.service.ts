import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ValidationException } from '@common/exceptions/validation.exception';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { ICalendarEvent } from '../event/event.interface';
import { CalendarEventService } from '../event/event.service';
import { Calendar } from './calendar.entity';
import { ICalendar } from './calendar.interface';
import { CalendarArgsEvents } from './dto/calendar.args.events';
import { CreateCalendarEventOnCalendarInput } from './dto/calendar.dto.create.event';
import { ActivityInputCalendarEventCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.calendar.event.created';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { TimelineResolverService } from '@services/infrastructure/entity-resolver/timeline.resolver.service';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';

@Injectable()
export class CalendarService {
  constructor(
    private calendarEventService: CalendarEventService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private namingService: NamingService,
    private activityAdapter: ActivityAdapter,
    private contributionReporter: ContributionReporterService,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    private timelineResolverService: TimelineResolverService,
    @InjectRepository(Calendar)
    private calendarRepository: Repository<Calendar>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createCalendar(): ICalendar {
    const calendar: ICalendar = new Calendar();
    calendar.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.CALENDAR
    );
    calendar.events = [];

    return calendar;
  }

  async deleteCalendar(calendarID: string): Promise<ICalendar> {
    const calendar = await this.getCalendarOrFail(calendarID, {
      relations: { events: true },
    });

    if (calendar.authorization)
      await this.authorizationPolicyService.delete(calendar.authorization);

    if (calendar.events) {
      for (const event of calendar.events) {
        await this.calendarEventService.deleteCalendarEvent({
          ID: event.id,
        });
      }
    }

    return await this.calendarRepository.remove(calendar as Calendar);
  }

  async getCalendarOrFail(
    calendarID: string,
    options?: FindOneOptions<Calendar>
  ): Promise<ICalendar | never> {
    const calendar = await this.calendarRepository.findOne({
      where: { id: calendarID },
      ...options,
    });
    if (!calendar)
      throw new EntityNotFoundException(
        `Calendar not found: ${calendarID}`,
        LogContext.CALENDAR
      );
    return calendar;
  }

  public async getCalendarEvents(
    calendar: ICalendar
  ): Promise<ICalendarEvent[]> {
    const events = calendar.events;
    if (!events)
      throw new EntityNotFoundException(
        `Undefined calendar events found: ${calendar.id}`,
        LogContext.CALENDAR
      );

    return events;
  }

  public async createCalendarEvent(
    calendarEventData: CreateCalendarEventOnCalendarInput,
    userID: string
  ): Promise<ICalendarEvent> {
    const calendar = await this.getCalendarOrFail(
      calendarEventData.calendarID,
      {
        relations: {},
      }
    );

    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInCalendar(calendar.id);
    if (calendarEventData.nameID && calendarEventData.nameID.length > 0) {
      const nameTaken = reservedNameIDs.includes(calendarEventData.nameID);
      if (nameTaken)
        throw new ValidationException(
          `Unable to create CalendarEvent: the provided nameID is already taken: ${calendarEventData.nameID}`,
          LogContext.CALENDAR
        );
    } else {
      calendarEventData.nameID =
        this.namingService.createNameIdAvoidingReservedNameIDs(
          `${calendarEventData.profileData?.displayName}`,
          reservedNameIDs
        );
    }

    const storageAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForCalendar(
        calendar.id
      );
    const calendarEvent = await this.calendarEventService.createCalendarEvent(
      calendarEventData,
      storageAggregator,
      userID
    );
    calendarEvent.calendar = calendar;
    return await this.calendarEventService.save(calendarEvent);
  }

  public async getCalendarEventsArgs(
    calendar: ICalendar,
    args: CalendarArgsEvents,
    agentInfo: AgentInfo
  ): Promise<ICalendarEvent[]> {
    const calendarLoaded = await this.getCalendarOrFail(calendar.id, {
      relations: { events: true },
    });
    const allEvents = calendarLoaded.events;
    if (!allEvents)
      throw new EntityNotFoundException(
        `Calendar not initialised, no events: ${calendar.id}`,
        LogContext.CALENDAR
      );

    // First filter the events the current user has READ privilege to
    const readableEvents = allEvents.filter(event =>
      this.hasAgentAccessToEvent(event, agentInfo)
    );

    // (a) by IDs, results in order specified by IDs
    if (args.IDs) {
      const results: ICalendarEvent[] = [];
      for (const eventID of args.IDs) {
        const event = readableEvents.find(
          e => e.id === eventID || e.nameID === eventID
        );

        if (!event)
          throw new EntityNotFoundException(
            `Event with requested ID (${eventID}) not located within current Calendar: ${calendar.id}`,
            LogContext.CALENDAR
          );
        results.push(event);
      }
      return results;
    }

    // (b) limit number of results
    if (args.limit) {
      return limitAndShuffle(readableEvents, args.limit, false);
    }

    return readableEvents;
  }

  private hasAgentAccessToEvent(
    event: ICalendarEvent,
    agentInfo: AgentInfo
  ): boolean {
    return this.authorizationService.isAccessGranted(
      agentInfo,
      event.authorization,
      AuthorizationPrivilege.READ
    );
  }

  public async processActivityCalendarEventCreated(
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
      this.contributionReporter.calendarEventCreated(
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
