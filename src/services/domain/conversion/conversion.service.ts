import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication/agent-info';
import { LogContext } from '@common/enums/logging.context';
import { ConvertChallengeToHubInput } from './dto/convert.dto.challenge.to.hub.input';
import { HubService } from '@domain/challenge/hub/hub.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { CommunityService } from '@domain/community/community/community.service';
import {
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { CommunityRole } from '@common/enums/community.role';
import { CreateHubInput } from '@domain/challenge/hub/dto/hub.dto.create';
import { CommunityType } from '@common/enums/community.type';

export class ConversionService {
  constructor(
    private hubService: HubService,
    private challengeService: ChallengeService,
    private communityService: CommunityService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async convertChallengeToHub(
    conversionData: ConvertChallengeToHubInput,
    agentInfo: AgentInfo
  ): Promise<IHub> {
    const challenge = await this.challengeService.getChallengeOrFail(
      conversionData.challengeID,
      {
        relations: ['community', 'context'],
      }
    );
    // check the community is in a fit state
    const challengeCommunity = challenge.community;
    if (!challengeCommunity) {
      throw new EntityNotInitializedException(
        `Unable to locate Community on Challenge: ${challenge.nameID}`,
        LogContext.CHALLENGES
      );
    }
    const challengeCommunityLeadOrgs =
      await this.communityService.getOrganizationsWithRole(
        challengeCommunity,
        CommunityRole.LEAD
      );
    if (challengeCommunityLeadOrgs.length !== 1) {
      throw new ValidationException(
        `A Challenge must have exactly on Lead organization to be converted to a Hub: ${challenge.nameID} has ${challengeCommunityLeadOrgs.length}`,
        LogContext.CHALLENGES
      );
    }
    const hostOrg = challengeCommunityLeadOrgs[0];
    const createHubInput: CreateHubInput = {
      hostID: hostOrg.nameID,
      nameID: challenge.nameID,
      displayName: challenge.displayName,
    };
    const hub = await this.hubService.createHub(createHubInput, agentInfo);

    // Swap the communities...
    const hubCommunity = hub.community;
    if (!hubCommunity) {
      throw new EntityNotInitializedException(
        `Unable to locate Community on Hub: ${hub.nameID}`,
        LogContext.CHALLENGES
      );
    }

    const userMembers = await this.communityService.getUsersWithRole(
      challengeCommunity,
      CommunityRole.MEMBER
    );
    const userLeads = await this.communityService.getUsersWithRole(
      challengeCommunity,
      CommunityRole.LEAD
    );
    const orgMembers = await this.communityService.getOrganizationsWithRole(
      challengeCommunity,
      CommunityRole.MEMBER
    );

    // Remove the contributors from old roles
    for (const userMember of userMembers) {
      await this.communityService.removeUserFromRole(
        challengeCommunity,
        userMember.id,
        CommunityRole.MEMBER
      );
    }
    for (const userLead of userLeads) {
      await this.communityService.removeUserFromRole(
        challengeCommunity,
        userLead.id,
        CommunityRole.LEAD
      );
    }
    for (const orgMember of orgMembers) {
      await this.communityService.removeOrganizationFromRole(
        challengeCommunity,
        orgMember.id,
        CommunityRole.MEMBER
      );
    }
    await this.communityService.removeOrganizationFromRole(
      challengeCommunity,
      hostOrg.id,
      CommunityRole.LEAD
    );

    // Swap the communities
    const hubCommunityPolicy =
      this.communityService.getCommunityPolicy(hubCommunity);
    const challengeCommunityPolicy =
      this.communityService.getCommunityPolicy(challengeCommunity);
    challengeCommunity.type = CommunityType.HUB;
    challengeCommunity.hubID = hub.id;
    challengeCommunity.parentCommunity = undefined;

    hub.community = challengeCommunity;
    challenge.community = hubCommunity;
    this.communityService.setCommunityPolicy(hub.community, hubCommunityPolicy);
    this.communityService.setCommunityPolicy(
      challenge.community,
      challengeCommunityPolicy
    );
    // Save both + then re-assign the roles
    await this.hubService.save(hub);
    await this.challengeService.save(challenge);

    // Add the users into their new roles
    const hubCommunityUpdated = hub.community;
    if (!hubCommunityUpdated) {
      throw new EntityNotInitializedException(
        `Unable to locate updated Community on Hub: ${hub.nameID}`,
        LogContext.CHALLENGES
      );
    }
    for (const userMember of userMembers) {
      await this.communityService.assignUserToRole(
        hubCommunityUpdated,
        userMember.id,
        CommunityRole.MEMBER
      );
    }
    for (const userLead of userLeads) {
      await this.communityService.assignUserToRole(
        hubCommunityUpdated,
        userLead.id,
        CommunityRole.LEAD
      );
    }
    for (const orgMember of orgMembers) {
      await this.communityService.assignOrganizationToRole(
        hubCommunityUpdated,
        orgMember.id,
        CommunityRole.MEMBER
      );
    }

    // Swap the contexts
    const challengeContext = challenge.context;
    const hubContext = hub.context;
    hub.context = challengeContext;
    challenge.context = hubContext;

    // Finally delete the Challenge
    await this.challengeService.deleteChallenge({
      ID: challenge.id,
    });

    // Notes: (a) remove old membership credentials + add new ones
    // (b) update the community policy
    // convert opportunities into challenges
    // update community parent
    // Update hubID field everywhere where that is passed down (community, context), unless we re-use the challengeID as the new hubID...
    // when deleting make sure not to delete re-used entities!!
    return hub;
  }
}
