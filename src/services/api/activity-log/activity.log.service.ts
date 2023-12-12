import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, EntityTarget } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActivityLogInput } from './dto/activity.log.dto.collaboration.input';
import { LogContext } from '@common/enums';
import { ActivityService } from '@src/platform/activity/activity.service';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';
import { UserService } from '@domain/community/user/user.service';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { CommunityService } from '@domain/community/community/community.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { PostService } from '@domain/collaboration/post/post.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { IActivity } from '@platform/activity/activity.interface';
import { getJourneyByCollaboration } from '@common/utils';
import { Space } from '@domain/challenge/space/space.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity';
import { RoomService } from '@domain/communication/room/room.service';
import { IActivityLogBuilder } from './activity.log.builder.interface';
import ActivityLogBuilderService from './activity.log.builder.service';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { CalendarService } from '@domain/timeline/calendar/calendar.service';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { SpaceService } from '@domain/challenge/space/space.service';
import { JourneyTypeEnum } from '@common/enums/journey.type';

export class ActivityLogService {
  constructor(
    private activityService: ActivityService,
    private userService: UserService,
    private calloutService: CalloutService,
    private postService: PostService,
    private whiteboardService: WhiteboardService,
    private spaceService: SpaceService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
    private roomService: RoomService,
    private referenceService: ReferenceService,
    private calendarService: CalendarService,
    private calendarEventService: CalendarEventService,
    private communityService: CommunityService,
    private collaborationService: CollaborationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectEntityManager()
    private readonly entityManager: EntityManager
  ) {}

  public async activityLog(
    queryData: ActivityLogInput,
    childCollaborations: string[] = []
  ): Promise<IActivityLogEntry[]> {
    // Get all raw activities; limit is used to determine the amount of results
    const rawActivities =
      await this.activityService.getActivityForCollaborations(
        [queryData.collaborationID, ...childCollaborations],
        { types: queryData.types }
      );

    const updatedChildActivities = rawActivities.map(x =>
      childCollaborations.includes(x.collaborationID)
        ? { ...x, child: true }
        : x
    );

    // Convert results until have enough
    const results: IActivityLogEntry[] = [];
    for (const rawActivity of updatedChildActivities) {
      if (!queryData.limit || queryData.limit > results.length) {
        const result = await this.convertRawActivityToResult(rawActivity);
        if (result) {
          results.push(result);
        }
        if (queryData.limit && results.length >= queryData.limit) {
          break;
        }
      }
    }
    return results;
  }

  public async myActivityLog(
    userId: string,
    queryData: ActivityLogInput
  ): Promise<IActivityLogEntry[]> {
    const activities = await this.activityLog({
      collaborationID: queryData.collaborationID,
      includeChild: queryData.includeChild,
    });
    const myActivities = activities.filter(x => {
      if (queryData.types) {
        return x.triggeredBy.id === userId && queryData.types.includes(x.type);
      } else {
        return x.triggeredBy.id === userId;
      }
    });

    if (myActivities.length > 0) {
      myActivities.sort(
        (a, b) => b.createdDate.getTime() - a.createdDate.getTime()
      );
    }

    return myActivities.slice(0, queryData.limit ?? myActivities.length);
  }

  public async convertRawActivityToResults(
    rawActivities: IActivity[]
  ): Promise<(IActivityLogEntry | undefined)[]> {
    return Promise.all(
      rawActivities.map(x => this.convertRawActivityToResult(x))
    );
  }

  public async convertRawActivityToResult(
    rawActivity: IActivity
  ): Promise<IActivityLogEntry | undefined> {
    try {
      // Work around for community member joined without parentID set
      if (
        rawActivity.type === ActivityEventType.MEMBER_JOINED &&
        !rawActivity.parentID
      ) {
        return undefined;
      }

      const userTriggeringActivity = await this.userService.getUserOrFail(
        rawActivity.triggeredBy
      );

      const parentDetails = await this.getParentDetailsByCollaboration(
        rawActivity.collaborationID
      );

      if (!parentDetails) {
        throw new Error(
          `Unable to resolve parent details of ${rawActivity.collaborationID}`
        );
      }

      const result =
        await this.collaborationService.getJourneyFromCollaboration(
          rawActivity.collaborationID
        );

      const journeyType = getJourneyType(result);
      const journeyId =
        result?.spaceId ?? result?.challengeId ?? result?.opportunityId;
      const journey =
        journeyType && journeyId
          ? await this.getJourneyByType(journeyType, journeyId)
          : undefined;

      const activityLogEntryBase: IActivityLogEntry = {
        id: rawActivity.id,
        triggeredBy: userTriggeringActivity,
        createdDate: rawActivity.createdDate,
        type: rawActivity.type,
        description: rawActivity.description,
        collaborationID: rawActivity.collaborationID,
        child: rawActivity.child,
        parentNameID: parentDetails.nameID,
        parentDisplayName: parentDetails.displayName,
        journey,
      };
      const activityBuilder: IActivityLogBuilder =
        new ActivityLogBuilderService(
          activityLogEntryBase,
          this.userService,
          this.calloutService,
          this.postService,
          this.whiteboardService,
          this.challengeService,
          this.opportunityService,
          this.communityService,
          this.roomService,
          this.referenceService,
          this.calendarService,
          this.calendarEventService
        );
      const activityType = rawActivity.type as ActivityEventType;
      return await activityBuilder[activityType](rawActivity);
    } catch (error) {
      //
      this.logger.warn(
        `Unable to process activity entry ${rawActivity.id}: ${error}`,
        LogContext.ACTIVITY
      );
    }
  }

  private async getParentDetailsByCollaboration(
    collaborationID: string
  ): Promise<{ nameID: string; displayName: string } | undefined> {
    const { spaceId, challengeId, opportunityId } =
      await getJourneyByCollaboration(this.entityManager, collaborationID);

    const getDetails = async (
      entity: EntityTarget<Space | Challenge | Opportunity>,
      id: string
    ) => {
      const result = await this.entityManager.findOneOrFail(entity, {
        where: { id },
        relations: { profile: true },
      });
      return {
        displayName: result.profile.displayName,
        nameID: result.nameID,
      };
    };

    if (spaceId) {
      return getDetails(Space, spaceId);
    }

    if (challengeId) {
      return getDetails(Challenge, challengeId);
    }

    if (opportunityId) {
      return getDetails(Opportunity, opportunityId);
    }

    return undefined;
  }

  private getJourneyByType(type: JourneyTypeEnum, id: string) {
    switch (type) {
      case JourneyTypeEnum.SPACE:
        return this.spaceService.getSpaceOrFail(id);
      case JourneyTypeEnum.CHALLENGE:
        return this.challengeService.getChallengeOrFail(id);
      case JourneyTypeEnum.OPPORTUNITY:
        return this.opportunityService.getOpportunityOrFail(id);
      default:
        throw new Error(`Invalid journey type: ${type}`);
    }
  }
}

const getJourneyType = (ids?: {
  spaceId?: string;
  challengeId?: string;
  opportunityId?: string;
}): JourneyTypeEnum | undefined => {
  const { spaceId, challengeId, opportunityId } = ids ?? {};

  if (spaceId) {
    return JourneyTypeEnum.SPACE;
  }

  if (challengeId) {
    return JourneyTypeEnum.CHALLENGE;
  }

  if (opportunityId) {
    return JourneyTypeEnum.OPPORTUNITY;
  }

  return undefined;
};
