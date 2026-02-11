import { LogContext } from '@common/enums';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { LinkService } from '@domain/collaboration/link/link.service';
import { PostService } from '@domain/collaboration/post/post.service';
import { MemoService } from '@domain/common/memo/memo.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { RoomService } from '@domain/communication/room/room.service';
import { CommunityService } from '@domain/community/community/community.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Space } from '@domain/space/space/space.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceService } from '@domain/space/space/space.service';
import { CalendarService } from '@domain/timeline/calendar/calendar.service';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { IActivity } from '@platform/activity/activity.interface';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { ActivityService } from '@src/platform/activity/activity.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, In } from 'typeorm';
import { IActivityLogBuilder } from './activity.log.builder.interface';
import ActivityLogBuilderService from './activity.log.builder.service';
import { ActivityLogInput } from './dto/activity.log.dto.collaboration.input';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';

export class ActivityLogService {
  constructor(
    private activityService: ActivityService,
    private userService: UserService,
    private userLookupService: UserLookupService,
    private contributorLookupService: ContributorLookupService,
    private communityResolverService: CommunityResolverService,
    private calloutService: CalloutService,
    private postService: PostService,
    private whiteboardService: WhiteboardService,
    private memoService: MemoService,
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
    if (rawActivities.length === 0) {
      return [];
    }

    // Collect unique IDs for batch loading
    const collaborationIds = [
      ...new Set(rawActivities.map(a => a.collaborationID)),
    ];
    const userIds = [
      ...new Set(rawActivities.map(a => a.triggeredBy).filter(Boolean)),
    ];

    // Batch-load all spaces by collaboration ID (1 query instead of 2P)
    const spaces = await this.entityManager.find(Space, {
      where: { collaboration: { id: In(collaborationIds) } },
      relations: {
        collaboration: true,
        about: { profile: true },
        community: true,
      },
    });
    const spaceByCollabId = new Map<string, ISpace>(
      spaces.map(s => [s.collaboration!.id, s])
    );

    // Batch-load all users (1 query instead of P)
    const users = await this.userLookupService.getUsersByUUID(userIds);
    const userById = new Map<string, IUser>(users.map(u => [u.id, u]));

    // Convert each item using pre-loaded maps
    return Promise.all(
      rawActivities.map(x =>
        this.convertRawActivityToResult(x, spaceByCollabId, userById)
      )
    );
  }

  public async convertRawActivityToResult(
    rawActivity: IActivity,
    spaceByCollabId?: Map<string, ISpace>,
    userById?: Map<string, IUser>
  ): Promise<IActivityLogEntry | undefined> {
    try {
      // Work around for community member joined without parentID set
      if (
        rawActivity.type === ActivityEventType.MEMBER_JOINED &&
        !rawActivity.parentID
      ) {
        return undefined;
      }

      // Use pre-loaded user or fall back to individual query
      const userTriggeringActivity =
        userById?.get(rawActivity.triggeredBy) ??
        (await this.userService.getUserOrFail(rawActivity.triggeredBy));

      // Use pre-loaded space or fall back to individual query
      const space =
        spaceByCollabId?.get(rawActivity.collaborationID) ??
        (await this.communityResolverService.getSpaceForCollaborationOrFail(
          rawActivity.collaborationID,
          {
            relations: {
              about: { profile: true },
              community: true,
            },
          }
        ));

      const parentDisplayName = space.about.profile.displayName;

      const activityLogEntryBase: IActivityLogEntry = {
        id: rawActivity.id,
        triggeredBy: userTriggeringActivity,
        createdDate: rawActivity.createdDate,
        type: rawActivity.type,
        description: rawActivity.description,
        collaborationID: rawActivity.collaborationID,
        child: rawActivity.child,
        parentDisplayName,
        space,
      };
      const activityBuilder: IActivityLogBuilder =
        new ActivityLogBuilderService(
          activityLogEntryBase,
          this.contributorLookupService,
          this.calloutService,
          this.postService,
          this.whiteboardService,
          this.memoService,
          this.spaceService,
          this.communityService,
          this.roomService,
          this.linkService,
          this.calendarService,
          this.calendarEventService,
          this.urlGeneratorService
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
}
