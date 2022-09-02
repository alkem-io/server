import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { ActivityInputCalloutPublished } from './dto/activity.dto.input.callout.published';
import { ActivityService } from '@src/platform/activity/activity.service';
import { ActivityEventType } from '@common/enums/activity.event.type';

@Injectable()
export class ActivityAdapter {
  constructor(
    private activityService: ActivityService,
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
    await this.activityService.createActivity({
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
    await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      resourceID: eventData.resourceID,
      description: eventData.description,
      type: ActivityEventType.CARD_CREATED,
    });
    return true;
  }
}
