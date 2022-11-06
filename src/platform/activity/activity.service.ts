import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Activity } from './activity.entity';
import { IActivity } from './activity.interface';
import { CreateActivityInput } from './dto/activity.dto.create';
import { ensureMaxLength } from '@common/utils';
import { SMALL_TEXT_LENGTH } from '@common/constants';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>
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

  async getActivityForCollaboration(
    collaborationID: string,
    limit?: number
  ): Promise<IActivity[]> {
    const entries: IActivity[] = await this.activityRepository
      .createQueryBuilder('activity')
      .where('collaborationID = :collaborationID')
      .setParameters({
        collaborationID: collaborationID,
      })
      .orderBy('createdDate', 'DESC')
      .getMany();

    if (limit) {
      return entries.slice(0, limit);
    }

    return entries;
  }
}
