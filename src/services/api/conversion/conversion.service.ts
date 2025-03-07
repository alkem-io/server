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
import { RoleName } from '@common/enums/role.name';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IUser } from '@domain/community/user/user.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { ICallout } from '@domain/collaboration/callout';
import { SpaceType } from '@common/enums/space.type';
import { AccountService } from '@domain/space/account/account.service';
import { SpaceService } from '@domain/space/space/space.service';
import { CreateSubspaceInput } from '@domain/space/space/dto/space.dto.create.subspace';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { SpaceLevel } from '@common/enums/space.level';
import { CommunityService } from '@domain/community/community/community.service';
import { CreateSpaceOnAccountInput } from '@domain/space/account/dto/account.dto.create.space';
import { IRoleSet } from '@domain/access/role-set';
import { RoleSetService } from '@domain/access/role-set/role.set.service';

export class ConversionService {
  constructor(
    private accountService: AccountService,
    private spaceService: SpaceService,
    private namingService: NamingService,
    private communityService: CommunityService,
    private roleSetService: RoleSetService,
    private communicationService: CommunicationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async convertChallengeToSpaceOrFail(
    conversionData: ConvertSubspaceToSpaceInput,
    agentInfo: AgentInfo
  ): Promise<ISpace | never> {
    // TODO: needs to create a new ACCOUNT etc. NOT TRUE!
    const subspace = await this.spaceService.getSpaceOrFail(
      conversionData.subspaceID,
      {
        relations: {
          community: {
            roleSet: true,
          },
          about: true,
          collaboration: {
            calloutsSet: {
              callouts: {
                framing: {
                  profile: {
                    tagsets: true,
                  },
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
      !subspace.community.roleSet ||
      !subspace.about ||
      !subspace.collaboration ||
      !subspace.collaboration.calloutsSet?.callouts ||
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
      await this.roleSetService.getOrganizationsWithRole(
        subspace.community.roleSet,
        RoleName.LEAD
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
      about: {
        profileData: {
          displayName: subspace.about.profile.displayName,
        },
      },
      level: SpaceLevel.L0,
      type: SpaceType.SPACE,
      collaborationData: {
        calloutsSetData: {},
      },
    };
    let space =
      await this.accountService.createSpaceOnAccount(createSpaceInput);

    space = await this.spaceService.getSpaceOrFail(space.id, {
      relations: {
        community: true,
        about: true,
        collaboration: true,
        storageAggregator: true,
      },
    });
    if (
      !space.community ||
      !space.about ||
      !space.collaboration ||
      !space.storageAggregator
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on new Space: ${space.id}`,
        LogContext.CONVERSION
      );
    }
    const spaceRoleSet = space.community.roleSet;

    const userMembers = await this.roleSetService.getUsersWithRole(
      spaceRoleSet,
      RoleName.MEMBER
    );
    const userLeads = await this.roleSetService.getUsersWithRole(
      spaceRoleSet,
      RoleName.LEAD
    );
    const orgMembers = await this.roleSetService.getOrganizationsWithRole(
      spaceRoleSet,
      RoleName.MEMBER
    );

    // Remove the contributors from old roles
    await this.removeContributors(
      spaceRoleSet,
      userMembers,
      userLeads,
      orgMembers,
      challengeCommunityLeadOrgs
    );

    await this.roleSetService.removeUserFromRole(
      spaceRoleSet,
      RoleName.MEMBER,
      agentInfo.userID
    );

    // Swap the communications
    await this.swapCommunication(space.community, space.community);

    // Swap the contexts
    const subspaceAbout = subspace.about;
    const spaceAbout = space.about;
    space.about = subspaceAbout;
    subspace.about = spaceAbout;

    // Swap the collaborations
    const challengeCollaboration = space.collaboration;
    const spaceCollaboration = space.collaboration;
    space.collaboration = challengeCollaboration;
    space.collaboration = spaceCollaboration;
    // Update display locations for callouts to use space locations
    this.updateSpaceCalloutsGroups(space.collaboration.calloutsSet?.callouts);

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
      spaceRoleSet,
      userMembers,
      userLeads,
      orgMembers
    );

    // Now migrate all the child subsubspaces...
    const subsubspaces = await this.spaceService.getSubspaces(updatedSubspace);
    for (const subsubspace of subsubspaces) {
      await this.convertOpportunityToChallengeOrFail(subsubspace.id, agentInfo);
    }
    // Finally delete the Challenge
    await this.spaceService.deleteSpaceOrFail({
      ID: updatedSubspace.id,
    });
    return space;
  }

  async convertOpportunityToChallengeOrFail(
    subsubspaceID: string,
    agentInfo: AgentInfo
  ): Promise<ISpace | never> {
    const subsubspace = await this.spaceService.getSpaceOrFail(subsubspaceID, {
      relations: {
        parentSpace: {
          storageAggregator: {
            parentStorageAggregator: true,
          },
        },
        community: true,
        about: true,
        storageAggregator: true,
        collaboration: {
          calloutsSet: {
            callouts: {
              framing: {
                profile: {
                  tagsets: true,
                },
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
      !subsubspace.about ||
      !subsubspace.collaboration ||
      !subsubspace.storageAggregator ||
      !subsubspace.collaboration.calloutsSet?.callouts
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
      collaborationData: {
        calloutsSetData: {},
      },
      about: {
        profileData: {
          displayName: subsubspace.about.profile.displayName,
        },
      },
      storageAggregatorParent: levelZeroSpaceStorageAggregator,
      level: SpaceLevel.L1,
      type: SpaceType.CHALLENGE,
    };
    const emptyChallenge = await this.spaceService.createSubspace(
      subspaceData,
      agentInfo
    );

    const subspace = await this.spaceService.getSpaceOrFail(emptyChallenge.id, {
      relations: {
        community: true,
        about: true,
        collaboration: true,
        storageAggregator: true,
      },
    });
    if (
      !subspace.community ||
      !subspace.about ||
      !subspace.collaboration ||
      !subspace.storageAggregator
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on new Subspace for converting subsubspace: ${subspace.id}`,
        LogContext.CONVERSION
      );
    }

    const roleSet = subsubspace.community.roleSet;
    const userMembers = await this.roleSetService.getUsersWithRole(
      roleSet,
      RoleName.MEMBER
    );
    const userLeads = await this.roleSetService.getUsersWithRole(
      roleSet,
      RoleName.LEAD
    );
    const orgMembers = await this.roleSetService.getOrganizationsWithRole(
      roleSet,
      RoleName.MEMBER
    );
    const orgLeads = await this.roleSetService.getOrganizationsWithRole(
      roleSet,
      RoleName.LEAD
    );

    // Remove the contributors from old roles
    await this.removeContributors(
      subsubspace.community.roleSet,
      userMembers,
      userLeads,
      orgMembers,
      orgLeads
    );

    // also remove the current user from the members of the newly created Challenge, otherwise will end up re-assigning
    await this.roleSetService.removeUserFromRole(
      subspace.community.roleSet,
      RoleName.MEMBER,
      agentInfo.userID
    );
    await this.roleSetService.removeUserFromRole(
      subspace.community.roleSet,
      RoleName.LEAD,
      agentInfo.userID
    );

    // Swap the communication
    await this.swapCommunication(subspace.community, subsubspace.community);
    const challengeCommunityUpdated = await this.spaceService.getCommunity(
      subspace.id
    );

    // Swap the contexts
    const subsubspaceAbout = subsubspace.about;
    const subspaceAbout = subspace.about;
    subspace.about = subsubspaceAbout;
    subsubspace.about = subspaceAbout;

    // Swap the collaborations
    const opportunityCollaboration = subsubspace.collaboration;
    const challengeCollaboration = subspace.collaboration;
    subspace.collaboration = opportunityCollaboration;
    subsubspace.collaboration = challengeCollaboration;

    // Swap the storage aggregators
    // Note: need to use the opportunity storage aggregator as that is what all the profiles
    // in use within that hierarchy will be using
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
    await this.spaceService.deleteSpaceOrFail({ ID: updatedOpportunity.id });

    // Assign users to roles in new challenge
    await this.assignContributors(
      challengeCommunityUpdated.roleSet,
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
    // And remove the old parent Communication that is no longer used
    if (parentCommunication) {
      await this.communicationService.removeCommunication(
        parentCommunication.id
      );
    }
  }

  private async removeContributors(
    roleSet: IRoleSet,
    userMembers: IUser[],
    userLeads: IUser[],
    orgMembers: IOrganization[],
    orgLeads: IOrganization[]
  ) {
    for (const userMember of userMembers) {
      await this.roleSetService.removeUserFromRole(
        roleSet,
        RoleName.MEMBER,
        userMember.id
      );
    }
    for (const userLead of userLeads) {
      await this.roleSetService.removeUserFromRole(
        roleSet,
        RoleName.LEAD,
        userLead.id
      );
    }
    for (const orgMember of orgMembers) {
      await this.roleSetService.removeOrganizationFromRole(
        roleSet,
        RoleName.MEMBER,
        orgMember.id
      );
    }
    for (const orgLead of orgLeads) {
      await this.roleSetService.removeOrganizationFromRole(
        roleSet,
        RoleName.LEAD,
        orgLead.id
      );
    }
  }

  private async assignContributors(
    roleSet: IRoleSet,
    userMembers: IUser[],
    userLeads: IUser[],
    orgMembers: IOrganization[],
    orgLeads?: IOrganization[]
  ) {
    for (const userMember of userMembers) {
      await this.roleSetService.assignUserToRole(
        roleSet,
        RoleName.MEMBER,
        userMember.id
      );
    }
    for (const userLead of userLeads) {
      await this.roleSetService.assignUserToRole(
        roleSet,
        RoleName.LEAD,
        userLead.id
      );
    }
    for (const orgMember of orgMembers) {
      await this.roleSetService.assignOrganizationToRole(
        roleSet,
        RoleName.MEMBER,
        orgMember.id
      );
    }
    if (orgLeads) {
      for (const orgLead of orgLeads) {
        await this.roleSetService.assignOrganizationToRole(
          roleSet,
          RoleName.LEAD,
          orgLead.id
        );
      }
    }
  }
}
