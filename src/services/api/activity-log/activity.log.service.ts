import { Inject, LoggerService } from '@nestjs/common';
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
import { IActivity } from '@platform/activity/activity.interface';
import { RoomService } from '@domain/communication/room/room.service';
import { IActivityLogBuilder } from './activity.log.builder.interface';
import ActivityLogBuilderService from './activity.log.builder.service';
import { CalendarService } from '@domain/timeline/calendar/calendar.service';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { SpaceService } from '@domain/space/space/space.service';
import { LinkService } from '@domain/collaboration/link/link.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { EntityManager } from 'typeorm/entity-manager/EntityManager';
import { InjectEntityManager } from '@nestjs/typeorm';

export class ActivityLogService {
  constructor(
    private activityService: ActivityService,
    private userService: UserService,
    private calloutService: CalloutService,
    private postService: PostService,
    private whiteboardService: WhiteboardService,
    private spaceService: SpaceService,
    private roomService: RoomService,
    private linkService: LinkService,
    private calendarService: CalendarService,
    private calendarEventService: CalendarEventService,
    private communityService: CommunityService,
    private urlGeneratorService: UrlGeneratorService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
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

      const space = await this.spaceService.getSpaceForCollaborationOrFail(
        rawActivity.collaborationID
      );

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
        space,
      };
      const activityBuilder: IActivityLogBuilder =
        new ActivityLogBuilderService(
          activityLogEntryBase,
          this.userService,
          this.calloutService,
          this.postService,
          this.whiteboardService,
          this.spaceService,
          this.communityService,
          this.roomService,
          this.linkService,
          this.calendarService,
          this.calendarEventService,
          this.urlGeneratorService,
          this.entityManager
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
    const space = await this.spaceService.getSpaceForCollaborationOrFail(
      collaborationID
    );

    return {
      displayName: space.profile.displayName,
      nameID: space.nameID,
    };
  }
}
