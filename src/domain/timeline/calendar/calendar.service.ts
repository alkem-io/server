import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { ICalendarEvent } from '@domain/timeline/event';
import { CalendarEventService } from '../event/event.service';
import { Calendar } from './calendar.entity';
import { ICalendar } from './calendar.interface';
import { CreateCalendarEventOnCalendarInput } from './dto/calendar.dto.create.event';
import { ActivityInputCalendarEventCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.calendar.event.created';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { TimelineResolverService } from '@services/infrastructure/entity-resolver/timeline.resolver.service';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ISpace } from '@domain/space/space/space.interface';
import { PrefixKeys } from '@src/types';
import { Space } from '@domain/space/space/space.entity';
import { convertToEntity } from '@common/utils/convert-to-entity';
import { Collaboration } from '@domain/collaboration/collaboration';
import { Timeline } from '@domain/timeline/timeline/timeline.entity';
import { CalendarEvent } from '@domain/timeline/event';
import { SpaceLevel } from '@common/enums/space.level';

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

  public async getCalendarEventsFromSubspaces(
    rootSpaceId: string
  ): Promise<ICalendarEvent[]> {
    const result = await this.calendarRepository.manager
      .createQueryBuilder(Space, 'subspace')
      // if all the subspaces must be included change the statement
      // to be levelZeroSpace = spaceId and level > space level
      .where({
        parentSpace: { id: rootSpaceId },
        level: SpaceLevel.L1,
      })
      .leftJoin(
        Collaboration,
        'collaboration',
        'collaboration.id = subspace.collaborationId'
      )
      .leftJoin(Timeline, 'timeline', 'timeline.id = collaboration.timelineId')
      .leftJoin(Calendar, 'calendar', 'calendar.id = timeline.calendarId')
      .leftJoin(
        CalendarEvent,
        'calendarEvent',
        'calendarEvent.calendarId = calendar.id'
      )
      // cannot find alias when using relations https://github.com/typeorm/typeorm/issues/2707
      .andWhere('calendarEvent.visibleOnParentCalendar = true')
      .andWhere('calendarEvent.id IS NOT NULL')
      .select('calendarEvent.id')
      .getRawMany<PrefixKeys<{ id: string }, 'calendarEvent_'>>();

    const ids = result.map(({ calendarEvent_id }) => calendarEvent_id);
    return this.calendarEventService.getCalendarEvents(ids);
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

  public async getCalendarEvents(
    calendar: ICalendar,
    actorContext: ActorContext,
    rootSpaceId?: string
  ): Promise<ICalendarEvent[]> {
    const calendarLoaded = await this.getCalendarOrFail(calendar.id, {
      relations: { events: true },
    });
    const events = calendarLoaded.events;
    if (!events) {
      throw new EntityNotFoundException(
        `Events not initialized on Calendar: ${calendar.id}`,
        LogContext.CALENDAR
      );
    }

    if (rootSpaceId) {
      const subspaceEvents =
        await this.getCalendarEventsFromSubspaces(rootSpaceId);
      events.push(...subspaceEvents);
    }

    // First filter the events the current user has READ privilege to
    return events.filter(event =>
      this.hasActorAccessToEvent(event, actorContext)
    );
  }

  public async getCalendarEvent(
    calendarId: string,
    idOrNameId: string
  ): Promise<ICalendarEvent> {
    const event = await this.calendarEventService.getCalendarEvent(
      calendarId,
      idOrNameId
    );
    if (!event) {
      throw new EntityNotFoundException(
        'Event not found in Calendar',
        LogContext.CALENDAR,
        { calendarId, eventId: idOrNameId }
      );
    }

    return event;
  }

  private hasActorAccessToEvent(
    event: ICalendarEvent,
    actorContext: ActorContext
  ): boolean {
    return this.authorizationService.isAccessGranted(
      actorContext,
      event.authorization,
      AuthorizationPrivilege.READ
    );
  }

  public async getSpaceFromCalendarOrFail(calendarId: string): Promise<ISpace> {
    const spaceAlias = 'space';
    const rawSpace = await this.calendarRepository
      .createQueryBuilder('calendar')
      .where({ id: calendarId })
      .leftJoin('timeline', 'timeline', 'timeline.calendarId = calendar.id')
      .leftJoin(
        'collaboration',
        'collaboration',
        'collaboration.timelineId = timeline.id'
      )
      .leftJoinAndSelect(
        'space',
        spaceAlias,
        'space.collaborationId = collaboration.id'
      )
      .getRawOne<PrefixKeys<Space, `${typeof spaceAlias}_`>>();

    if (!rawSpace) {
      throw new EntityNotFoundException(
        'Space not found for Calendar',
        LogContext.CALENDAR,
        { calendarId }
      );
    }
    // todo: not needed when using select instead of leftJoinAndSelect
    return convertToEntity(rawSpace, 'space_');
  }

  public async processActivityCalendarEventCreated(
    calendar: ICalendar,
    calendarEvent: ICalendarEvent,
    actorContext: ActorContext
  ) {
    const activityLogInput: ActivityInputCalendarEventCreated = {
      triggeredBy: actorContext.actorId,
      calendar: calendar,
      calendarEvent: calendarEvent,
    };
    void this.activityAdapter.calendarEventCreated(activityLogInput);

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
        actorContext.actorId
      );
    }
  }
}
