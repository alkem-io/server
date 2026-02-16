import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { SpaceLevel } from '@common/enums/space.level';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ValidationException } from '@common/exceptions/validation.exception';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ISpace } from '@domain/space/space/space.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputCalendarEventCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.calendar.event.created';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { TimelineResolverService } from '@services/infrastructure/entity-resolver/timeline.resolver.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { ICalendarEvent } from '../event/event.interface';
import { CalendarEventService } from '../event/event.service';
import { Calendar } from './calendar.entity';
import { ICalendar } from './calendar.interface';
import { CreateCalendarEventOnCalendarInput } from './dto/calendar.dto.create.event';
import { calendars } from './calendar.schema';
import { calendarEvents } from '../event/event.schema';
import { timelines } from '@domain/timeline/timeline/timeline.schema';
import { collaborations } from '@domain/collaboration/collaboration/collaboration.schema';
import { spaces } from '@domain/space/space/space.schema';

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
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
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

    await this.db.delete(calendars).where(eq(calendars.id, calendarID));
    return calendar;
  }

  async getCalendarOrFail(
    calendarID: string,
    options?: { relations?: { authorization?: boolean; events?: boolean } }
  ): Promise<ICalendar | never> {
    const withClause: Record<string, boolean> = {};
    if (options?.relations?.authorization) withClause.authorization = true;
    if (options?.relations?.events) withClause.events = true;
    const calendar = await this.db.query.calendars.findFirst({
      where: eq(calendars.id, calendarID),
      with: Object.keys(withClause).length > 0 ? withClause : undefined,
    });
    if (!calendar)
      throw new EntityNotFoundException(
        `Calendar not found: ${calendarID}`,
        LogContext.CALENDAR
      );
    return calendar as unknown as ICalendar;
  }

  public async getCalendarEventsFromSubspaces(
    rootSpaceId: string
  ): Promise<ICalendarEvent[]> {
    const result = await this.db.execute<{ id: string }>(sql`
      SELECT "calendarEvent"."id"
      FROM "space" AS "subspace"
      LEFT JOIN "collaboration" ON "collaboration"."id" = "subspace"."collaborationId"
      LEFT JOIN "timeline" ON "timeline"."id" = "collaboration"."timelineId"
      LEFT JOIN "calendar" ON "calendar"."id" = "timeline"."calendarId"
      LEFT JOIN "calendar_event" AS "calendarEvent" ON "calendarEvent"."calendarId" = "calendar"."id"
      WHERE "subspace"."parentSpaceId" = ${rootSpaceId}
        AND "subspace"."level" = ${SpaceLevel.L1}
        AND "calendarEvent"."visibleOnParentCalendar" = true
        AND "calendarEvent"."id" IS NOT NULL
    `);

    const ids = Array.from(result).map(row => row.id);
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
    agentInfo: AgentInfo,
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
    return events.filter(event => this.hasAgentAccessToEvent(event, agentInfo));
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

  public async getSpaceFromCalendarOrFail(calendarId: string): Promise<ISpace> {
    const result = await this.db.execute<{
      id: string;
      nameID: string;
      level: number;
      visibility: string;
      collaborationId: string;
      aboutId: string;
      communityId: string;
      accountId: string;
      parentSpaceId: string;
      authorizationId: string;
    }>(sql`
      SELECT "space".*
      FROM "calendar"
      LEFT JOIN "timeline" ON "timeline"."calendarId" = "calendar"."id"
      LEFT JOIN "collaboration" ON "collaboration"."timelineId" = "timeline"."id"
      LEFT JOIN "space" ON "space"."collaborationId" = "collaboration"."id"
      WHERE "calendar"."id" = ${calendarId}
      LIMIT 1
    `);

    const rawSpace = Array.from(result)[0];
    if (!rawSpace) {
      throw new EntityNotFoundException(
        'Space not found for Calendar',
        LogContext.CALENDAR,
        { calendarId }
      );
    }
    return rawSpace as unknown as ISpace;
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
