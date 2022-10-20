import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { getConnection, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { ActivityService } from '@src/platform/activity/activity.service';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ActivityInputCalloutPublished } from './dto/activity.dto.input.callout.published';
import { ActivityInputAspectCreated } from './dto/activity.dto.input.aspect.created';
import { ActivityInputCanvasCreated } from './dto/activity.dto.input.canvas.created';
import { ActivityInputMemberJoined } from './dto/activity.dto.input.member.joined';
import { ActivityInputAspectComment } from './dto/activity.dto.input.aspect.comment';
import { ActivityInputCalloutDiscussionComment } from './dto/activity.dto.input.callout.discussion.comment';
import { ActivityInputChallengeCreated } from './dto/activity.dto.input.challenge.created';
import { ActivityInputOpportunityCreated } from './dto/activity.dto.input.opportunity.created';

@Injectable()
export class ActivityAdapter {
  constructor(
    private activityService: ActivityService,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async challengeCreated(
    eventData: ActivityInputChallengeCreated
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );

    const challenge = eventData.challenge;

    if (!challenge.hubID) {
      throw new EntityNotInitializedException(
        `Unable to get hubID of Challenge: ${challenge.id}`,
        LogContext.ACTIVITY
      );
    }

    const collaborationID = await this.getCollaborationIdForHub(
      challenge.hubID
    );
    const description = challenge.displayName;

    await this.activityService.createActivity({
      collaborationID,
      triggeredBy: eventData.triggeredBy,
      resourceID: challenge.id,
      parentID: challenge.hubID,
      description,
      type: ActivityEventType.CHALLENGE_CREATED,
    });

    return true;
  }

  async opportunityCreated(
    eventData: ActivityInputOpportunityCreated
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );

    const opportunity = eventData.opportunity;

    const collaborationID = await this.getCollaborationIdForChallenge(
      eventData.challengeId
    );
    const description = opportunity.displayName;

    await this.activityService.createActivity({
      collaborationID,
      triggeredBy: eventData.triggeredBy,
      resourceID: opportunity.id,
      parentID: eventData.challengeId,
      description,
      type: ActivityEventType.OPPORTUNITY_CREATED,
    });

    return true;
  }

  async calloutPublished(
    eventData: ActivityInputCalloutPublished
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );
    const callout = eventData.callout;
    const collaborationID = await this.getCollaborationIdForCallout(callout.id);
    const description = `[${callout.displayName}] - ${callout.description}`;
    await this.activityService.createActivity({
      collaborationID,
      triggeredBy: eventData.triggeredBy,
      resourceID: callout.id,
      parentID: collaborationID,
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
    const description = `[${aspect.displayName}] - ${aspect.description}`;
    const collaborationID = await this.getCollaborationIdForAspect(aspect.id);
    await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: aspect.id,
      parentID: eventData.callout.id,
      description: description,
      type: ActivityEventType.CARD_CREATED,
    });
    return true;
  }

  async aspectComment(eventData: ActivityInputAspectComment): Promise<boolean> {
    this.logger.verbose?.(
      `Event received: ${JSON.stringify(eventData)}`,
      LogContext.ACTIVITY
    );

    const description = `[${eventData.aspect.displayName}] - '${eventData.message}'`;

    const aspectID = eventData.aspect.id;
    const calloutID = await this.getCalloutIdForAspect(aspectID);
    const collaborationID = await this.getCollaborationIdForCallout(calloutID);
    await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: aspectID,
      parentID: calloutID,
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

    const description = `[${canvas.displayName}]`;
    await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: canvas.id,
      parentID: eventData.callout.id,
      description: description,
      type: ActivityEventType.CANVAS_CREATED,
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

    const description = `'${eventData.message}'`;
    await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: eventData.callout.id,
      parentID: collaborationID,
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
    const description = `[${community.type}] '${eventData.user.displayName}'`;
    await this.activityService.createActivity({
      triggeredBy: eventData.triggeredBy,
      collaborationID,
      resourceID: community.id,
      parentID: '',
      description: description,
      type: ActivityEventType.MEMBER_JOINED,
    });
    return true;
  }

  private async getCollaborationIdForHub(hubID: string): Promise<string> {
    const [result]: { collaborationId: string }[] = await getConnection().query(
      `
          SELECT collaboration.id as collaborationId FROM collaboration
          LEFT JOIN hub ON hub.collaborationId = collaboration.id
          WHERE hub.id = '${hubID}'
        `
    );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Hub with ID: ${hubID}`,
        LogContext.ACTIVITY
      );
    }

    return result.collaborationId;
  }

  private async getCollaborationIdForChallenge(
    challengeID: string
  ): Promise<string> {
    const [result]: { collaborationId: string }[] = await getConnection().query(
      `
          SELECT collaboration.id as collaborationId FROM collaboration
          LEFT JOIN challenge ON challenge.collaborationId = collaboration.id
          WHERE challenge.id = '${challengeID}'
        `
    );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to identify Collaboration for Challenge with ID: ${challengeID}`,
        LogContext.ACTIVITY
      );
    }

    return result.collaborationId;
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

  private async getCalloutIdForAspect(aspectID: string): Promise<string> {
    const callout = await this.calloutRepository
      .createQueryBuilder('callout')
      .innerJoinAndSelect('callout.aspects', 'aspect')
      .where('aspect.id = :id')
      .setParameters({ id: `${aspectID}` })
      .getOne();
    if (!callout) {
      throw new EntityNotFoundException(
        `Unable to identify Callout for Aspect with ID: ${aspectID}`,
        LogContext.ACTIVITY
      );
    }
    return callout.id;
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
