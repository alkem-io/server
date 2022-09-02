import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { ActivityInputCalloutPublished } from './dto/activity.dto.input.callout.published';
import { ActivityService } from '@src/platform/activity/activity.service';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ActivityAdapter {
  constructor(
    private activityService: ActivityService,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async calloutPublished(
    eventData: ActivityInputCalloutPublished
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );
    const collaborationID = await this.getCollaborationIdForCallout(
      eventData.resourceID
    );
    await this.activityService.createActivity({
      collaborationID,
      triggeredBy: eventData.triggeredBy,
      resourceID: eventData.resourceID,
      description: eventData.description,
      type: ActivityEventType.CALLOUT_PUBLISHED,
    });
    return true;
  }

  async aspectCreated(
    eventData: ActivityInputCalloutPublished
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );
    const collaborationID = await this.getCollaborationIdForAspect(
      eventData.resourceID
    );
    await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: eventData.resourceID,
      description: eventData.description,
      type: ActivityEventType.CARD_CREATED,
    });
    return true;
  }

  async getCollaborationIdForCallout(calloutID: string): Promise<string> {
    const collaboration = await this.collaborationRepository
      .createQueryBuilder('collaboration')
      .innerJoinAndSelect('collaboration.callouts', 'callout')
      .where('callout.id = :id')
      .setParameters({ id: `${calloutID}` })
      .getOne();
    if (collaboration) {
      return collaboration.id;
    }
    return '';
  }

  async getCollaborationIdForAspect(aspectID: string): Promise<string> {
    const collaboration = await this.collaborationRepository
      .createQueryBuilder('collaboration')
      .leftJoinAndSelect('collaboration.callouts', 'callouts')
      .innerJoinAndSelect('callouts.aspects', 'aspect')
      .where('aspect.id = :id')
      .setParameters({ id: `${aspectID}` })
      .getOne();
    if (collaboration) {
      return collaboration.id;
    }
    return '';
  }
}
