import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { SpaceLevel } from '@common/enums/space.level';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PaginationArgs } from '@core/pagination';
import { ActivityFeed } from '@domain/activity-feed/activity.feed.interface';
import { ActivityFeedRoles } from '@domain/activity-feed/activity.feed.roles.enum';
import { Space } from '@domain/space/space/space.entity';
import { spaces } from '@domain/space/space/space.schema';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { IActivity } from '@platform/activity';
import { ActivityService } from '@platform/activity/activity.service';
import { ActivityLogService } from '@services/api/activity-log';
import { IActivityLogEntry } from '@services/api/activity-log/dto/activity.log.entry.interface';
import {
  CredentialMap,
  groupCredentialsByEntity,
} from '@services/api/roles/util/group.credentials.by.entity';
import { inArray } from 'drizzle-orm';
import { intersection } from 'lodash';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

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
    private spaceLookupService: SpaceLookupService,
    private authorizationService: AuthorizationService,
    private activityService: ActivityService,
    private activityLogService: ActivityLogService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb
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
    if (spaceIds.length === 0) {
      return [];
    }

    // Step A: Batch-load all spaces with their collaboration (1 query instead of N)
    const loadedSpaces = (await this.db.query.spaces.findMany({
      where: inArray(spaces.id, spaceIds),
      with: { collaboration: { with: { authorization: true } } },
    })) as unknown as Space[];

    const readableCollaborationIds: string[] = [];

    // Check read access on each space's collaboration (in-memory, no DB)
    for (const space of loadedSpaces) {
      if (!space.collaboration) {
        continue;
      }
      if (
        this.authorizationService.isAccessGranted(
          agentInfo,
          space.collaboration.authorization,
          AuthorizationPrivilege.READ
        )
      ) {
        readableCollaborationIds.push(space.collaboration.id);
      }
    }

    // Step B: Batch-load child spaces based on level
    const l0SpaceIds = loadedSpaces
      .filter(s => s.level === SpaceLevel.L0)
      .map(s => s.id);
    const l1SpaceIds = loadedSpaces
      .filter(s => s.level === SpaceLevel.L1)
      .map(s => s.id);

    // For L0 spaces: load all spaces in the account (1 query)
    const childSpaces: Space[] = [];
    if (l0SpaceIds.length > 0) {
      const accountChildren = (await this.db.query.spaces.findMany({
        where: inArray(spaces.levelZeroSpaceID, l0SpaceIds),
        with: { collaboration: { with: { authorization: true } } },
      })) as unknown as Space[];
      childSpaces.push(...accountChildren);
    }

    // For L1 spaces: load all L2 subspaces (1 query)
    if (l1SpaceIds.length > 0) {
      const subspaces = (await this.db.query.spaces.findMany({
        where: inArray(spaces.parentSpaceId, l1SpaceIds),
        with: { collaboration: { with: { authorization: true } } },
      })) as unknown as Space[];
      childSpaces.push(...subspaces);
    }

    // Filter child collaborations by read access (in-memory)
    for (const childSpace of childSpaces) {
      if (!childSpace.collaboration) {
        continue;
      }
      // Avoid duplicates (L0 query may include the L0 space itself)
      if (readableCollaborationIds.includes(childSpace.collaboration.id)) {
        continue;
      }
      if (
        this.authorizationService.isAccessGranted(
          agentInfo,
          childSpace.collaboration.authorization,
          AuthorizationPrivilege.READ
        )
      ) {
        readableCollaborationIds.push(childSpace.collaboration.id);
      }
    }

    return readableCollaborationIds;
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
