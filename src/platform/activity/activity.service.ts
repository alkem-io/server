import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Activity } from './activity.entity';
import { IActivity } from './activity.interface';
import { CreateActivityInput } from './dto/activity.dto.create';
import { ensureMaxLength } from '@common/utils';
import { SMALL_TEXT_LENGTH } from '@common/constants';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

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
      id: activityID,
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

  async getActivityForCollaboration(
    collaborationID: string,
    limit?: number,
    visibility = true
  ): Promise<IActivity[]> {
    const entries: IActivity[] = await this.activityRepository
      .createQueryBuilder('activity')
      .where('collaborationID = :collaborationID')
      .andWhere('visibility = :visibility')
      .setParameters({
        collaborationID: collaborationID,
        visibility: visibility,
      })
      .orderBy('createdDate', 'DESC')
      .getMany();

    if (limit) {
      return entries.slice(0, limit);
    }

    return entries;
  }

  async getActivityForMessage(
    messageID: string
  ): Promise<IActivity | undefined> {
    const entry: IActivity | undefined = await this.activityRepository
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
