import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication/agent-info';
import { LogContext } from '@common/enums/logging.context';
import { ConvertChallengeToSpaceInput } from './dto/convert.dto.challenge.to.space.input';
import { SpaceService } from '@domain/challenge/space/space.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { ISpace } from '@domain/challenge/space/space.interface';
import { CommunityService } from '@domain/community/community/community.service';
import {
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { CommunityRole } from '@common/enums/community.role';
import { CreateSpaceInput } from '@domain/challenge/space/dto/space.dto.create';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IUser } from '@domain/community/user/user.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { InnovationFlowType } from '@common/enums/innovation.flow.type';
import { DiscussionCategoryCommunity } from '@common/enums/communication.discussion.category.community';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

export class ConversionService {
  constructor(
    private spaceService: SpaceService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
    private communityService: CommunityService,
    private communicationService: CommunicationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async convertChallengeToSpace(
    conversionData: ConvertChallengeToSpaceInput,
    agentInfo: AgentInfo
  ): Promise<ISpace> {
    const challenge = await this.challengeService.getChallengeOrFail(
      conversionData.challengeID,
      {
        relations: {
          community: true,
          context: true,
          profile: true,
          collaboration: {
            callouts: true,
          },
          storageAggregator: true,
        },
      }
    );
    if (
      !challenge.community ||
      !challenge.context ||
      !challenge.profile ||
      !challenge.collaboration ||
      !challenge.collaboration.callouts ||
      !challenge.storageAggregator
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on Challenge: ${challenge.nameID}`,
        LogContext.CONVERSION
      );
    }
    // check the community is in a fit state
    const challengeCommunityLeadOrgs =
      await this.communityService.getOrganizationsWithRole(
        challenge.community,
        CommunityRole.LEAD
      );
    if (challengeCommunityLeadOrgs.length !== 1) {
      throw new ValidationException(
        `A Challenge must have exactly on Lead organization to be converted to a Space: ${challenge.nameID} has ${challengeCommunityLeadOrgs.length}`,
        LogContext.CONVERSION
      );
    }
    const hostOrg = challengeCommunityLeadOrgs[0];
    const createSpaceInput: CreateSpaceInput = {
      hostID: hostOrg.nameID,
      nameID: challenge.nameID,
      profileData: {
        displayName: challenge.profile.displayName,
      },
    };
    const emptySpace = await this.spaceService.createSpace(
      createSpaceInput,
      agentInfo
    );
    const space = await this.spaceService.getSpaceOrFail(emptySpace.id, {
      relations: {
        community: true,
        context: true,
        profile: true,
        collaboration: {
          callouts: true,
        },
        storageAggregator: true,
      },
    });
    if (
      !space.community ||
      !space.context ||
      !space.profile ||
      !space.collaboration ||
      !space.storageAggregator
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on new Space: ${challenge.nameID}`,
        LogContext.CONVERSION
      );
    }

    const userMembers = await this.communityService.getUsersWithRole(
      challenge.community,
      CommunityRole.MEMBER
    );
    const userLeads = await this.communityService.getUsersWithRole(
      challenge.community,
      CommunityRole.LEAD
    );
    const orgMembers = await this.communityService.getOrganizationsWithRole(
      challenge.community,
      CommunityRole.MEMBER
    );

    // Remove the contributors from old roles
    await this.removeContributors(
      challenge.community,
      userMembers,
      userLeads,
      orgMembers,
      challengeCommunityLeadOrgs
    );

    await this.communityService.removeUserFromRole(
      space.community,
      agentInfo.userID,
      CommunityRole.MEMBER
    );

    // Swap the communications
    await this.swapCommunication(space.community, challenge.community);

    // Swap the contexts
    const challengeContext = challenge.context;
    const spaceContext = space.context;
    space.context = challengeContext;
    challenge.context = spaceContext;

    // Swap the collaborations
    const challengeCollaboration = challenge.collaboration;
    const spaceCollaboration = space.collaboration;
    space.collaboration = challengeCollaboration;
    challenge.collaboration = spaceCollaboration;
    // todo: update display locations for callouts to use space locations

    // Swap the profiles
    const challengeProfile = challenge.profile;
    const spaceProfile = space.profile;
    space.profile = challengeProfile;
    challenge.profile = spaceProfile;

    // Swap the storage aggregators
    const challengeStorage = challenge.storageAggregator;
    const spaceStorage = space.storageAggregator;
    space.storageAggregator = challengeStorage;
    challenge.storageAggregator = spaceStorage;
    // and reverse the parent child relationship
    challenge.storageAggregator.parentStorageAggregator =
      space.storageAggregator;
    space.storageAggregator.parentStorageAggregator = undefined;

    // Save both + then delete the challenge (save is needed to ensure right context is deleted etc)
    await this.spaceService.save(space);
    const updatedChallenge = await this.challengeService.save(challenge);

    // Todo: migrate the storage aggregator

    // Assign users to roles in new space
    await this.assignContributors(
      space.community,
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
        space.id,
        agentInfo,
        space.storageAggregator
      );
    }
    // Finally delete the Challenge
    await this.challengeService.deleteChallenge({
      ID: updatedChallenge.id,
    });
    return space;
  }

  async convertOpportunityToChallenge(
    opportunityID: string,
    spaceID: string,
    agentInfo: AgentInfo,
    spaceStorageAggregator: IStorageAggregator,
    innovationFlowTemplateID?: string
  ): Promise<IChallenge> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityID,
      {
        relations: ['community', 'context', 'profile'],
      }
    );

    const challengeNameID = `${opportunity.nameID}c`;
    await this.spaceService.validateChallengeNameIdOrFail(
      challengeNameID,
      spaceID
    );
    let challenge: IChallenge;

    if (innovationFlowTemplateID)
      challenge = await this.challengeService.createChallenge(
        {
          nameID: challengeNameID,
          innovationFlowTemplateID: innovationFlowTemplateID,
          profileData: {
            displayName: opportunity.profile.displayName,
          },
          storageAggregatorParent: spaceStorageAggregator,
        },
        spaceID,
        agentInfo
      );
    else {
      const defaultChallengeLifecycleTemplate =
        await this.spaceService.getDefaultInnovationFlowTemplate(
          spaceID,
          InnovationFlowType.CHALLENGE
        );
      challenge = await this.challengeService.createChallenge(
        {
          nameID: challengeNameID,
          innovationFlowTemplateID: defaultChallengeLifecycleTemplate.id,
          profileData: {
            displayName: opportunity.profile.displayName,
          },
          storageAggregatorParent: spaceStorageAggregator,
        },
        spaceID,
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

    // Add the new challenge to the space
    return await this.spaceService.addChallengeToSpace(spaceID, challenge);
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
        parentCommunity.spaceID,
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
    // TODO: missing
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
