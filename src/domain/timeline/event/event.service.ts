import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoomType } from '@common/enums/room.type';
import { SpaceLevel } from '@common/enums/space.level';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { RoomService } from '@domain/communication/room/room.service';
import { ISpace } from '@domain/space/space/space.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { CreateCalendarEventInput } from './dto/event.dto.create';
import { DeleteCalendarEventInput } from './dto/event.dto.delete';
import { UpdateCalendarEventInput } from './dto/event.dto.update';
import { CalendarEvent } from './event.entity';
import { ICalendarEvent } from './event.interface';
import { calendarEvents } from './event.schema';
import { spaces } from '@domain/space/space/space.schema';

@Injectable()
export class CalendarEventService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomService: RoomService,
    private profileService: ProfileService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createCalendarEvent(
    calendarEventInput: CreateCalendarEventInput,
    storageAggregator: IStorageAggregator,
    userID: string
  ): Promise<ICalendarEvent> {
    const calendarEvent: ICalendarEvent =
      CalendarEvent.create(calendarEventInput);
    calendarEvent.profile = await this.profileService.createProfile(
      calendarEventInput.profileData,
      ProfileType.CALENDAR_EVENT,
      storageAggregator
    );
    await this.profileService.addOrUpdateTagsetOnProfile(
      calendarEvent.profile,
      {
        name: TagsetReservedName.DEFAULT,
        tags: calendarEventInput.tags || [],
      }
    );
    calendarEvent.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.CALENDAR_EVENT
    );
    calendarEvent.createdBy = userID;

    calendarEvent.comments = await this.roomService.createRoom({
      displayName: `calendarEvent-comments-${calendarEvent.nameID}`,
      type: RoomType.CALENDAR_EVENT,
    });

    return await this.save(calendarEvent);
  }

  public async save(calendarEvent: ICalendarEvent): Promise<ICalendarEvent> {
    if (calendarEvent.id) {
      const [updated] = await this.db
        .update(calendarEvents)
        .set({
          nameID: calendarEvent.nameID,
          type: calendarEvent.type,
          createdBy: calendarEvent.createdBy,
          startDate: calendarEvent.startDate,
          wholeDay: calendarEvent.wholeDay,
          multipleDays: calendarEvent.multipleDays,
          durationMinutes: calendarEvent.durationMinutes,
          durationDays: calendarEvent.durationDays,
          visibleOnParentCalendar: calendarEvent.visibleOnParentCalendar,
          commentsId: calendarEvent.comments?.id,
          calendarId: calendarEvent.calendar?.id,
          profileId: calendarEvent.profile?.id,
          authorizationId: calendarEvent.authorization?.id,
        })
        .where(eq(calendarEvents.id, calendarEvent.id))
        .returning();
      return updated as unknown as ICalendarEvent;
    }
    const [inserted] = await this.db
      .insert(calendarEvents)
      .values({
        nameID: calendarEvent.nameID,
        type: calendarEvent.type,
        createdBy: calendarEvent.createdBy,
        startDate: calendarEvent.startDate,
        wholeDay: calendarEvent.wholeDay,
        multipleDays: calendarEvent.multipleDays,
        durationMinutes: calendarEvent.durationMinutes,
        durationDays: calendarEvent.durationDays,
        visibleOnParentCalendar: calendarEvent.visibleOnParentCalendar,
        commentsId: calendarEvent.comments?.id,
        calendarId: calendarEvent.calendar?.id,
        profileId: calendarEvent.profile?.id,
        authorizationId: calendarEvent.authorization?.id,
      })
      .returning();
    return inserted as unknown as ICalendarEvent;
  }

  public async deleteCalendarEvent(
    deleteData: DeleteCalendarEventInput
  ): Promise<ICalendarEvent> {
    const calendarEventID = deleteData.ID;
    const calendarEvent = await this.getCalendarEventOrFail(calendarEventID, {
      relations: { profile: true, comments: true },
    });
    if (calendarEvent.authorization) {
      await this.authorizationPolicyService.delete(calendarEvent.authorization);
    }
    if (calendarEvent.profile) {
      await this.profileService.deleteProfile(calendarEvent.profile.id);
    }
    if (calendarEvent.comments) {
      await this.roomService.deleteRoom({
        roomID: calendarEvent.comments.id,
      });
    }

    await this.db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, calendarEventID));
    calendarEvent.id = calendarEventID;
    return calendarEvent;
  }

  public async getCalendarEventOrFail(
    calendarEventID: string,
    options?: {
      relations?: { profile?: boolean; comments?: boolean; calendar?: boolean };
    }
  ): Promise<ICalendarEvent | never> {
    const withClause: Record<string, boolean> = {};
    if (options?.relations?.profile) withClause.profile = true;
    if (options?.relations?.comments) withClause.comments = true;
    if (options?.relations?.calendar) withClause.calendar = true;

    const calendarEvent = await this.db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, calendarEventID),
      with: Object.keys(withClause).length > 0 ? withClause : undefined,
    });
    if (!calendarEvent)
      throw new EntityNotFoundException(
        `Not able to locate calendarEvent with the specified ID: ${calendarEventID}`,
        LogContext.CALENDAR
      );
    return calendarEvent as unknown as ICalendarEvent;
  }

  public async updateCalendarEvent(
    calendarEventData: UpdateCalendarEventInput
  ): Promise<ICalendarEvent> {
    const calendarEvent = await this.getCalendarEventOrFail(
      calendarEventData.ID,
      {
        relations: { profile: true, comments: true },
      }
    );

    if (calendarEventData.profileData) {
      if (!calendarEvent.profile) {
        throw new EntityNotFoundException(
          `CalendarEvent not initialised: ${calendarEvent.id}`,
          LogContext.CALENDAR
        );
      }

      // Sync room name if displayName is changing
      if (
        calendarEventData.profileData.displayName &&
        calendarEvent.comments &&
        calendarEvent.profile.displayName !==
          calendarEventData.profileData.displayName
      ) {
        const newRoomName = `calendarEvent-comments-${calendarEvent.nameID}`;
        await this.roomService.updateRoomDisplayName(
          calendarEvent.comments,
          newRoomName
        );
      }

      calendarEvent.profile = await this.profileService.updateProfile(
        calendarEvent.profile,
        calendarEventData.profileData
      );
    }
    if (calendarEventData.durationDays) {
      calendarEvent.durationDays = calendarEventData.durationDays;
    }
    if (calendarEventData.durationMinutes) {
      calendarEvent.durationMinutes = calendarEventData.durationMinutes;
    }
    calendarEvent.wholeDay = calendarEventData.wholeDay;
    calendarEvent.multipleDays = calendarEventData.multipleDays;
    calendarEvent.startDate = calendarEventData.startDate;

    if (calendarEventData.type) {
      calendarEvent.type = calendarEventData.type;
    }

    calendarEvent.visibleOnParentCalendar =
      calendarEventData.visibleOnParentCalendar ??
      calendarEvent.visibleOnParentCalendar;

    const [updated] = await this.db
      .update(calendarEvents)
      .set({
        type: calendarEvent.type,
        startDate: calendarEvent.startDate,
        wholeDay: calendarEvent.wholeDay,
        multipleDays: calendarEvent.multipleDays,
        durationMinutes: calendarEvent.durationMinutes,
        durationDays: calendarEvent.durationDays,
        visibleOnParentCalendar: calendarEvent.visibleOnParentCalendar,
      })
      .where(eq(calendarEvents.id, calendarEvent.id))
      .returning();
    return updated as unknown as ICalendarEvent;
  }

  public async saveCalendarEvent(
    calendarEvent: ICalendarEvent
  ): Promise<ICalendarEvent> {
    return await this.save(calendarEvent);
  }

  public async getCalendarEvent(
    calendarId: string,
    eventID: string
  ): Promise<ICalendarEvent> {
    const event = await this.db.query.calendarEvents.findFirst({
      where: and(
        eq(calendarEvents.id, eventID),
        eq(calendarEvents.calendarId, calendarId)
      ),
    });
    if (!event)
      throw new EntityNotFoundException(
        `Not able to locate calendarEvent with the specified ID: ${eventID}`,
        LogContext.CALENDAR
      );
    return event as unknown as ICalendarEvent;
  }

  public async getCalendarEvents(
    eventIds: string[]
  ): Promise<ICalendarEvent[]> {
    if (eventIds.length === 0) return [];
    const events = await this.db.query.calendarEvents.findMany({
      where: inArray(calendarEvents.id, eventIds),
    });
    return events as unknown as ICalendarEvent[];
  }

  public async getProfileOrFail(
    calendarEvent: ICalendarEvent
  ): Promise<IProfile> {
    const calendarEventLoaded = await this.getCalendarEventOrFail(
      calendarEvent.id,
      {
        relations: { profile: true },
      }
    );
    if (!calendarEventLoaded.profile)
      throw new EntityNotFoundException(
        `Post profile not initialised for calendarEvent: ${calendarEvent.id}`,
        LogContext.CALENDAR
      );

    return calendarEventLoaded.profile;
  }

  public async getSubspace(
    calendarEvent: ICalendarEvent
  ): Promise<ISpace | undefined> {
    const result = await this.db.execute<{ spaceId: string }>(sql`
      SELECT "subspace"."id" AS "spaceId"
      FROM "calendar_event" AS "calendarEvent"
      LEFT JOIN "calendar" ON "calendar"."id" = "calendarEvent"."calendarId"
      LEFT JOIN "timeline" ON "timeline"."calendarId" = "calendar"."id"
      LEFT JOIN "collaboration" ON "collaboration"."timelineId" = "timeline"."id"
      LEFT JOIN "space" AS "subspace" ON "subspace"."collaborationId" = "collaboration"."id"
      WHERE "calendarEvent"."id" = ${calendarEvent.id}
        AND "subspace"."level" != ${SpaceLevel.L0}
      LIMIT 1
    `);

    const spaceParentOfTheEvent = Array.from(result)[0];
    if (!spaceParentOfTheEvent) {
      return undefined;
    }

    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.id, spaceParentOfTheEvent.spaceId),
    });

    return (space as unknown as ISpace) ?? undefined;
  }

  public async getComments(calendarEventID: string) {
    const calendarEventLoaded = await this.getCalendarEventOrFail(
      calendarEventID,
      {
        relations: { comments: true },
      }
    );

    if (!calendarEventLoaded.comments) {
      throw new EntityNotFoundException(
        `Comments not found on calendarEvent: ${calendarEventID}`,
        LogContext.CALENDAR
      );
    }

    return calendarEventLoaded.comments;
  }
}
