import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { ActivityFeedRoles } from '@domain/activity-feed/activity.feed.roles.enum';
import { IActivityLogEntry } from '@services/api/activity-log/dto/activity.log.entry.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { groupCredentialsByEntity } from '@services/api/roles/util/group.credentials.by.entity';
import { intersection } from 'lodash';
import { SpaceService } from '@domain/challenge/space/space.service';
import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActivityLogService } from '@services/api/activity-log';
import { ActivityService } from '@platform/activity/activity.service';
import { PaginationArgs } from '@core/pagination';
import { ActivityFeed } from '@domain/activity-feed/activity.feed.interface';

type ActivityFeedFilters = {
  types?: Array<ActivityEventType>;
  myActivity?: boolean;
  spaceIds?: Array<string>;
  roles?: Array<ActivityFeedRoles>;
  pagination?: PaginationArgs;
};

@Injectable()
export class ActivityFeedService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private collaborationService: CollaborationService,
    private spaceService: SpaceService,
    private authorizationService: AuthorizationService,
    private activityService: ActivityService,
    private activityLogService: ActivityLogService
  ) {}

  public async getActivityFeed(
    agentInfo: AgentInfo,
    filters?: ActivityFeedFilters
  ): Promise<ActivityFeed> {
    const {
      types = [],
      myActivity = false,
      pagination: paginationArgs = {},
      ...qualifyingSpacesOptions
    } = filters ?? {};
    // get all Spaces the user has credentials for
    const spaceIds = await this.getQualifyingSpaces(
      agentInfo,
      qualifyingSpacesOptions
    );
    // get the collaborations with read access based on the filtered Spaces
    const collaborationIds = await this.getAllAuthorizedCollaborations(
      agentInfo,
      spaceIds
    );
    // how do you understand what journey is this activity about
    return this.getPaginatedActivity(collaborationIds, {
      types,
      userID: myActivity ? agentInfo.userID : undefined,
      // visibility: true, // todo; what is this?
      paginationArgs,
    });
  }

  private async getQualifyingSpaces(
    agentInfo: AgentInfo,
    options?: Pick<ActivityFeedFilters, 'spaceIds' | 'roles'>
  ) {
    const { spaceIds: spaceIdsFilter = [], roles: rolesFilter = [] } =
      options ?? {};
    // get all Spaces the user has credentials for
    const credentialMap = groupCredentialsByEntity(agentInfo.credentials);
    const spacesWithCredentials = Array.from(
      credentialMap.get('spaces')?.keys() ?? []
    );
    // get only Spaces specified in the filter
    const filteredSpaceIds = spaceIdsFilter.length
      ? intersection(spaceIdsFilter, spacesWithCredentials)
      : spacesWithCredentials;
    // check if the Spaces exist;
    // a Space might not exist if it's deleted or broken/orphaned data was introduced
    const trueOrList = await this.spaceService.spacesExist(filteredSpaceIds);
    if (Array.isArray(trueOrList)) {
      throw new EntityNotFoundException(
        `Spaces with the following identifiers not found: '${trueOrList.join(
          ','
        )}'`,
        LogContext.ACTIVITY
      );
    }
    // get only Spaces with the appropriate roles specified from the filter
    return rolesFilter.length
      ? filteredSpaceIds.filter(spaceId => {
          const spaceRoles = credentialMap.get('spaces')?.get(spaceId) ?? [];
          return rolesFilter.some(role =>
            (spaceRoles as string[]).includes(role as string)
          );
        })
      : filteredSpaceIds;
  }

  private async getPaginatedActivity(
    collaborationIds: string[],
    options?: {
      types?: ActivityEventType[];
      visibility?: boolean;
      userID?: string;
      paginationArgs?: PaginationArgs;
    }
  ) {
    const rawPaginatedActivities =
      await this.activityService.getPaginatedActivity(
        collaborationIds,
        options
      );

    const convertedActivities = (
      await this.activityLogService.convertRawActivityToResults(
        rawPaginatedActivities.items
      )
    ).filter((x): x is IActivityLogEntry => !!x);

    // todo solve issue below
    // may return incorrect paginated results due to convertRawActivityToResults returning
    // undefined entries due to errors in processing or missing data
    // may return wrong pageInfo data OR not all less amount of items than asked for
    return {
      total: rawPaginatedActivities.total,
      pageInfo: rawPaginatedActivities.pageInfo,
      items: convertedActivities,
    };
  }

  private async getAllAuthorizedCollaborations(
    agentInfo: AgentInfo,
    spaceIds: string[]
  ) {
    const collaborationIds: string[] = [];
    for (const spaceId of spaceIds) {
      // filter the collaborations by read access
      const collaboration = await this.spaceService.getCollaborationOrFail(
        spaceId
      );
      await this.authorizationService.grantAccessOrFail(
        agentInfo,
        collaboration.authorization,
        AuthorizationPrivilege.READ,
        `Collaboration activity query: ${agentInfo.email}`
      );
      collaborationIds.push(collaboration.id);
      // get all child collaborations
      const childCollaborations =
        await this.collaborationService.getChildCollaborationsOrFail(
          collaboration.id
        );
      // filter the child collaborations by read access
      for (const childCollaboration of childCollaborations) {
        try {
          await this.authorizationService.grantAccessOrFail(
            agentInfo,
            childCollaboration.authorization,
            AuthorizationPrivilege.READ,
            `Collaboration activity query: ${agentInfo.email}`
          );
          collaborationIds.push(childCollaboration.id);
        } catch (e) {
          this.logger?.warn(
            `User ${agentInfo.userID} is not able to read child collaboration ${childCollaboration.id}`,
            LogContext.ACTIVITY_FEED
          );
        }
      }
    }

    return collaborationIds;
  }
}
