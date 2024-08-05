import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { groupCredentialsByEntity } from '@services/api/roles/util/group.credentials.by.entity';
import { SpaceService } from '@domain/space/space/space.service';
import { RolesService } from '../roles/roles.service';
import { ISpace } from '@domain/space/space/space.interface';
import { ActivityLogService } from '../activity-log';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { MySpaceResults } from './dto/my.journeys.results';
import { ActivityService } from '@platform/activity/activity.service';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { sortSpacesByActivity } from '@domain/space/space/sort.spaces.by.activity';
import { CommunityInvitationResult } from './dto/me.invitation.result';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { CommunityApplicationResult } from './dto/me.application.result';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { UserService } from '@domain/community/user/user.service';
import { compact } from 'lodash';
import { SpaceMembershipCollaborationInfo } from './space.membership.type';
import { CommunityMembershipResult } from './dto/me.membership.result';
import { SpaceLevel } from '@common/enums/space.level';

@Injectable()
export class MeService {
  constructor(
    private spaceService: SpaceService,
    private contributorService: ContributorService,
    private userService: UserService,
    private rolesService: RolesService,
    private activityLogService: ActivityLogService,
    private activityService: ActivityService,
    private communityResolverService: CommunityResolverService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getCommunityInvitationsForUser(
    userId: string,
    states?: string[]
  ): Promise<CommunityInvitationResult[]> {
    const invitations = await this.rolesService.getCommunityInvitationsForUser(
      userId,
      states
    );
    const results: CommunityInvitationResult[] = [];
    for (const invitation of invitations) {
      if (!invitation.community) {
        throw new EntityNotFoundException(
          `Community not found for invitation ${invitation.id}`,
          LogContext.COMMUNITY
        );
      }
      const space =
        await this.communityResolverService.getSpaceForCommunityOrFail(
          invitation.community.id
        );
      results.push({
        id: `${invitation.id}`,
        invitation: invitation,
        space: space,
      });
    }
    return results;
  }

  public async getCommunityApplicationsForUser(
    userId: string,
    states?: string[]
  ): Promise<CommunityApplicationResult[]> {
    const applications =
      await this.rolesService.getCommunityApplicationsForUser(userId, states);
    const results: CommunityApplicationResult[] = [];
    for (const application of applications) {
      if (!application.community) {
        throw new EntityNotFoundException(
          `Community not found for application ${application.id}`,
          LogContext.COMMUNITY
        );
      }
      const space =
        await this.communityResolverService.getSpaceForCommunityOrFail(
          application.community.id
        );
      results.push({
        id: `${application.id}`,
        application: application,
        space: space,
      });
    }
    return results;
  }

  private async getSpacesWhereAmMember(
    agentInfo: AgentInfo
  ): Promise<ISpace[]> {
    const credentialMap = groupCredentialsByEntity(agentInfo.credentials);
    const spaceIds = Array.from(credentialMap.get('spaces')?.keys() ?? []);

    // get spaces and their subspaces
    const allSpaces = await this.spaceService.getSpacesInList(spaceIds);
    for (const space of allSpaces) {
      if (
        (space.level !== SpaceLevel.SPACE && !space.parentSpace) ||
        !space.collaboration
      ) {
        throw new RelationshipNotFoundException(
          `Space ${space.id} is missing parent space or collaboration`,
          LogContext.COMMUNITY
        );
      }
    }
    const spaceMembershipCollaborationInfo =
      this.getSpaceMembershipCollaborationInfo(allSpaces);
    const latestActivitiesPerSpace =
      await this.activityService.getLatestActivitiesPerSpaceMembership(
        agentInfo.userID,
        spaceMembershipCollaborationInfo
      );
    return sortSpacesByActivity(allSpaces, latestActivitiesPerSpace);
  }

  public async getSpaceMembershipsFlat(
    agentInfo: AgentInfo
  ): Promise<CommunityMembershipResult[]> {
    const sortedFlatListSpacesWithMembership =
      await this.getSpacesWhereAmMember(agentInfo);
    const spaceMemberships: CommunityMembershipResult[] = [];

    for (const space of sortedFlatListSpacesWithMembership) {
      const levelZeroMembership: CommunityMembershipResult = {
        id: space.id,
        space: space,
        childMemberships: [],
      };
      spaceMemberships.push(levelZeroMembership);
    }
    return spaceMemberships;
  }

  public async getSpaceMembershipsHierarchical(
    agentInfo: AgentInfo
  ): Promise<CommunityMembershipResult[]> {
    const sortedFlatListSpacesWithMembership =
      await this.getSpacesWhereAmMember(agentInfo);

    const levelZeroSpaces = sortedFlatListSpacesWithMembership.filter(
      space => space.level === SpaceLevel.SPACE
    );
    const levelOneSpaces = sortedFlatListSpacesWithMembership.filter(
      space => space.level === SpaceLevel.CHALLENGE
    );
    const levelTwoSpaces = sortedFlatListSpacesWithMembership.filter(
      space => space.level === SpaceLevel.OPPORTUNITY
    );
    const levelZeroMemberships: CommunityMembershipResult[] = [];
    for (const levelZeroSpace of levelZeroSpaces) {
      const levelZeroMembership: CommunityMembershipResult = {
        id: levelZeroSpace.id,
        space: levelZeroSpace,
        childMemberships: [],
      };
      for (const levelOneSpace of levelOneSpaces) {
        if (levelOneSpace.parentSpace?.id === levelZeroSpace.id) {
          const levelOneMembership: CommunityMembershipResult = {
            id: levelOneSpace.id,
            space: levelOneSpace,
            childMemberships: [],
          };
          for (const levelTwoSpace of levelTwoSpaces) {
            if (levelTwoSpace.parentSpace?.id === levelOneSpace.id) {
              const levelTwoMembership: CommunityMembershipResult = {
                id: levelTwoSpace.id,
                space: levelTwoSpace,
                childMemberships: [],
              };
              levelOneMembership.childMemberships.push(levelTwoMembership);
            }
          }
          levelZeroMembership.childMemberships.push(levelOneMembership);
        }
      }
      levelZeroMemberships.push(levelZeroMembership);
    }

    return levelZeroMemberships;
  }

  // Returns a map of all collaboration IDs with parent space ID
  private getSpaceMembershipCollaborationInfo(
    spaces: ISpace[]
  ): SpaceMembershipCollaborationInfo {
    const spaceMembershipCollaborationInfo: SpaceMembershipCollaborationInfo =
      new Map();

    for (const space of spaces) {
      if (!space.collaboration) {
        throw new EntityNotFoundException(
          `Space ${space.id} is missing collaboration`,
          LogContext.COMMUNITY
        );
      }
      spaceMembershipCollaborationInfo.set(
        space.collaboration.id,
        space.levelZeroSpaceID
      );
    }

    return spaceMembershipCollaborationInfo;
  }

  public async getMySpaces(
    agentInfo: AgentInfo,
    limit = 20
  ): Promise<MySpaceResults[]> {
    const rawActivities = await this.activityService.getMySpacesActivity(
      agentInfo.userID,
      limit * 2 //magic number, should not be needed. toDo Fix in https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/server/3626
    );

    const mySpaceResults: MySpaceResults[] = [];

    for (const rawActivity of rawActivities) {
      const activityLog =
        await this.activityLogService.convertRawActivityToResult(rawActivity);

      if (!activityLog?.space) {
        this.logger.warn(
          `Unable to process activity entry ${rawActivity.id} because it does not have a journey.`,
          LogContext.ACTIVITY
        );
        continue;
      }
      mySpaceResults.push({
        space: activityLog.space,
        latestActivity: activityLog,
      });
    }

    return mySpaceResults.slice(0, limit);
  }

  public async getMyCreatedSpaces(
    agentInfo: AgentInfo,
    limit = 20
  ): Promise<ISpace[]> {
    const user = await this.userService.getUserOrFail(agentInfo.userID);
    if (!user) {
      throw new EntityNotFoundException(
        `User not found ${agentInfo.userID}`,
        LogContext.COMMUNITY
      );
    }
    const accounts = (
      await this.contributorService.getAccountsHostedByContributor(user, true)
    )
      .sort((a, b) =>
        a.createdDate && b.createdDate
          ? b.createdDate.getTime() - a.createdDate.getTime() // Sort descending, so latest is the first
          : 0
      )
      .slice(0, limit);

    if (!accounts || accounts.length === 0) {
      return [];
    }

    return compact(accounts.map(account => account.space));
  }

  public async canCreateFreeSpace(agentInfo: AgentInfo): Promise<boolean> {
    const credentials = agentInfo.credentials;
    return !credentials.some(
      credential => credential.type === AuthorizationCredential.ACCOUNT_HOST
    );
  }
}
