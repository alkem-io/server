import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
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
      paginationArgs?: PaginationArgs;
    }
  ) {
    const {
      types,
      visibility = true,
      userID,
      paginationArgs = {},
    } = options ?? {};

    const qb = await this.activityRepository.createQueryBuilder('activity');

    qb.where({
      collaborationID: In(collaborationIDs),
      visibility: visibility,
    }).orderBy({ createdDate: 'DESC' });

    if (types && types.length > 0) {
      qb.andWhere({ type: In(types) });
    }

    if (userID) {
      qb.andWhere({ triggeredBy: userID });
    }

    return getPaginationResults(qb, paginationArgs);
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
}
