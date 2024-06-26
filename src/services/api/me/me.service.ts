import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { groupCredentialsByEntity } from '@services/api/roles/util/group.credentials.by.entity';
import { SpaceService } from '@domain/space/space/space.service';
import { RolesService } from '../roles/roles.service';
import { ISpace } from '@domain/space/space/space.interface';
import { SpacesQueryArgs } from '@domain/space/space/dto/space.args.query.spaces';
import { ActivityLogService } from '../activity-log';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { MySpaceResults } from './dto/my.journeys.results';
import { ActivityService } from '@platform/activity/activity.service';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { sortSpacesByActivity } from '@domain/space/space/sort.spaces.by.activity';
import { CommunityRole } from '@common/enums/community.role';
import { CommunityService } from '@domain/community/community/community.service';
import { CommunityInvitationResult } from './dto/me.invitation.result';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { EntityNotFoundException } from '@common/exceptions';
import { CommunityApplicationResult } from './dto/me.application.result';

@Injectable()
export class MeService {
  constructor(
    private spaceService: SpaceService,
    private rolesService: RolesService,
    private activityLogService: ActivityLogService,
    private activityService: ActivityService,
    private communityService: CommunityService,
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

  public async getSpaceMemberships(
    agentInfo: AgentInfo,
    visibilities: SpaceVisibility[] = [
      SpaceVisibility.ACTIVE,
      SpaceVisibility.DEMO,
    ]
  ): Promise<ISpace[]> {
    const credentialMap = groupCredentialsByEntity(agentInfo.credentials);
    const spaceIds = Array.from(credentialMap.get('spaces')?.keys() ?? []);
    const args: SpacesQueryArgs = {
      IDs: spaceIds,
      filter: {
        visibilities,
      },
    };

    // get spaces and their subspaces
    const spaces = await this.spaceService.getSpacesWithChildJourneys(args);

    const spaceMembershipCollaborationInfo =
      this.spaceService.getSpaceMembershipCollaborationInfo(spaces);

    const latestActivitiesPerSpace =
      await this.activityService.getLatestActivitiesPerSpaceMembership(
        agentInfo.userID,
        spaceMembershipCollaborationInfo
      );

    return sortSpacesByActivity(spaces, latestActivitiesPerSpace);
  }

  public async getMySpaces(
    agentInfo: AgentInfo,
    limit = 20,
    showOnlyMyCreatedSpaces = false
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
      if (!showOnlyMyCreatedSpaces) {
        mySpaceResults.push({
          space: activityLog.space,
          latestActivity: activityLog,
        });
      } else {
        if (activityLog?.space) {
          if (!activityLog?.space.community) {
            this.logger.warn(
              `Unable to process space entry ${activityLog?.space.id} because it does not have a community.`,
              LogContext.ACTIVITY
            );
            continue;
          }
          const myRoles = await this.communityService.getCommunityRoles(
            agentInfo,
            activityLog.space.community
          );
          if (
            myRoles.includes(CommunityRole.ADMIN) &&
            activityLog.space.level === 0
          ) {
            mySpaceResults.push({
              space: activityLog.space,
              latestActivity: activityLog,
            });
          }
        }
      }
    }

    return mySpaceResults.slice(0, limit);
  }

  public async canCreateFreeSpace(agentInfo: AgentInfo): Promise<boolean> {
    const credentials = agentInfo.credentials;
    return !credentials.some(
      credential => credential.type === AuthorizationCredential.ACCOUNT_HOST
    );
  }
}
