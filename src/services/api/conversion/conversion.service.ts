import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LogContext } from '@common/enums/logging.context';
import { ConvertSubspaceToSpaceInput } from './dto/convert.dto.subspace.to.space.input';
import { ISpace } from '@domain/space/space/space.interface';
import {
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { CommunityRole } from '@common/enums/community.role';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IUser } from '@domain/community/user/user.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { ICallout } from '@domain/collaboration/callout';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { CalloutGroupName } from '@common/enums/callout.group.name';
import { SpaceType } from '@common/enums/space.type';
import { AccountService } from '@domain/space/account/account.service';
import { SpaceService } from '@domain/space/space/space.service';
import { CreateSubspaceInput } from '@domain/space/space/dto/space.dto.create.subspace';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { SpaceLevel } from '@common/enums/space.level';
import { CommunityRoleService } from '@domain/community/community-role/community.role.service';
import { CommunityService } from '@domain/community/community/community.service';
import { CreateSpaceOnAccountInput } from '@domain/space/account/dto/account.dto.create.space';

export class ConversionService {
  constructor(
    private accountService: AccountService,
    private spaceService: SpaceService,
    private namingService: NamingService,
    private communityService: CommunityService,
    private communityRoleService: CommunityRoleService,
    private communicationService: CommunicationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async convertChallengeToSpace(
    conversionData: ConvertSubspaceToSpaceInput,
    agentInfo: AgentInfo
  ): Promise<ISpace> {
    // TODO: needs to create a new ACCOUNT etc. NOT TRUE!
    const subspace = await this.spaceService.getSpaceOrFail(
      conversionData.subspaceID,
      {
        relations: {
          community: true,
          context: true,
          profile: true,
          collaboration: {
            callouts: {
              framing: {
                profile: {
                  tagsets: true,
                },
              },
            },
          },
          storageAggregator: true,
        },
      }
    );
    if (
      !subspace.community ||
      !subspace.context ||
      !subspace.profile ||
      !subspace.collaboration ||
      !subspace.collaboration.callouts ||
      !subspace.storageAggregator
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on subspace: ${subspace.id}`,
        LogContext.CONVERSION
      );
    }

    // Need to get the containing account for the space
    const account =
      await this.spaceService.getAccountForLevelZeroSpaceOrFail(subspace);

    // check the community is in a fit state
    const challengeCommunityLeadOrgs =
      await this.communityRoleService.getOrganizationsWithRole(
        subspace.community,
        CommunityRole.LEAD
      );
    if (challengeCommunityLeadOrgs.length !== 1) {
      throw new ValidationException(
        `A Subspace must have exactly one Lead organization to be converted to a Space: ${subspace.id} has ${challengeCommunityLeadOrgs.length}`,
        LogContext.CONVERSION
      );
    }

    const createSpaceInput: CreateSpaceOnAccountInput = {
      accountID: account.id,
      nameID: subspace.nameID,
      profileData: {
        displayName: subspace.profile.displayName,
      },
      level: SpaceLevel.SPACE,
      type: SpaceType.SPACE,
      collaborationData: {},
    };
    let space =
      await this.accountService.createSpaceOnAccount(createSpaceInput);

    space = await this.spaceService.getSpaceOrFail(space.id, {
      relations: {
        community: true,
        context: true,
        profile: true,
        collaboration: true,
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
        `Unable to locate all entities on new Space: ${space.id}`,
        LogContext.CONVERSION
      );
    }

    const userMembers = await this.communityRoleService.getUsersWithRole(
      space.community,
      CommunityRole.MEMBER
    );
    const userLeads = await this.communityRoleService.getUsersWithRole(
      space.community,
      CommunityRole.LEAD
    );
    const orgMembers = await this.communityRoleService.getOrganizationsWithRole(
      space.community,
      CommunityRole.MEMBER
    );

    // Remove the contributors from old roles
    await this.removeContributors(
      space.community,
      userMembers,
      userLeads,
      orgMembers,
      challengeCommunityLeadOrgs
    );

    await this.communityRoleService.removeUserFromRole(
      space.community,
      agentInfo.userID,
      CommunityRole.MEMBER
    );

    // Swap the communications
    await this.swapCommunication(space.community, space.community);

    // Swap the contexts
    const challengeContext = space.context;
    const spaceContext = space.context;
    space.context = challengeContext;
    space.context = spaceContext;

    // Swap the collaborations
    const challengeCollaboration = space.collaboration;
    const spaceCollaboration = space.collaboration;
    space.collaboration = challengeCollaboration;
    space.collaboration = spaceCollaboration;
    // Update display locations for callouts to use space locations
    this.updateSpaceCalloutsGroups(space.collaboration.callouts);

    // Swap the profiles
    const challengeProfile = space.profile;
    const spaceProfile = space.profile;
    space.profile = challengeProfile;
    space.profile = spaceProfile;

    // Swap the storage aggregators
    const challengeStorage = space.storageAggregator;
    const spaceStorage = space.storageAggregator;
    space.storageAggregator = challengeStorage;
    space.storageAggregator = spaceStorage;
    // and reverse the parent child relationship
    space.storageAggregator.parentStorageAggregator = space.storageAggregator;
    space.storageAggregator.parentStorageAggregator = undefined;

    // Save both + then delete the challenge (save is needed to ensure right context is deleted etc)
    await this.spaceService.save(space);
    const updatedSubspace = await this.spaceService.save(space);

    // Assign users to roles in new space
    await this.assignContributors(
      space.community,
      userMembers,
      userLeads,
      orgMembers
    );

    // Now migrate all the child subsubspaces...
    const subsubspaces = await this.spaceService.getSubspaces(updatedSubspace);
    for (const subsubspace of subsubspaces) {
      await this.convertOpportunityToChallenge(subsubspace.id, agentInfo);
    }
    // Finally delete the Challenge
    await this.spaceService.deleteSpace({
      ID: updatedSubspace.id,
    });
    return space;
  }

  async convertOpportunityToChallenge(
    subsubspaceID: string,
    agentInfo: AgentInfo
  ): Promise<ISpace> {
    const subsubspace = await this.spaceService.getSpaceOrFail(subsubspaceID, {
      relations: {
        parentSpace: {
          storageAggregator: {
            parentStorageAggregator: true,
          },
        },
        community: true,
        context: true,
        profile: true,
        storageAggregator: true,
        collaboration: {
          callouts: {
            framing: {
              profile: {
                tagsets: true,
              },
            },
          },
        },
      },
    });
    if (
      !subsubspace.parentSpace ||
      !subsubspace.parentSpace.storageAggregator ||
      !subsubspace.parentSpace.storageAggregator.parentStorageAggregator ||
      !subsubspace.community ||
      !subsubspace.context ||
      !subsubspace.profile ||
      !subsubspace.collaboration ||
      !subsubspace.storageAggregator ||
      !subsubspace.collaboration.callouts
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on Opportunity: ${subsubspace.id}`,
        LogContext.CONVERSION
      );
    }

    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInLevelZeroSpace(
        subsubspace.levelZeroSpaceID
      );
    const subspaceNameID =
      this.namingService.createNameIdAvoidingReservedNameIDs(
        `${subsubspace.nameID}`,
        reservedNameIDs
      );

    const levelZeroSpaceStorageAggregator =
      subsubspace.parentSpace.storageAggregator.parentStorageAggregator;
    const subspaceData: CreateSubspaceInput = {
      spaceID: subsubspace.parentSpace.id,
      nameID: subspaceNameID,
      collaborationData: {},
      profileData: {
        displayName: subsubspace.profile.displayName,
      },
      storageAggregatorParent: levelZeroSpaceStorageAggregator,
      level: SpaceLevel.CHALLENGE,
      type: SpaceType.CHALLENGE,
    };
    const emptyChallenge = await this.spaceService.createSubspace(
      subspaceData,
      agentInfo
    );

    const subspace = await this.spaceService.getSpaceOrFail(emptyChallenge.id, {
      relations: {
        community: true,
        context: true,
        profile: true,
        collaboration: true,
        storageAggregator: true,
      },
    });
    if (
      !subspace.community ||
      !subspace.context ||
      !subspace.profile ||
      !subspace.collaboration ||
      !subspace.storageAggregator
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on new Subspace for converting subsubspace: ${subspace.id}`,
        LogContext.CONVERSION
      );
    }

    const userMembers = await this.communityRoleService.getUsersWithRole(
      subsubspace.community,
      CommunityRole.MEMBER
    );
    const userLeads = await this.communityRoleService.getUsersWithRole(
      subsubspace.community,
      CommunityRole.LEAD
    );
    const orgMembers = await this.communityRoleService.getOrganizationsWithRole(
      subsubspace.community,
      CommunityRole.MEMBER
    );
    const orgLeads = await this.communityRoleService.getOrganizationsWithRole(
      subsubspace.community,
      CommunityRole.LEAD
    );

    // Remove the contributors from old roles
    await this.removeContributors(
      subsubspace.community,
      userMembers,
      userLeads,
      orgMembers,
      orgLeads
    );

    // also remove the current user from the members of the newly created Challenge, otherwise will end up re-assigning
    await this.communityRoleService.removeUserFromRole(
      subspace.community,
      agentInfo.userID,
      CommunityRole.MEMBER
    );
    await this.communityRoleService.removeUserFromRole(
      subspace.community,
      agentInfo.userID,
      CommunityRole.LEAD
    );

    // Swap the communication
    await this.swapCommunication(subspace.community, subsubspace.community);
    const challengeCommunityUpdated = await this.spaceService.getCommunity(
      subspace.id
    );

    // Swap the contexts
    const opportunityContext = subsubspace.context;
    const challengeContext = subspace.context;
    subspace.context = opportunityContext;
    subsubspace.context = challengeContext;

    // Swap the collaborations
    const opportunityCollaboration = subsubspace.collaboration;
    const challengeCollaboration = subspace.collaboration;
    subspace.collaboration = opportunityCollaboration;
    subsubspace.collaboration = challengeCollaboration;
    // Update display locations for callouts to use space locations
    this.updateChallengeCalloutGroups(subspace.collaboration.callouts);

    // Swap the profiles
    const opportunityProfile = subsubspace.profile;
    const challengeProfile = subspace.profile;
    subspace.profile = opportunityProfile;
    subsubspace.profile = challengeProfile;

    // Swap the storage aggregators
    // Note: need to use the opportunity storage aggregator as that is what all the profiles
    // in use within that hierarcy will be using
    const opportunityStorage = subsubspace.storageAggregator;
    const challengeStorage = subspace.storageAggregator;
    subspace.storageAggregator = opportunityStorage;
    subsubspace.storageAggregator = challengeStorage;
    // and set the parent storage aggregator on the new challenge
    if (subspace.storageAggregator) {
      subspace.storageAggregator.parentStorageAggregator =
        levelZeroSpaceStorageAggregator;
    }
    if (subsubspace.storageAggregator) {
      subsubspace.storageAggregator.parentStorageAggregator = undefined;
    }

    // Save both + then re-assign the roles
    await this.spaceService.save(subspace);
    const updatedOpportunity = await this.spaceService.save(subsubspace);
    await this.spaceService.deleteSpace({ ID: updatedOpportunity.id });

    // Assign users to roles in new challenge
    await this.assignContributors(
      challengeCommunityUpdated,
      userMembers,
      userLeads,
      orgMembers,
      orgLeads
    );

    // Add the new challenge to the space
    const space = await this.spaceService.getSpaceOrFail(
      subsubspace.levelZeroSpaceID,
      {
        relations: {
          subspaces: true,
          community: true,
        },
      }
    );
    return await this.spaceService.addSubspaceToSpace(space, subspace);
  }

  private updateSpaceCalloutsGroups(callouts: ICallout[] | undefined): void {
    if (!callouts) {
      throw new EntityNotInitializedException(
        'Callouts not defined',
        LogContext.CONVERSION
      );
    }
    for (const callout of callouts) {
      if (
        !callout.framing ||
        !callout.framing.profile ||
        !callout.framing.profile.tagsets
      ) {
        throw new EntityNotInitializedException(
          `Unable to locate all child entities on callout: ${callout.id}`,
          LogContext.CONVERSION
        );
      }

      const locationTagset = callout.framing.profile.tagsets.find(
        t => t.name === TagsetReservedName.CALLOUT_GROUP
      );
      if (!locationTagset || locationTagset.tags.length !== 1) {
        throw new EntityNotInitializedException(
          `Unable to locate all display location tagset on callout: ${callout.id}`,
          LogContext.CONVERSION
        );
      }
      const location = locationTagset.tags[0];
      switch (location) {
        case CalloutGroupName.SUBSPACES:
          locationTagset.tags = [CalloutGroupName.SUBSPACES];
          break;
        case CalloutGroupName.CONTRIBUTE:
          locationTagset.tags = [CalloutGroupName.KNOWLEDGE];
          break;
      }
    }
  }

  private updateChallengeCalloutGroups(callouts: ICallout[] | undefined): void {
    if (!callouts) {
      throw new EntityNotInitializedException(
        'Callouts not defined',
        LogContext.CONVERSION
      );
    }
    for (const callout of callouts) {
      if (
        !callout.framing ||
        !callout.framing.profile ||
        !callout.framing.profile.tagsets
      ) {
        throw new EntityNotInitializedException(
          `Unable to locate all child entities on challenge callout: ${callout.id}`,
          LogContext.CONVERSION
        );
      }

      const locationTagset = callout.framing.profile.tagsets.find(
        t => t.name === TagsetReservedName.CALLOUT_GROUP
      );
      if (!locationTagset || locationTagset.tags.length !== 1) {
        throw new EntityNotInitializedException(
          `Unable to locate all display location tagset on callout: ${callout.id}`,
          LogContext.CONVERSION
        );
      }
      const location = locationTagset.tags[0];
      switch (location) {
        case CalloutGroupName.CONTRIBUTE:
          locationTagset.tags = [CalloutGroupName.CONTRIBUTE];
          break;
        case CalloutGroupName.CONTRIBUTE:
          locationTagset.tags = [CalloutGroupName.CONTRIBUTE];
          break;
      }
    }
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
      await this.communicationService.createCommunication('temp', '');
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
      await this.communityRoleService.removeUserFromRole(
        community,
        userMember.id,
        CommunityRole.MEMBER
      );
    }
    for (const userLead of userLeads) {
      await this.communityRoleService.removeUserFromRole(
        community,
        userLead.id,
        CommunityRole.LEAD
      );
    }
    for (const orgMember of orgMembers) {
      await this.communityRoleService.removeOrganizationFromRole(
        community,
        orgMember.id,
        CommunityRole.MEMBER
      );
    }
    for (const orgLead of orgLeads) {
      await this.communityRoleService.removeOrganizationFromRole(
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
      await this.communityRoleService.assignUserToRole(
        community,
        userMember.id,
        CommunityRole.MEMBER
      );
    }
    for (const userLead of userLeads) {
      await this.communityRoleService.assignUserToRole(
        community,
        userLead.id,
        CommunityRole.LEAD
      );
    }
    for (const orgMember of orgMembers) {
      await this.communityRoleService.assignOrganizationToRole(
        community,
        orgMember.id,
        CommunityRole.MEMBER
      );
    }
    if (orgLeads) {
      for (const orgLead of orgLeads) {
        await this.communityRoleService.assignOrganizationToRole(
          community,
          orgLead.id,
          CommunityRole.LEAD
        );
      }
    }
  }
}
