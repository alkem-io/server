import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Not, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Activity } from './activity.entity';
import { IActivity } from './activity.interface';
import { CreateActivityInput } from './dto/activity.dto.create';
import { ensureMaxLength } from '@common/utils';
import { SMALL_TEXT_LENGTH } from '@common/constants';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { PaginationArgs } from '@core/pagination';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { Collaboration } from '@domain/collaboration/collaboration';
import {
  LatestActivitiesPerSpace,
  SpaceMembershipCollaborationInfo,
} from '@services/api/me/space.membership.type';
import { createLatestActivityPerSpaceMap } from './create.latest.activity.per.space';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
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
    const activity = await this.activityRepository.findOne({
      where: { id: activityID },
    });
    if (!activity)
      throw new EntityNotFoundException(
        `Not able to locate Activity with the specified ID: ${activityID}`,
        LogContext.CHALLENGES
      );
    return activity;
  }

  async removeActivity(activityID: string): Promise<IActivity> {
    const activity = await this.getActivityOrFail(activityID);
    return await this.activityRepository.remove(activity as Activity);
  }

  async save(activity: IActivity): Promise<IActivity> {
    return await this.activityRepository.save(activity as Activity);
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

    return this.activityRepository.find({
      where: {
        collaborationID: In(collaborationIDs),
        visibility: visibility,
        type: types && types.length > 0 ? In(types) : undefined,
        triggeredBy: userID,
      },
      order: {
        createdDate: 'DESC',
      },
      take: limit,
    });
  }

  public async getPaginatedActivity(
    collaborationIDs: string[],
    options?: {
      types?: ActivityEventType[];
      visibility?: boolean;
      userID?: string;
      orderBy?: 'ASC' | 'DESC';
      paginationArgs?: PaginationArgs;
      onlyUnique?: boolean;
      excludeTypes?: ActivityEventType[];
    }
  ) {
    const {
      types,
      visibility = true,
      userID,
      orderBy = 'DESC',
      paginationArgs = {},
      onlyUnique = false,
      excludeTypes,
    } = options ?? {};

    const qb = this.activityRepository.createQueryBuilder('activity');

    qb.where({
      collaborationID: In(collaborationIDs),
      visibility: visibility,
    });

    if (userID) {
      qb.andWhere({ triggeredBy: userID });
    }

    if (excludeTypes && excludeTypes.length > 0) {
      qb.andWhere({
        type: Not(In(excludeTypes)),
      });
    }

    if (types && types.length > 0) {
      const filteredTypes =
        excludeTypes && excludeTypes.length > 0
          ? types.filter(type => !excludeTypes.includes(type))
          : types;
      qb.andWhere({ type: In(filteredTypes) });
    }

    if (onlyUnique) {
      qb.groupBy('activity.resourceID, activity.triggeredBy, activity.type');
    }

    return getPaginationResults(qb, paginationArgs, orderBy);
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
  ) {
    const {
      types,
      visibility = true,
      userID,
      orderBy = 'DESC',
      limit,
    } = options ?? {};

    const defaultCondition = `activity.visibility = ${visibility} AND activity.collaborationId IN (${collaborationIDs
      .map(c => `'${c}'`)
      .join(',')})`;
    const typesCondition =
      types && types.length > 0
        ? `activity.type IN (${types.map(t => `'${t}'`).join(',')})`
        : undefined;

    const triggeredByCondition = userID
      ? `activity.triggeredBy = '${userID}'`
      : undefined;

    const whereConditions = [
      defaultCondition,
      typesCondition,
      triggeredByCondition,
    ]
      .filter(condition => condition !== undefined)
      .join(' AND ');

    const groupedActivities: {
      latest: string;
    }[] = await this.entityManager.connection.query(
      `
      SELECT activity.triggeredBy, activity.resourceId, activity.type, MAX(activity.rowId) as latest FROM alkemio.activity
      WHERE ${whereConditions}
      group by activity.resourceId, activity.triggeredBy, activity.type
      order by latest ${orderBy}
      ${limit ? `LIMIT ${limit}` : ''};
      `
    );

    const activityIDs = groupedActivities.map(a => a.latest);

    const qb = this.activityRepository.createQueryBuilder('activity');
    qb.where({
      rowId: In(activityIDs),
    });
    qb.orderBy('activity.createdDate', orderBy);

    const results = await qb.getMany();

    return results;
  }

  async getActivityForMessage(messageID: string): Promise<IActivity | null> {
    const entry: IActivity | null = await this.activityRepository
      .createQueryBuilder('activity')
      .where('messageID = :messageID')
      .setParameters({
        messageID: messageID,
      })
      .getOne();

    if (!entry) {
      this.logger.warn(
        `Unable to find activity entry for message: ${messageID}`,
        LogContext.ACTIVITY
      );
    }

    return entry;
  }

  public async getMyJourneysActivity(
    triggeredBy: string,
    limit: number
  ): Promise<any> {
    const activities = await this.activityRepository
      .createQueryBuilder('activity')
      .select([
        'activity.id',
        'activity.createdDate',
        'activity.collaborationID',
        'activity.type',
        'activity.description',
        'activity.parentID',
        'activity.triggeredBy',
        'activity.resourceID',
      ])
      .where('activity.triggeredBy = :triggeredBy', {
        triggeredBy,
      })
      .orderBy('activity.createdDate', 'DESC')
      .getMany();

    // Get unique collaboration IDs from sorted activities
    const collaborationIDs = [
      ...new Set(activities.map(a => a.collaborationID)),
    ];

    // Query for collaborations
    const collaborationRepository: Repository<Collaboration> =
      this.entityManager.getRepository(Collaboration);

    // Filter the collaborations that still exist
    const collaborations: Collaboration[] = await collaborationRepository
      .createQueryBuilder('collaboration')
      .select()
      .where({ id: In(collaborationIDs) })
      .getMany();

    // Create a map of collaboration IDs to collaborations
    const collaborationMap = new Map(collaborations.map(c => [c.id, c]));

    // Filter activities that have a corresponding collaboration
    const filteredActivities = activities.filter(activity =>
      collaborationMap.has(activity.collaborationID)
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

    const activities = await this.activityRepository
      .createQueryBuilder('activity')
      .select([
        'activity.id',
        'activity.createdDate',
        'activity.collaborationID',
        'activity.type',
        'activity.description',
        'activity.parentID',
        'activity.triggeredBy',
        'activity.resourceID',
      ])
      .where({
        collaborationID: In(collaborationIDs),
      })
      .orderBy('activity.createdDate', 'DESC')
      .getMany();

    // Create a map of collaboration IDs to latest activities
    const latestActivityPerSpaceMap: LatestActivitiesPerSpace =
      createLatestActivityPerSpaceMap(
        activities,
        spaceMembershipCollaborationInfo,
        triggeredBy
      );

    return latestActivityPerSpaceMap;
  }
}
