import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { groupCredentialsByEntity } from '@services/api/roles/util/group.credentials.by.entity';
import { SpaceService } from '@domain/challenge/space/space.service';
import { RolesService } from '../roles/roles.service';
import { ApplicationForRoleResult } from '../roles/dto/roles.dto.result.application';
import { InvitationForRoleResult } from '../roles/dto/roles.dto.result.invitation';
import { ISpace } from '@domain/challenge/space/space.interface';
import { SpacesQueryArgs } from '@domain/challenge/space/dto/space.args.query.spaces';
import { ActivityLogService } from '../activity-log';
import { AgentInfo } from '@core/authentication';
import { MyJourneyResults } from './dto/my.journeys.results';
import { ActivityService } from '@platform/activity/activity.service';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { sortSpacesByActivity } from '@domain/challenge/space/get.spaces.sorted.by.activity';

@Injectable()
export class MeService {
  constructor(
    private spaceService: SpaceService,
    private rolesService: RolesService,
    private activityLogService: ActivityLogService,
    private activityService: ActivityService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getUserInvitations(
    userId: string,
    states?: string[]
  ): Promise<InvitationForRoleResult[]> {
    return await this.rolesService.getUserInvitations(userId, states);
  }

  public async getUserApplications(
    userId: string,
    states?: string[]
  ): Promise<ApplicationForRoleResult[]> {
    return await this.rolesService.getUserApplications(userId, states);
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

    // get spaces and their children challenges and opportunities
    const spaces = await this.spaceService.getSpacesWithChildJourneysUnsorted(
      args
    );

    const spaceMembershipCollaborationInfo =
      this.spaceService.getSpaceMembershipCollaborationInfo(spaces);

    const latestActivitiesPerSpace =
      await this.activityService.getLatestActivitiesPerSpaceFromJourneys(
        agentInfo.userID,
        spaceMembershipCollaborationInfo
      );

    return sortSpacesByActivity(spaces, latestActivitiesPerSpace);
  }

  public async getMyJourneys(
    agentInfo: AgentInfo,
    limit = 20
  ): Promise<MyJourneyResults[]> {
    const rawActivities = await this.activityService.getMyJourneysActivity(
      agentInfo.userID,
      limit * 2 //magic number, should not be needed. toDo Fix in https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/server/3626
    );

    const myJourneyResults: MyJourneyResults[] = [];

    for (const rawActivity of rawActivities) {
      const activityLog =
        await this.activityLogService.convertRawActivityToResult(rawActivity);

      if (!activityLog?.journey) {
        this.logger.warn(
          `Unable to process activity entry ${rawActivity.id} because it does not have a journey.`,
          LogContext.ACTIVITY
        );
        continue;
      }
      myJourneyResults.push({
        journey: activityLog.journey,
        latestActivity: activityLog,
      });
    }

    return myJourneyResults.slice(0, limit);
  }
}
