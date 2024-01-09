import { Injectable } from '@nestjs/common';
import { ICredential } from '@src/domain';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { groupCredentialsByEntity } from '@services/api/roles/util/group.credentials.by.entity';
import { SpaceService } from '@domain/challenge/space/space.service';
import { RolesService } from '../roles/roles.service';
import { ApplicationForRoleResult } from '../roles/dto/roles.dto.result.application';
import { InvitationForRoleResult } from '../roles/dto/roles.dto.result.invitation';
import { ISpace } from '@domain/challenge/space/space.interface';
import { SpacesQueryArgs } from '@domain/challenge/space/dto/space.args.query.spaces';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { In } from 'typeorm';
import { ActivityLogService } from '../activity-log';
import { AgentInfo } from '@core/authentication';
import { MyJourneyResults } from './dto/my.journeys.results';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { ActivityService } from '@platform/activity/activity.service';

@Injectable()
export class MeService {
  constructor(
    private spaceService: SpaceService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
    private rolesService: RolesService,
    private activityLogService: ActivityLogService,
    private activityService: ActivityService
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

  public getSpaceMemberships(
    credentials: ICredential[],
    visibilities: SpaceVisibility[] = [
      SpaceVisibility.ACTIVE,
      SpaceVisibility.DEMO,
    ]
  ): Promise<ISpace[]> {
    const credentialMap = groupCredentialsByEntity(credentials);
    const spaceIds = Array.from(credentialMap.get('spaces')?.keys() ?? []);
    const args: SpacesQueryArgs = {
      IDs: spaceIds,
      filter: {
        visibilities,
      },
    };

    return this.spaceService.getSpaces(args);
  }

  public async getMyJourneys(
    agentInfo: AgentInfo,
    limit = 20,
    visibilities: SpaceVisibility[] = [
      SpaceVisibility.ACTIVE,
      SpaceVisibility.DEMO,
    ],
    types?: ActivityEventType[]
  ): Promise<MyJourneyResults[]> {
    const credentialMap = groupCredentialsByEntity(agentInfo.credentials);
    const spaceIds = Array.from(credentialMap.get('spaces')?.keys() ?? []);
    const challengeIds = Array.from(
      credentialMap.get('challenges')?.keys() ?? []
    );
    const opportunityIds = Array.from(
      credentialMap.get('opportunities')?.keys() ?? []
    );
    const args: SpacesQueryArgs = {
      IDs: spaceIds,
      filter: {
        visibilities,
      },
    };

    const spaces = await this.spaceService.getSpaces(args, {
      relations: { collaboration: true },
    });
    const challenges = await this.challengeService.getChallenges({
      where: { id: In(challengeIds) },
      relations: {
        collaboration: true,
        innovationFlow: true,
        parentSpace: true,
      },
    });
    const opportunities = await this.opportunityService.getOpportunities({
      where: { id: In(opportunityIds) },
      relations: { collaboration: true, innovationFlow: true, challenge: true },
    });

    const myJourneyResults: MyJourneyResults[] = [];

    // Process spaces, challenges, and opportunities together
    const entitiesToProcess = [...spaces, ...challenges, ...opportunities];
    const collaborationIDs = [];
    const collaborationIdToEntity = new Map<
      string,
      (typeof entitiesToProcess)[0]
    >();

    for (const entity of entitiesToProcess) {
      const collaborationId = entity.collaboration?.id;
      if (collaborationId) {
        collaborationIDs.push(collaborationId);
        collaborationIdToEntity.set(collaborationId, entity);
      }
    }

    // Get all raw activities; limit is used to determine the amount of results
    const rawActivities =
      await this.activityService.getActivityForCollaborations(
        collaborationIDs,
        { userID: agentInfo.userID, types, limit }
      );

    for (const rawActivity of rawActivities) {
      const myActivities = await this.activityLogService.activityLog({
        collaborationID: rawActivity.collaborationID,
        includeChild: false,
      });

      const entity = collaborationIdToEntity.get(rawActivity.collaborationID);
      if (entity) {
        myJourneyResults.push({
          journey: entity,
          latestActivity: myActivities[0],
        });
      }
    }

    return myJourneyResults;
  }
}
