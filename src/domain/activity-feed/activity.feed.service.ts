import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { intersection } from 'lodash';
import { ActivityService } from '@platform/activity/activity.service';
import { ActivityFeedRoles } from '@domain/activity-feed/activity.feed.roles.enum';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { SpaceService } from '@domain/challenge/space/space.service';
import { ActivityFeed } from '@domain/activity-feed/activity.feed.interface';
import { EntityNotFoundException } from '@common/exceptions';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PaginationArgs } from '@core/pagination';
import { IActivityLogEntry } from '@services/api/activity-log/dto/activity.log.entry.interface';
import { ActivityLogService } from '@services/api/activity-log';
import {
  CredentialMap,
  groupCredentialsByEntity,
} from '@services/api/roles/util/group.credentials.by.entity';

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

    return this.getPaginatedActivity(collaborationIds, {
      types,
      userID: myActivity ? agentInfo.userID : undefined,
      visibility: true,
      paginationArgs,
      sort: 'DESC', // the most recent first
    });
  }

  private async getQualifyingSpaces(
    agentInfo: AgentInfo,
    options?: Pick<ActivityFeedFilters, 'spaceIds' | 'roles'>
  ) {
    const { spaceIds: spaceIdsFilter, roles: rolesFilter = [] } = options ?? {};
    // get all Spaces the user has credentials for
    const credentialMap = groupCredentialsByEntity(agentInfo.credentials);
    const spacesWithCredentials = Array.from(
      credentialMap.get('spaces')?.keys() ?? []
    );
    // get only Spaces specified in the filter and check if they exist
    const filteredSpaceIds = await this.filterSpacesOrFail(
      spacesWithCredentials,
      spaceIdsFilter
    );
    // get only Spaces with the appropriate roles specified from the filter
    return filterSpacesByRoles(credentialMap, filteredSpaceIds, rolesFilter);
  }

  /***
   * Helper function to filter Spaces by a subset and check if they exist
   * @param spaceIdsFilter
   * @param spaceIds
   * @returns string[] Filtered array of Space ids
   * @throws {EntityNotFoundException} If Space(s) do not exist
   */
  private async filterSpacesOrFail(
    spaceIds: string[],
    spaceIdsFilter?: string[]
  ): Promise<string[]> {
    // get only Spaces specified in the filter; if the filter is defined
    const filteredSpaceIds = spaceIdsFilter
      ? intersection(spaceIdsFilter, spaceIds)
      : spaceIds;
    // check if the Spaces exist;
    // a Space might not exist if it's deleted or broken/orphaned data was introduced
    const successOrNonExistingSpaces = await this.spaceService.spacesExist(
      filteredSpaceIds
    );
    if (Array.isArray(successOrNonExistingSpaces)) {
      throw new EntityNotFoundException(
        `Spaces with the following identifiers not found: '${successOrNonExistingSpaces.join(
          ','
        )}'`,
        LogContext.ACTIVITY
      );
    }

    return filteredSpaceIds;
  }

  private async getPaginatedActivity(
    collaborationIds: string[],
    options?: {
      types?: ActivityEventType[];
      visibility?: boolean;
      userID?: string;
      sort?: 'ASC' | 'DESC';
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
  ): Promise<string[]> {
    const collaborationIds: string[] = [];
    for (const spaceId of spaceIds) {
      // filter the collaborations by read access
      const collaboration = await this.spaceService.getCollaborationOrFail(
        spaceId
      );
      try {
        this.authorizationService.grantAccessOrFail(
          agentInfo,
          collaboration.authorization,
          AuthorizationPrivilege.READ,
          `Collaboration activity query: ${agentInfo.email}`
        );
        collaborationIds.push(collaboration.id);
      } catch (error) {
        this.logger?.warn(
          `User ${agentInfo.userID} is not able to read collaboration ${collaboration.id}`,
          LogContext.ACTIVITY_FEED
        );
      }

      // get all child collaborations
      const childCollaborations =
        await this.collaborationService.getChildCollaborationsOrFail(
          collaboration.id
        );
      // filter the child collaborations by read access
      for (const childCollaboration of childCollaborations) {
        try {
          this.authorizationService.grantAccessOrFail(
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

/***
 * Filters Spaces by a predefined set of roles
 * @param credentialMap
 * @param spaceIds
 * @param rolesFilter
 * @returns string[] Filtered array of Space ids
 */
const filterSpacesByRoles = (
  credentialMap: CredentialMap,
  spaceIds: string[],
  rolesFilter: string[]
): string[] => {
  if (!rolesFilter.length) {
    return spaceIds;
  }

  return spaceIds.filter(spaceId => {
    const spaceRoles = credentialMap.get('spaces')?.get(spaceId) ?? [];
    return rolesFilter.some(role =>
      (spaceRoles as string[]).includes(role as string)
    );
  });
};
