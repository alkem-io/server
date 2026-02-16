import { SMALL_TEXT_LENGTH } from '@common/constants';
import { LogContext } from '@common/enums';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { EntityNotFoundException } from '@common/exceptions';
import { ensureMaxLength } from '@common/utils';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { PaginationArgs } from '@core/pagination';
import { collaborations } from '@domain/collaboration/collaboration/collaboration.schema';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  LatestActivitiesPerSpace,
  SpaceMembershipCollaborationInfo,
} from '@services/api/me/space.membership.type';
import { and, asc, desc, eq, gt, inArray, lt, notInArray, sql } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Activity } from './activity.entity';
import { activities } from './activity.schema';
import { IActivity } from './activity.interface';
import { createLatestActivityPerSpaceMap } from './create.latest.activity.per.space';
import { CreateActivityInput } from './dto/activity.dto.create';

@Injectable()
export class ActivityService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createActivity(activityData: CreateActivityInput): Promise<IActivity> {
    activityData.description = ensureMaxLength(
      activityData.description,
      SMALL_TEXT_LENGTH
    );

    const activity: IActivity = Activity.create(activityData);
    return await this.save(activity);
  }

  async getActivityOrFail(activityID: string): Promise<IActivity> {
    const activity = await this.db.query.activities.findFirst({
      where: eq(activities.id, activityID),
    });
    if (!activity)
      throw new EntityNotFoundException(
        `Not able to locate Activity with the specified ID: ${activityID}`,
        LogContext.SPACES
      );
    return activity as unknown as IActivity;
  }

  async removeActivity(activityID: string): Promise<IActivity> {
    const activity = await this.getActivityOrFail(activityID);
    await this.db.delete(activities).where(eq(activities.id, activityID));
    return activity;
  }

  async save(activity: IActivity): Promise<IActivity> {
    const [saved] = await this.db
      .insert(activities)
      .values(activity as any)
      .onConflictDoUpdate({
        target: activities.id,
        set: activity as any,
      })
      .returning();
    return saved as unknown as IActivity;
  }

  async updateActivityVisibility(
    activity: IActivity,
    visibility: boolean
  ): Promise<IActivity> {
    activity.visibility = visibility;
    return await this.save(activity);
  }

  async getActivityForCollaborations(
    collaborationIDs: string[],
    options?: {
      types?: ActivityEventType[];
      limit?: number;
      visibility?: boolean;
      userID?: string;
    }
  ): Promise<IActivity[]> {
    const { types, visibility = true, limit, userID } = options ?? {};

    const conditions = [
      inArray(activities.collaborationID, collaborationIDs),
      eq(activities.visibility, visibility),
    ];

    if (types && types.length > 0) {
      conditions.push(inArray(activities.type, types));
    }

    if (userID) {
      conditions.push(eq(activities.triggeredBy, userID));
    }

    let query = this.db
      .select()
      .from(activities)
      .where(and(...conditions))
      .orderBy(sql`${activities.createdDate} DESC`);

    if (limit) {
      query = query.limit(limit) as any;
    }

    const results = await query;
    return results as unknown as IActivity[];
  }

  public async getPaginatedActivity(
    collaborationIDs: string[],
    options?: {
      types?: ActivityEventType[];
      visibility?: boolean;
      userID?: string;
      orderBy?: 'ASC' | 'DESC';
      paginationArgs?: PaginationArgs;
      excludeTypes?: ActivityEventType[];
    }
  ) {
    const {
      types,
      visibility = true,
      userID,
      orderBy = 'DESC',
      paginationArgs = {},
      excludeTypes,
    } = options ?? {};

    const conditions = [
      inArray(activities.collaborationID, collaborationIDs),
      eq(activities.visibility, visibility),
    ];

    if (userID) {
      conditions.push(eq(activities.triggeredBy, userID));
    }

    if (excludeTypes && excludeTypes.length > 0) {
      conditions.push(notInArray(activities.type, excludeTypes));
    }

    if (types && types.length > 0) {
      const filteredTypes =
        excludeTypes && excludeTypes.length > 0
          ? types.filter(type => !excludeTypes.includes(type))
          : types;
      conditions.push(inArray(activities.type, filteredTypes));
    }

    const whereClause = and(...conditions);
    const sortFn = orderBy === 'ASC' ? asc : desc;

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(activities)
      .where(whereClause);
    const total = Number(countResult[0]?.count ?? 0);

    // Handle cursor-based pagination
    const { first, after, last, before } = paginationArgs;
    const limit = first ?? last ?? 25;
    const paginationConditions = [...conditions];

    if (after) {
      // Find the rowId of the cursor
      const cursorItem = await this.db.query.activities.findFirst({
        where: eq(activities.id, after),
        columns: { rowId: true },
      });
      if (cursorItem) {
        paginationConditions.push(
          orderBy === 'ASC'
            ? gt(activities.rowId, cursorItem.rowId)
            : lt(activities.rowId, cursorItem.rowId)
        );
      }
    }
    if (before) {
      const cursorItem = await this.db.query.activities.findFirst({
        where: eq(activities.id, before),
        columns: { rowId: true },
      });
      if (cursorItem) {
        paginationConditions.push(
          orderBy === 'ASC'
            ? lt(activities.rowId, cursorItem.rowId)
            : gt(activities.rowId, cursorItem.rowId)
        );
      }
    }

    const items = await this.db
      .select()
      .from(activities)
      .where(and(...paginationConditions))
      .orderBy(sortFn(activities.rowId))
      .limit(limit);

    const startCursor = items[0]?.id;
    const endCursor = items[items.length - 1]?.id;

    return {
      total,
      items: items as unknown as IActivity[],
      pageInfo: {
        startCursor,
        endCursor,
        hasNextPage: items.length === limit,
        hasPreviousPage: !!(after || before),
      },
    };
  }

  public async getGroupedActivity(
    collaborationIDs: string[],
    options?: {
      types?: ActivityEventType[];
      visibility?: boolean;
      userID?: string;
      orderBy?: 'ASC' | 'DESC';
      limit?: number;
    }
  ): Promise<IActivity[]> {
    const {
      types,
      visibility = true,
      userID,
      orderBy = 'DESC',
      limit,
    } = options ?? {};

    const conditions = [eq(activities.visibility, visibility)];

    if (collaborationIDs && collaborationIDs.length > 0) {
      conditions.push(inArray(activities.collaborationID, collaborationIDs));
    }

    if (types && types.length > 0) {
      conditions.push(inArray(activities.type, types));
    }

    if (userID) {
      conditions.push(eq(activities.triggeredBy, userID));
    }

    const groupedResult = await this.db.execute<{ latest: number }>(sql`
      SELECT activity."triggeredBy", activity."resourceID", activity.type,
             MAX(activity."rowId") as latest
      FROM activity
      WHERE ${and(...conditions)}
      GROUP BY activity."resourceID", activity."triggeredBy", activity.type
      ORDER BY latest ${sql.raw(orderBy)}
      ${limit ? sql`LIMIT ${limit}` : sql``}
    `);

    const activityRowIds = Array.from(groupedResult).map((a: { latest: number }) => Number(a.latest));

    if (activityRowIds.length === 0) return [];

    const sortFn = orderBy === 'ASC' ? asc : desc;
    const result = await this.db
      .select()
      .from(activities)
      .where(inArray(activities.rowId, activityRowIds))
      .orderBy(sortFn(activities.createdDate));

    return result as unknown as IActivity[];
  }

  async getActivityForMessage(messageID: string): Promise<IActivity | null> {
    const entry = await this.db.query.activities.findFirst({
      where: eq(activities.messageID, messageID),
    });

    if (!entry) {
      this.logger.warn(
        `Unable to find activity entry for message: ${messageID}`,
        LogContext.ACTIVITY
      );
      return null;
    }

    return entry as unknown as IActivity;
  }

  public async getMySpacesActivity(
    triggeredBy: string,
    limit: number
  ): Promise<any> {
    const activityResults = await this.db
      .select({
        id: activities.id,
        createdDate: activities.createdDate,
        collaborationID: activities.collaborationID,
        type: activities.type,
        description: activities.description,
        parentID: activities.parentID,
        triggeredBy: activities.triggeredBy,
        resourceID: activities.resourceID,
      })
      .from(activities)
      .where(eq(activities.triggeredBy, triggeredBy))
      .orderBy(desc(activities.createdDate));

    // Get unique collaboration IDs from sorted activities
    const collaborationIDs = [
      ...new Set(activityResults.map(a => a.collaborationID)),
    ];

    if (collaborationIDs.length === 0) return [];

    // Filter the collaborations that still exist
    const existingCollaborations = await this.db
      .select({ id: collaborations.id })
      .from(collaborations)
      .where(inArray(collaborations.id, collaborationIDs));

    // Create a set of existing collaboration IDs
    const collaborationIdSet = new Set(existingCollaborations.map(c => c.id));

    // Filter activities that have a corresponding collaboration
    const filteredActivities = activityResults.filter(activity =>
      collaborationIdSet.has(activity.collaborationID)
    );

    // Create a map of collaboration IDs to latest activities
    const latestActivityPerCollaborationMap = new Map();
    for (const activity of filteredActivities) {
      const existingActivity = latestActivityPerCollaborationMap.get(
        activity.collaborationID
      );
      if (
        !existingActivity ||
        activity.createdDate > existingActivity.createdDate
      ) {
        latestActivityPerCollaborationMap.set(
          activity.collaborationID,
          activity
        );
      }
    }

    // Convert the map values to an array and limit the results
    const activityData = Array.from(
      latestActivityPerCollaborationMap.values()
    ).slice(0, limit);

    return activityData;
  }

  // Returns latest activities from user and from other users per Space including activities from all child journeys
  public async getLatestActivitiesPerSpaceMembership(
    triggeredBy: string,
    spaceMembershipCollaborationInfo: SpaceMembershipCollaborationInfo
  ): Promise<LatestActivitiesPerSpace> {
    const collaborationIDs = Array.from(
      spaceMembershipCollaborationInfo.keys()
    );

    if (collaborationIDs.length === 0) {
      return new Map();
    }

    const activityResults = await this.db
      .select({
        id: activities.id,
        createdDate: activities.createdDate,
        collaborationID: activities.collaborationID,
        type: activities.type,
        description: activities.description,
        parentID: activities.parentID,
        triggeredBy: activities.triggeredBy,
        resourceID: activities.resourceID,
      })
      .from(activities)
      .where(inArray(activities.collaborationID, collaborationIDs))
      .orderBy(desc(activities.createdDate));

    // Create a map of collaboration IDs to latest activities
    const latestActivityPerSpaceMap: LatestActivitiesPerSpace =
      createLatestActivityPerSpaceMap(
        activityResults as any,
        spaceMembershipCollaborationInfo,
        triggeredBy
      );

    return latestActivityPerSpaceMap;
  }
}
