import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { groupCredentialsByEntity } from '@services/api/roles/util/group.credentials.by.entity';
import { SpaceService } from '@domain/space/space/space.service';
import { RolesService } from '../roles/roles.service';
import { ISpace } from '@domain/space/space/space.interface';
import { ActivityLogService } from '../activity-log';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { MySpaceResults } from './dto/my.journeys.results';
import { ActivityService } from '@platform/activity/activity.service';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { sortSpacesByActivity } from '@domain/space/space/sort.spaces.by.activity';
import { CommunityInvitationResult } from './dto/me.invitation.result';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { EntityNotFoundException } from '@common/exceptions';
import { CommunityApplicationResult } from './dto/me.application.result';
import { SpaceMembershipCollaborationInfo } from './space.membership.type';
import { CommunityMembershipResult } from './dto/me.membership.result';
import { SpaceLevel } from '@common/enums/space.level';

@Injectable()
export class MeService {
  constructor(
    private spaceService: SpaceService,
    private rolesService: RolesService,
    private activityLogService: ActivityLogService,
    private activityService: ActivityService,
    private communityResolverService: CommunityResolverService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getCommunityInvitationsCountForUser(
    userId: string,
    states?: string[]
  ): Promise<number> {
    const invitations = await this.rolesService.getCommunityInvitationsForUser(
      userId,
      states
    );
    return invitations.length;
  }

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
      if (!invitation.roleSet) {
        throw new EntityNotFoundException(
          `Community not found for invitation ${invitation.id}`,
          LogContext.COMMUNITY
        );
      }
      const space =
        await this.communityResolverService.getSpaceForRoleSetOrFail(
          invitation.roleSet.id
        );
      if (!space.about) {
        throw new EntityNotFoundException(
          `Missing entities on Space loaded for Invitation ${invitation.id}`,
          LogContext.COMMUNITY
        );
      }
      results.push({
        id: `${invitation.id}`,
        invitation: invitation,
        spacePendingMembershipInfo: {
          id: space.id,
          level: space.level,
          about: space.about,
          communityGuidelines: space.about?.guidelines,
        },
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
      if (!application.roleSet) {
        throw new EntityNotFoundException(
          `Community not found for application ${application.id}`,
          LogContext.COMMUNITY
        );
      }
      const space =
        await this.communityResolverService.getSpaceForRoleSetOrFail(
          application.roleSet.id
        );
      if (!space.about) {
        throw new EntityNotFoundException(
          `Missing entities on Space loaded for Application ${application.id}`,
          LogContext.COMMUNITY
        );
      }
      results.push({
        id: `${application.id}`,
        application: application,
        spacePendingMembershipInfo: {
          id: space.id,
          level: space.level,
          about: space.about,
          communityGuidelines: space.about?.guidelines,
        },
      });
    }
    return results;
  }

  private async getSpaceMembershipsForAgentInfo(
    agentInfo: AgentInfo
  ): Promise<ISpace[]> {
    const credentialMap = groupCredentialsByEntity(agentInfo.credentials);
    const spaceIds = Array.from(credentialMap.get('spaces')?.keys() ?? []);

    const allSpaces = await this.spaceService.getSpacesInList(spaceIds);
    const validSpaces = this.filterValidSpaces(allSpaces);
    const spaceMembershipCollaborationInfo =
      this.getSpaceMembershipCollaborationInfo(validSpaces);
    const latestActivitiesPerSpace =
      await this.activityService.getLatestActivitiesPerSpaceMembership(
        agentInfo.userID,
        spaceMembershipCollaborationInfo
      );
    return sortSpacesByActivity(validSpaces, latestActivitiesPerSpace);
  }

  /**
   * Function that returns all spaces that are valid (L1 and L2 spaces have parents)
   * @param allSpaces all spaces to be filtered out
   * @returns spaces that are valid (L1 and L2 spaces have parents).
   * Orphaned spaces are logged as warnings and filtered out, also spaces without collaboration are filtered out.
   */
  private filterValidSpaces(allSpaces: ISpace[]) {
    const validSpaces = [];

    for (const space of allSpaces) {
      if (
        (space.level !== SpaceLevel.L0 && !space.parentSpace) ||
        !space.collaboration
      ) {
        this.logger.warn(
          `Space ${space.id} is missing parent space or collaboration`,
          LogContext.COMMUNITY
        );
      } else {
        validSpaces.push(space);
      }
    }
    return validSpaces;
  }

  public async getSpaceMembershipsFlat(
    agentInfo: AgentInfo
  ): Promise<CommunityMembershipResult[]> {
    const sortedFlatListSpacesWithMembership =
      await this.getSpaceMembershipsForAgentInfo(agentInfo);
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
    agentInfo: AgentInfo,
    limit?: number
  ): Promise<CommunityMembershipResult[]> {
    const sortedFlatListSpacesWithMembership =
      await this.getSpaceMembershipsForAgentInfo(agentInfo);

    const levelZeroSpacesRaw = this.filterSpacesByLevel(
      sortedFlatListSpacesWithMembership,
      SpaceLevel.L0
    );
    if (limit) {
      levelZeroSpacesRaw.splice(limit);
    }
    const levelOneSpaces = this.filterSpacesByLevel(
      sortedFlatListSpacesWithMembership,
      SpaceLevel.L1
    );
    const levelTwoSpaces = this.filterSpacesByLevel(
      sortedFlatListSpacesWithMembership,
      SpaceLevel.L2
    );

    const levelZeroMemberships = levelZeroSpacesRaw.map(levelZeroSpace => {
      const levelZeroMembership: CommunityMembershipResult = {
        id: levelZeroSpace.id,
        space: levelZeroSpace,
        childMemberships: this.getChildMemberships(
          levelZeroSpace,
          levelOneSpaces,
          levelTwoSpaces
        ),
      };
      return levelZeroMembership;
    });

    return levelZeroMemberships;
  }

  private filterSpacesByLevel(spaces: ISpace[], level: SpaceLevel): ISpace[] {
    return spaces.filter(space => space.level === level);
  }

  private getChildMemberships(
    parentSpace: ISpace,
    childSpaces: ISpace[],
    grandChildSpaces: ISpace[]
  ): CommunityMembershipResult[] {
    return childSpaces
      .filter(childSpace => childSpace.parentSpace?.id === parentSpace.id)
      .map(childSpace => {
        const childMembership: CommunityMembershipResult = {
          id: childSpace.id,
          space: childSpace,
          childMemberships: this.getGrandChildMemberships(
            childSpace,
            grandChildSpaces
          ),
        };
        return childMembership;
      });
  }

  private getGrandChildMemberships(
    parentSpace: ISpace,
    grandChildSpaces: ISpace[]
  ): CommunityMembershipResult[] {
    return grandChildSpaces
      .filter(
        grandChildSpace => grandChildSpace.parentSpace?.id === parentSpace.id
      )
      .map(grandChildSpace => ({
        id: grandChildSpace.id,
        space: grandChildSpace,
        childMemberships: [],
      }));
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
}
