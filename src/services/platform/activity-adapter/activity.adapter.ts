import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { getConnection, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { ActivityInputCalloutPublished } from './dto/activity.dto.input.callout.published';
import { ActivityService } from '@src/platform/activity/activity.service';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { EntityNotFoundException } from '@common/exceptions';
import { ActivityInputAspectCreated } from './dto/activity.dto.input.aspect.created';
import { ActivityInputCanvasCreated } from './dto/activity.dto.input.canvas.created';
import { ActivityInputMemberJoined } from './dto/activity.dto.input.member.joined';
import { ActivityInputAspectComment } from './dto/activity.dto.input.aspect.comment';
import { ActivityInputCalloutDiscussionComment } from './dto/activity.dto.input.callout.discussion.comment';

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
    const callout = eventData.callout;
    const collaborationID = await this.getCollaborationIdForCallout(callout.id);
    const description = `[Callout] New Callout published: '${callout.displayName}'`;
    await this.activityService.createActivity({
      collaborationID,
      triggeredBy: eventData.triggeredBy,
      resourceID: callout.id,
      description: description,
      type: ActivityEventType.CALLOUT_PUBLISHED,
    });
    return true;
  }

  async aspectCreated(eventData: ActivityInputAspectCreated): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );

    const aspect = eventData.aspect;
    const description = `[Card] New Card created with title: ${aspect.displayName}`;
    const collaborationID = await this.getCollaborationIdForAspect(aspect.id);
    await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: aspect.id,
      description: description,
      type: ActivityEventType.CALLOUT_CARD_CREATED,
    });
    return true;
  }

  async aspectComment(eventData: ActivityInputAspectComment): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );

    const description = `[Card] Comment added on card: ${eventData.aspect.displayName}`;

    const aspectID = eventData.aspect.id;
    const collaborationID = await this.getCollaborationIdForAspect(aspectID);
    await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: aspectID,
      description: description,
      type: ActivityEventType.CARD_COMMENT,
    });
    return true;
  }

  async canvasCreated(eventData: ActivityInputCanvasCreated): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );
    const canvas = eventData.canvas;
    const collaborationID = await this.getCollaborationIdForCanvas(canvas.id);

    const description = `[Canvas] New Canvas created: '${canvas.displayName}'`;
    await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: canvas.id,
      description: description,
      type: ActivityEventType.CALLOUT_CANVAS_CREATED,
    });
    return true;
  }

  async calloutCommentCreated(
    eventData: ActivityInputCalloutDiscussionComment
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );

    const collaborationID = await this.getCollaborationIdForCallout(
      eventData.callout.id
    );

    const description = `[Callout] New comment added on: '${eventData.callout.displayName}'`;
    await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: eventData.callout.id,
      description: description,
      type: ActivityEventType.DISCUSSION_COMMENT,
    });
    return true;
  }

  async memberJoined(eventData: ActivityInputMemberJoined): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );
    const community = eventData.community;
    const collaborationID = await this.getCollaborationIdFromCommunity(
      community.id
    );
    const description = `[Community] New member: ${eventData.user.displayName}`;
    await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: community.id,
      description: description,
      type: ActivityEventType.MEMBER_JOINED,
    });
    return true;
  }

  private async getCollaborationIdForCallout(
    calloutID: string
  ): Promise<string> {
    const collaboration = await this.collaborationRepository
      .createQueryBuilder('collaboration')
      .innerJoinAndSelect('collaboration.callouts', 'callout')
      .where('callout.id = :id')
      .setParameters({ id: `${calloutID}` })
      .getOne();
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Canvas with ID: ${calloutID}`,
        LogContext.ACTIVITY
      );
    }
    return collaboration.id;
  }

  private async getCollaborationIdForAspect(aspectID: string): Promise<string> {
    const collaboration = await this.collaborationRepository
      .createQueryBuilder('collaboration')
      .leftJoinAndSelect('collaboration.callouts', 'callouts')
      .innerJoinAndSelect('callouts.aspects', 'aspect')
      .where('aspect.id = :id')
      .setParameters({ id: `${aspectID}` })
      .getOne();
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Canvas with ID: ${aspectID}`,
        LogContext.ACTIVITY
      );
    }
    return collaboration.id;
  }

  private async getCollaborationIdForCanvas(canvasID: string): Promise<string> {
    const collaboration = await this.collaborationRepository
      .createQueryBuilder('collaboration')
      .leftJoinAndSelect('collaboration.callouts', 'callouts')
      .innerJoinAndSelect('callouts.canvases', 'canvas')
      .where('canvas.id = :id')
      .setParameters({ id: `${canvasID}` })
      .getOne();
    if (!collaboration) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Canvas with ID: ${canvasID}`,
        LogContext.ACTIVITY
      );
    }
    return collaboration.id;
  }

  private async getCollaborationIdFromCommunity(communityId: string) {
    const [result]: {
      collaborationId: string;
    }[] = await getConnection().query(
      `
        SELECT collaborationId from \`hub\`
        WHERE \`hub\`.\`communityId\` = '${communityId}' UNION

        SELECT collaborationId from \`challenge\`
        WHERE \`challenge\`.\`communityId\` = '${communityId}' UNION

        SELECT collaborationId from \`opportunity\`
        WHERE \`opportunity\`.\`communityId\` = '${communityId}';
      `
    );
    if (!result) {
      this.logger.error(
        `Unable to identify Collaboration for provided communityID: ${communityId}`,
        LogContext.COMMUNITY
      );
      return '';
    }
    return result.collaborationId;
  }
}
