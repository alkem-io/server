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
import { AspectService } from '@domain/collaboration/aspect/aspect.service';
import { CanvasService } from '@domain/common/canvas/canvas.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import ActivityLogBuilderService, {
  IActivityLogBuilder,
} from '@services/api/activity-log/activity.log.builder.service';
import { IActivity } from '@platform/activity/activity.interface';
import { getJourneyByCollaboration } from '@common/utils';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity';
import { RoomService } from '@domain/communication/room/room.service';

export class ActivityLogService {
  constructor(
    private activityService: ActivityService,
    private userService: UserService,
    private calloutService: CalloutService,
    private aspectService: AspectService,
    private canvasService: CanvasService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
    private roomService: RoomService,
    private communityService: CommunityService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectEntityManager()
    private readonly entityManager: EntityManager
  ) {}

  async activityLog(
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
      };
      const activityBuilder: IActivityLogBuilder =
        new ActivityLogBuilderService(
          activityLogEntryBase,
          this.userService,
          this.calloutService,
          this.aspectService,
          this.canvasService,
          this.challengeService,
          this.opportunityService,
          this.communityService,
          this.roomService
        );
      const activityType = rawActivity.type as ActivityEventType;
      const result = await activityBuilder[activityType](rawActivity);
      return result;
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
    const { hubId, challengeId, opportunityId } =
      await getJourneyByCollaboration(this.entityManager, collaborationID);

    const getDetails = async (
      entity: EntityTarget<Hub | Challenge | Opportunity>,
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

    if (hubId) {
      return getDetails(Hub, hubId);
    }

    if (challengeId) {
      return getDetails(Challenge, challengeId);
    }

    if (opportunityId) {
      return getDetails(Opportunity, opportunityId);
    }

    return undefined;
  }
}
