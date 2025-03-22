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
import { UpdateSpacePlatformSettingsInput } from '@domain/space/space/dto/space.dto.update.platform.settings';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';

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

  async convertSpaceFromL1ToL0OrFail(
    conversionData: ConvertSubspaceToSpaceInput,
    agentInfo: AgentInfo
  ): Promise<ISpace | never> {
    const spaceL1 = await this.spaceService.getSpaceOrFail(
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
      !spaceL1.community ||
      !spaceL1.community.roleSet ||
      !spaceL1.about ||
      !spaceL1.collaboration ||
      !spaceL1.collaboration.calloutsSet?.callouts ||
      !spaceL1.storageAggregator
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on space L1: ${spaceL1.id}`,
        LogContext.CONVERSION
      );
    }

    const spaceL0Orig = await this.spaceService.getSpaceOrFail(
      spaceL1.levelZeroSpaceID,
      {
        relations: {
          account: true,
          storageAggregator: true,
        },
      }
    );
    if (!spaceL0Orig.account || !spaceL0Orig.account.storageAggregator) {
      throw new EntityNotInitializedException(
        `Unable to locate account on on space L0: ${spaceL0Orig.id}`,
        LogContext.CONVERSION
      );
    }

    // Need to get the containing account for the space
    const accountID = spaceL0Orig.account.id;
    const accountStorageAggregator = spaceL0Orig.account.storageAggregator;

    // check the community is in a fit state
    const spaceL1CommunityLeadOrgs =
      await this.roleSetService.getOrganizationsWithRole(
        spaceL1.community.roleSet,
        RoleName.LEAD
      );
    if (spaceL1CommunityLeadOrgs.length !== 1) {
      throw new ValidationException(
        `A Subspace must have exactly one Lead organization to be converted to a Space: ${spaceL1.id} has ${spaceL1CommunityLeadOrgs.length}`,
        LogContext.CONVERSION
      );
    }

    const reservedNameIDs =
      await this.namingService.getReservedNameIDsLevelZeroSpaces();
    const spaceL0NewNameID =
      this.namingService.createNameIdAvoidingReservedNameIDs(
        `${spaceL1.nameID}`,
        reservedNameIDs
      );
    const createSpaceInput: CreateSpaceOnAccountInput = {
      accountID: accountID,
      nameID: spaceL0NewNameID,
      about: {
        profileData: {
          displayName: spaceL1.about.profile.displayName,
        },
      },
      level: SpaceLevel.L0,
      type: SpaceType.SPACE,
      collaborationData: {
        calloutsSetData: {},
      },
    };
    let spaceL0 =
      await this.accountService.createSpaceOnAccount(createSpaceInput);

    spaceL0 = await this.spaceService.getSpaceOrFail(spaceL0.id, {
      relations: {
        community: true,
        about: true,
        collaboration: true,
        storageAggregator: true,
      },
    });
    if (
      !spaceL0.community ||
      !spaceL0.about ||
      !spaceL0.collaboration ||
      !spaceL0.storageAggregator
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on new Space: ${spaceL0.id}`,
        LogContext.CONVERSION
      );
    }
    const spaceL0RoleSet = spaceL0.community.roleSet;
    const spaceCommunityRoles =
      await this.getSpaceCommunityRoles(spaceL0RoleSet);

    // Remove the contributors from old roles
    await this.removeContributors(spaceL0RoleSet, spaceCommunityRoles);

    await this.roleSetService.removeUserFromRole(
      spaceL0RoleSet,
      RoleName.MEMBER,
      agentInfo.userID
    );

    // Swap the communications
    await this.swapCommunication(spaceL0.community, spaceL0.community);

    // Swap the contexts
    const spaceAboutL1 = spaceL1.about;
    const spaceAboutL0 = spaceL0.about;
    spaceL0.about = spaceAboutL1;
    spaceL1.about = spaceAboutL0;

    // Swap the collaborations
    const collaborationL1 = spaceL0.collaboration;
    const collaborationL0 = spaceL0.collaboration;
    spaceL0.collaboration = collaborationL1;
    spaceL0.collaboration = collaborationL0;

    // TODO: what about the callouts + classification?
    // Save + re-use the innovationFlow? Or tidy up after? Map the callouts by order in flow?

    // Swap the storage aggregators
    const spaceL1StorageAggregator = spaceL1.storageAggregator;
    const spaceL0StorageAggregator = spaceL0.storageAggregator;
    spaceL0.storageAggregator = spaceL1StorageAggregator;
    spaceL0.storageAggregator = spaceL0StorageAggregator;
    // and update the parent storage aggregators
    spaceL0.storageAggregator.parentStorageAggregator =
      accountStorageAggregator;
    spaceL1.storageAggregator.parentStorageAggregator = undefined;

    // Save both + then delete the challenge (save is needed to ensure right context is deleted etc)
    await this.spaceService.save(spaceL0);
    const spaceL1Updated = await this.spaceService.save(spaceL1);

    // Assign users to roles in new space
    await this.assignContributors(spaceL0RoleSet, spaceCommunityRoles);

    // Now migrate all the child L2 spaces...
    const spacesL2 = await this.spaceService.getSubspaces(spaceL1Updated);
    for (const spaceL2 of spacesL2) {
      await this.convertSpaceFromL2ToL1OrFail(spaceL2.id, agentInfo);
    }
    // Finally delete the L1 space
    await this.spaceService.deleteSpaceOrFail({
      ID: spaceL1Updated.id,
    });
    return spaceL0;
  }

  async convertSpaceFromL2ToL1OrFail(
    subsubspaceID: string,
    agentInfo: AgentInfo
  ): Promise<ISpace | never> {
    const spaceL2 = await this.spaceService.getSpaceOrFail(subsubspaceID, {
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
      !spaceL2.parentSpace ||
      !spaceL2.parentSpace.storageAggregator ||
      !spaceL2.parentSpace.storageAggregator.parentStorageAggregator ||
      !spaceL2.community ||
      !spaceL2.about ||
      !spaceL2.collaboration ||
      !spaceL2.storageAggregator ||
      !spaceL2.collaboration.calloutsSet?.callouts
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on Opportunity: ${spaceL2.id}`,
        LogContext.CONVERSION
      );
    }

    const spaceL0 = await this.spaceService.getSpaceOrFail(
      spaceL2.levelZeroSpaceID,
      {
        relations: {
          storageAggregator: true,
          community: true,
        },
      }
    );
    if (!spaceL0.storageAggregator || !spaceL0.community) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on Space L0: ${spaceL0.id}`,
        LogContext.CONVERSION
      );
    }
    const spaceL0StorageAggregator = spaceL0.storageAggregator;

    // Store the original NameID so this can be re-used later when creating the new Space
    const spaceL1NameID = spaceL2.nameID;

    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInLevelZeroSpace(
        spaceL2.levelZeroSpaceID
      );
    const spaceL2NameIDNew =
      this.namingService.createNameIdAvoidingReservedNameIDs(
        `${spaceL2.nameID}`,
        reservedNameIDs
      );

    // First update the nameID to avoid clashes
    const updateSpaceL2SettingsData: UpdateSpacePlatformSettingsInput = {
      spaceID: spaceL2.id,
      nameID: spaceL2NameIDNew,
    };
    await this.spaceService.updateSpacePlatformSettings(
      spaceL2,
      updateSpaceL2SettingsData
    );

    const createL1SpaceData: CreateSubspaceInput = {
      spaceID: spaceL0.id,
      nameID: spaceL1NameID,
      collaborationData: {
        calloutsSetData: {},
      },
      about: {
        profileData: {
          displayName: spaceL2.about.profile.displayName,
        },
      },
      storageAggregatorParent: spaceL0StorageAggregator,
      level: SpaceLevel.L1,
      type: SpaceType.CHALLENGE,
    };
    const spaceL1New = await this.spaceService.createSubspace(
      createL1SpaceData,
      agentInfo
    );

    const spaceL1 = await this.spaceService.getSpaceOrFail(spaceL1New.id, {
      relations: {
        community: true,
        about: true,
        collaboration: true,
        storageAggregator: true,
      },
    });
    if (
      !spaceL1.community ||
      !spaceL1.about ||
      !spaceL1.collaboration ||
      !spaceL1.storageAggregator
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on new L1 space for converting space L2: ${spaceL1.id}`,
        LogContext.CONVERSION
      );
    }

    const roleSetL2 = spaceL2.community.roleSet;
    const spaceCommunityRoles = await this.getSpaceCommunityRoles(roleSetL2);

    // Remove the contributors from old roles
    await this.removeContributors(roleSetL2, spaceCommunityRoles);

    // also remove the current user from the members of the newly created Challenge, otherwise will end up re-assigning
    const roleSetL1 = spaceL1.community.roleSet;
    await this.roleSetService.removeUserFromRole(
      roleSetL1,
      RoleName.MEMBER,
      agentInfo.userID
    );
    await this.roleSetService.removeUserFromRole(
      roleSetL1,
      RoleName.LEAD,
      agentInfo.userID
    );

    // Swap the communication
    await this.swapCommunication(spaceL1.community, spaceL2.community);
    const communityL1 = await this.spaceService.getCommunity(spaceL1.id);

    // Swap the contexts
    const spaceAboutL2 = spaceL2.about;
    const spaceAboutL1 = spaceL1.about;
    spaceL1.about = spaceAboutL2;
    spaceL2.about = spaceAboutL1;

    // Swap the collaborations
    const collaborationL2 = spaceL2.collaboration;
    const collaborationL1 = spaceL1.collaboration;
    spaceL1.collaboration = collaborationL2;
    spaceL2.collaboration = collaborationL1;

    // Swap the storage aggregators
    // Note: need to use the opportunity storage aggregator as that is what all the profiles
    // in use within that hierarchy will be using
    const storageAggregatorL2 = spaceL2.storageAggregator;
    const storageAggregatorL1 = spaceL1.storageAggregator;
    spaceL1.storageAggregator = storageAggregatorL2;
    spaceL2.storageAggregator = storageAggregatorL1;
    // and set the parent storage aggregator on the new challenge
    if (spaceL1.storageAggregator) {
      spaceL1.storageAggregator.parentStorageAggregator =
        spaceL0StorageAggregator;
    }
    if (spaceL2.storageAggregator) {
      spaceL2.storageAggregator.parentStorageAggregator = undefined;
    }

    // Save both + then re-assign the roles
    await this.spaceService.save(spaceL1);
    const spaceL2Updated = await this.spaceService.save(spaceL2);
    await this.spaceService.deleteSpaceOrFail({ ID: spaceL2Updated.id });

    // Assign users to roles in new challenge
    await this.assignContributors(communityL1.roleSet, spaceCommunityRoles);

    // Add the new L1 space to the L0 space
    return await this.spaceService.addSubspaceToSpace(spaceL0, spaceL1);
  }

  private async getSpaceCommunityRoles(
    roleSet: IRoleSet
  ): Promise<SpaceCommunityRoles> {
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

    const vcMembers = await this.roleSetService.getVirtualContributorsWithRole(
      roleSet,
      RoleName.MEMBER
    );
    return {
      userMembers,
      userLeads,
      orgMembers,
      orgLeads,
      vcMembers,
    };
  }

  private async swapCommunication(
    parentCommunity: ICommunity,
    childCommunity: ICommunity
  ) {
    // TODO: why not just swap?
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
    spaceCommunityRoles: SpaceCommunityRoles
  ) {
    for (const userMember of spaceCommunityRoles.userMembers) {
      await this.roleSetService.removeUserFromRole(
        roleSet,
        RoleName.MEMBER,
        userMember.id
      );
    }
    for (const userLead of spaceCommunityRoles.userLeads) {
      await this.roleSetService.removeUserFromRole(
        roleSet,
        RoleName.LEAD,
        userLead.id
      );
    }
    for (const orgMember of spaceCommunityRoles.orgMembers) {
      await this.roleSetService.removeOrganizationFromRole(
        roleSet,
        RoleName.MEMBER,
        orgMember.id
      );
    }
    for (const orgLead of spaceCommunityRoles.orgLeads) {
      await this.roleSetService.removeOrganizationFromRole(
        roleSet,
        RoleName.LEAD,
        orgLead.id
      );
    }
    for (const vcMember of spaceCommunityRoles.vcMembers) {
      await this.roleSetService.removeVirtualFromRole(
        roleSet,
        RoleName.MEMBER,
        vcMember.id
      );
    }
  }

  private async assignContributors(
    roleSet: IRoleSet,
    spaceCommunityRoles: SpaceCommunityRoles
  ) {
    for (const userMember of spaceCommunityRoles.userMembers) {
      await this.roleSetService.assignUserToRole(
        roleSet,
        RoleName.MEMBER,
        userMember.id
      );
    }
    for (const userLead of spaceCommunityRoles.userLeads) {
      await this.roleSetService.assignUserToRole(
        roleSet,
        RoleName.LEAD,
        userLead.id
      );
    }
    for (const orgMember of spaceCommunityRoles.orgMembers) {
      await this.roleSetService.assignOrganizationToRole(
        roleSet,
        RoleName.MEMBER,
        orgMember.id
      );
    }
    for (const orgLead of spaceCommunityRoles.orgLeads) {
      await this.roleSetService.assignOrganizationToRole(
        roleSet,
        RoleName.LEAD,
        orgLead.id
      );
    }
    for (const vcMember of spaceCommunityRoles.vcMembers) {
      await this.roleSetService.assignVirtualToRole(
        roleSet,
        RoleName.MEMBER,
        vcMember.id
      );
    }
  }
}

// Create a new type for usage in this service that has fields for user members + leads, org members + leads etc
export type SpaceCommunityRoles = {
  userMembers: IUser[];
  userLeads: IUser[];
  orgMembers: IOrganization[];
  orgLeads: IOrganization[];
  vcMembers: IVirtualContributor[];
};
