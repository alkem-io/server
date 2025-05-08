import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { intersection } from 'lodash';
import { IActivity } from '@platform/activity';
import { ActivityService } from '@platform/activity/activity.service';
import { ActivityFeedRoles } from '@domain/activity-feed/activity.feed.roles.enum';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ActivityFeed } from '@domain/activity-feed/activity.feed.interface';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PaginationArgs } from '@core/pagination';
import { IActivityLogEntry } from '@services/api/activity-log/dto/activity.log.entry.interface';
import { ActivityLogService } from '@services/api/activity-log';
import {
  CredentialMap,
  groupCredentialsByEntity,
} from '@services/api/roles/util/group.credentials.by.entity';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';

type ActivityFeedFilters = {
  types?: Array<ActivityEventType>;
  myActivity?: boolean;
  spaceIds?: Array<string>;
  roles?: Array<ActivityFeedRoles>;
  pagination?: PaginationArgs;
  excludeTypes?: Array<ActivityEventType>;
};

type ActivityFeedGroupedFilters = ActivityFeedFilters & {
  limit?: number;
};

@Injectable()
export class ActivityFeedService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private collaborationService: CollaborationService,
    private spaceLookupService: SpaceLookupService,
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
      excludeTypes,
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
      excludeTypes,
    });
  }

  public async getGroupedActivityFeed(
    agentInfo: AgentInfo,
    filters?: ActivityFeedGroupedFilters
  ): Promise<IActivityLogEntry[]> {
    const {
      types = [],
      myActivity = false,
      limit,
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

    return this.getGroupedActivity(collaborationIds, {
      types,
      userID: myActivity ? agentInfo.userID : undefined,
      visibility: true,
      limit: limit ? limit : undefined,
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
    const successOrNonExistingSpaces =
      await this.spaceLookupService.spacesExist(filteredSpaceIds);
    if (Array.isArray(successOrNonExistingSpaces)) {
      this.logger.warn(
        {
          message:
            'Some Spaces were not found when filtering for the activity feed',
          spaceIds: successOrNonExistingSpaces,
        },
        LogContext.ACTIVITY
      );
      // return only the valid Spaces
      return filteredSpaceIds.filter(
        id => !successOrNonExistingSpaces.includes(id)
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
      excludeTypes?: ActivityEventType[];
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

  private async getGroupedActivity(
    collaborationIds: string[],
    options?: {
      types?: ActivityEventType[];
      visibility?: boolean;
      userID?: string;
      sort?: 'ASC' | 'DESC';
      limit?: number;
    }
  ) {
    const MAX_REQUESTED_GROUPED_ACTIVITIES = 100;
    const DEFAULT_GROUPED_ACTIVITIES_LIMIT = 10;
    const requestedActivitiesLimit =
      options?.limit ?? DEFAULT_GROUPED_ACTIVITIES_LIMIT;
    let rawPaginatedActivities: IActivity[] = [];
    let convertedActivities: IActivityLogEntry[] = [];
    let requestedActivitiesNumber = requestedActivitiesLimit;
    let requestedAndCovertedActivitiesDifference = 0;

    // the requested and converted number of activities may not be the same,
    // we will try to refetch the requested amount of activities + difference between requested and converted
    // we have a hard limit of 100 requested activities to prevent infinite loops
    do {
      rawPaginatedActivities = await this.activityService.getGroupedActivity(
        collaborationIds,
        {
          ...options,
          limit: requestedActivitiesNumber,
        }
      );

      convertedActivities = (
        await this.activityLogService.convertRawActivityToResults(
          rawPaginatedActivities
        )
      ).filter((x): x is IActivityLogEntry => !!x);

      requestedAndCovertedActivitiesDifference =
        requestedActivitiesNumber - convertedActivities.length;
      requestedActivitiesNumber =
        requestedActivitiesNumber + requestedAndCovertedActivitiesDifference;

      if (requestedActivitiesNumber > MAX_REQUESTED_GROUPED_ACTIVITIES) break;
    } while (convertedActivities.length < requestedActivitiesLimit);

    return convertedActivities;
  }

  private async getAllAuthorizedCollaborations(
    agentInfo: AgentInfo,
    spaceIds: string[]
  ): Promise<string[]> {
    const collaborationIds: string[] = [];
    for (const spaceId of spaceIds) {
      // filter the collaborations by read access
      const collaboration =
        await this.spaceLookupService.getCollaborationOrFail(spaceId);
      let childCollaborations: ICollaboration[] = [];
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

      try {
        // get all child collaborations
        childCollaborations =
          await this.collaborationService.getChildCollaborationsOrFail(
            collaboration.id
          );
      } catch (error) {
        this.logger?.warn(
          `User ${agentInfo.userID} is not able to read childCollaborations for collaboration: ${collaboration.id}`,
          LogContext.ACTIVITY_FEED
        );
      }

      // Filter the child collaborations by read access
      const readableChildCollaborations = childCollaborations.filter(
        childCollaboration => {
          try {
            return this.authorizationService.grantAccessOrFail(
              agentInfo,
              childCollaboration.authorization,
              AuthorizationPrivilege.READ,
              `Collaboration activity query: ${agentInfo.email}`
            );
          } catch (e) {
            return false;
          }
        }
      );

      const collaborationIds = readableChildCollaborations.map(
        childCollaboration => childCollaboration.id
      );
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
