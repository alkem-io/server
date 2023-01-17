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
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { LifecycleType } from '@common/enums/lifecycle.type';
import { DiscussionCategoryCommunity } from '@common/enums/communication.discussion.category.community';

export class ConversionService {
  constructor(
    private hubService: HubService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
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
    const hubCommunity = hub.community;
    if (!hubCommunity) {
      throw new EntityNotInitializedException(
        `Unable to locate Community on Hub: ${hub.nameID}`,
        LogContext.CHALLENGES
      );
    }
    await this.communityService.removeUserFromRole(
      hubCommunity,
      agentInfo.userID,
      CommunityRole.MEMBER
    );

    // Swap the communications
    await this.swapCommunication(hubCommunity, challengeCommunity);
    const hubCommunityUpdated = await this.hubService.getCommunity(hub);

    // Swap the contexts
    const challengeContext = challenge.context;
    const hubContext = hub.context;
    hub.context = challengeContext;
    challenge.context = hubContext;

    // Save both + then delete the challenge (save is needed to ensure right context is deleted etc)
    await this.hubService.save(hub);
    const updatedChallenge = await this.challengeService.save(challenge);

    // Assign users to roles in new hub
    await this.assignContributors(
      hubCommunityUpdated,
      userMembers,
      userLeads,
      orgMembers
    );

    // Now migrate all the child opportunities...
    const opportunities = await this.challengeService.getOpportunities(
      updatedChallenge.id
    );
    for (const opportunity of opportunities) {
      await this.convertOpportunityToChallenge(
        opportunity.id,
        hub.id,
        agentInfo
      );
    }
    // Finally delete the Challenge
    await this.challengeService.deleteChallenge({
      ID: updatedChallenge.id,
    });
    return hub;
  }

  async convertOpportunityToChallenge(
    opportunityID: string,
    hubID: string,
    agentInfo: AgentInfo,
    lifecycleTemplateID?: string
  ): Promise<IChallenge> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityID,
      {
        relations: ['community', 'context'],
      }
    );

    const challengeNameID = `${opportunity.nameID}c`;
    await this.hubService.validateChallengeNameIdOrFail(challengeNameID, hubID);
    let challenge: IChallenge;

    if (lifecycleTemplateID)
      challenge = await this.challengeService.createChallenge(
        {
          nameID: challengeNameID,
          displayName: opportunity.displayName,
          innovationFlowTemplateID: lifecycleTemplateID,
        },
        hubID,
        agentInfo
      );
    else {
      const defaultChallengeLifecycleTemplate =
        await this.hubService.getDefaultInnovationFlowTemplate(
          hubID,
          LifecycleType.CHALLENGE
        );
      challenge = await this.challengeService.createChallenge(
        {
          nameID: challengeNameID,
          displayName: opportunity.displayName,
          innovationFlowTemplateID: defaultChallengeLifecycleTemplate.id,
        },
        hubID,
        agentInfo
      );
    }

    const opportunityCommunity = opportunity.community;
    if (!opportunityCommunity) {
      throw new EntityNotInitializedException(
        `Unable to locate Community on Opportunity: ${opportunity.nameID}`,
        LogContext.CHALLENGES
      );
    }

    const userMembers = await this.communityService.getUsersWithRole(
      opportunityCommunity,
      CommunityRole.MEMBER
    );
    const userLeads = await this.communityService.getUsersWithRole(
      opportunityCommunity,
      CommunityRole.LEAD
    );
    const orgMembers = await this.communityService.getOrganizationsWithRole(
      opportunityCommunity,
      CommunityRole.MEMBER
    );
    const orgLeads = await this.communityService.getOrganizationsWithRole(
      opportunityCommunity,
      CommunityRole.LEAD
    );

    // Remove the contributors from old roles
    await this.removeContributors(
      opportunityCommunity,
      userMembers,
      userLeads,
      orgMembers,
      orgLeads
    );
    const challengeCommunity = challenge.community;
    if (!challengeCommunity) {
      throw new EntityNotInitializedException(
        `Unable to locate Community on Challenge: ${challenge.nameID}`,
        LogContext.CHALLENGES
      );
    }

    // also remove the current user from the members of the newly created Challenge, otherwise will end up re-assigning
    await this.communityService.removeUserFromRole(
      challengeCommunity,
      agentInfo.userID,
      CommunityRole.MEMBER
    );

    // Swap the communication
    await this.swapCommunication(challengeCommunity, opportunityCommunity);
    const challengeCommunityUpdated = await this.challengeService.getCommunity(
      challenge.id
    );

    // Swap the contexts
    const opportunityContext = opportunity.context;
    const challengeContext = challenge.context;
    challenge.context = opportunityContext;
    opportunity.context = challengeContext;

    // Save both + then re-assign the roles
    await this.challengeService.save(challenge);
    const updatedOpportunity = await this.opportunityService.save(opportunity);
    await this.opportunityService.deleteOpportunity(updatedOpportunity.id);

    // Assign users to roles in new challenge
    await this.assignContributors(
      challengeCommunityUpdated,
      userMembers,
      userLeads,
      orgMembers,
      orgLeads
    );

    // Add the new challenge to the hub
    return await this.hubService.addChallengeToHub(hubID, challenge);
  }

  private async swapCommunication(
    parentCommunity: ICommunity,
    childCommunity: ICommunity
  ) {
    const parentCommunication = await this.communityService.getCommunication(
      parentCommunity.id
    );
    const childCommunication = await this.communityService.getCommunication(
      childCommunity.id
    );
    const tmpCommunication =
      await this.communicationService.createCommunication(
        'temp',
        parentCommunity.hubID,
        Object.values(DiscussionCategoryCommunity)
      );
    childCommunity.communication = tmpCommunication;
    // Need to save with temp communication to avoid db validation error re duplicate usage
    await this.communityService.save(childCommunity);
    parentCommunity.communication = childCommunication;
    await this.communityService.save(parentCommunity);
    // And remove the old parent Communicaiton that is no longer used
    if (parentCommunication) {
      await this.communicationService.removeCommunication(
        parentCommunication.id
      );
    }
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
