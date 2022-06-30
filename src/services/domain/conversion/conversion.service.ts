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
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IUser } from '@domain/community/user/user.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunicationService } from '@domain/communication/communication/communication.service';

export class ConversionService {
  constructor(
    private hubService: HubService,
    private challengeService: ChallengeService,
    private communityService: CommunityService,
    private communicationService: CommunicationService,
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
    await this.removeContributors(
      challengeCommunity,
      userMembers,
      userLeads,
      orgMembers,
      challengeCommunityLeadOrgs
    );
    // also remove the current user from the members of the hub
    await this.communityService.removeUserFromRole(
      hubCommunity,
      agentInfo.userID,
      CommunityRole.MEMBER
    );

    // Swap the pieces to be re-used
    const hubCommunication = await this.communityService.getCommunication(
      hubCommunity.id
    );
    const challengeCommunication = await this.communityService.getCommunication(
      challengeCommunity.id
    );
    const tmpCommunication =
      await this.communicationService.createCommunication('temp', hub.id);
    challengeCommunity.communication = tmpCommunication;
    await this.communityService.save(challengeCommunity);
    hubCommunity.communication = challengeCommunication;
    if (hubCommunication) {
      await this.communicationService.removeCommunication(hubCommunication.id);
    }

    hub.community = hubCommunity;
    challenge.community = challengeCommunity;

    // Swap the contexts
    const challengeContext = challenge.context;
    const hubContext = hub.context;
    hub.context = challengeContext;
    challenge.context = hubContext;

    // Save both + then re-assign the roles
    const updatedHub = await this.hubService.save(hub);
    const updatedChallenge = await this.challengeService.save(challenge);

    // Add the users into their new roles
    const hubCommunityUpdated = updatedHub.community;
    if (!hubCommunityUpdated) {
      throw new EntityNotInitializedException(
        `Unable to locate updated Community on Hub: ${updatedHub.nameID}`,
        LogContext.CHALLENGES
      );
    }

    // Assign users to roles in new hub
    await this.assignContributors(
      hubCommunityUpdated,
      userMembers,
      userLeads,
      orgMembers
    );

    // Finally delete the Challenge
    await this.challengeService.deleteChallenge({
      ID: updatedChallenge.id,
    });

    // Notes: (a) remove old membership credentials + add new ones
    // (b) update the community policy
    // convert opportunities into challenges
    // update community parent
    // Update hubID field everywhere where that is passed down (community, context), unless we re-use the challengeID as the new hubID...
    // when deleting make sure not to delete re-used entities!!
    return hub;
  }

  private async removeContributors(
    community: ICommunity,
    userMembers: IUser[],
    userLeads: IUser[],
    orgMembers: IOrganization[],
    orgLeads: IOrganization[]
  ) {
    for (const userMember of userMembers) {
      await this.communityService.removeUserFromRole(
        community,
        userMember.id,
        CommunityRole.MEMBER
      );
    }
    for (const userLead of userLeads) {
      await this.communityService.removeUserFromRole(
        community,
        userLead.id,
        CommunityRole.LEAD
      );
    }
    for (const orgMember of orgMembers) {
      await this.communityService.removeOrganizationFromRole(
        community,
        orgMember.id,
        CommunityRole.MEMBER
      );
    }
    for (const orgLead of orgLeads) {
      await this.communityService.removeOrganizationFromRole(
        community,
        orgLead.id,
        CommunityRole.LEAD
      );
    }
  }

  private async assignContributors(
    community: ICommunity,
    userMembers: IUser[],
    userLeads: IUser[],
    orgMembers: IOrganization[],
    orgLeads?: IOrganization[]
  ) {
    for (const userMember of userMembers) {
      await this.communityService.assignUserToRole(
        community,
        userMember.id,
        CommunityRole.MEMBER
      );
    }
    for (const userLead of userLeads) {
      await this.communityService.assignUserToRole(
        community,
        userLead.id,
        CommunityRole.LEAD
      );
    }
    for (const orgMember of orgMembers) {
      await this.communityService.assignOrganizationToRole(
        community,
        orgMember.id,
        CommunityRole.MEMBER
      );
    }
    if (orgLeads) {
      for (const orgLead of orgLeads) {
        await this.communityService.assignOrganizationToRole(
          community,
          orgLead.id,
          CommunityRole.LEAD
        );
      }
    }
  }
}
