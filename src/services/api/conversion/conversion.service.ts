import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { ConvertSpaceL1ToSpaceL0Input } from './dto/convert.dto.space.l1.to.space.l0.input';
import { ISpace } from '@domain/space/space/space.interface';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { SpaceType } from '@common/enums/space.type';
import { SpaceService } from '@domain/space/space/space.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { SpaceLevel } from '@common/enums/space.level';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.interface';
import { PlatformService } from '@platform/platform/platform.service';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { TemplateService } from '@domain/template/template/template.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { RoleName } from '@common/enums/role.name';
import { ConvertSpaceL1ToSpaceL2Input } from './dto/convert.dto.space.l1.to.space.l2.input';
import { ConvertSpaceL2ToSpaceL1Input } from './dto/convert.dto.space.l2.to.space.l1.input';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { IUser } from '@domain/community/user/user.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { AccountHostService } from '@domain/space/account.host/account.host.service';

export class ConversionService {
  constructor(
    private spaceService: SpaceService,
    private namingService: NamingService,
    private roleSetService: RoleSetService,
    private platformService: PlatformService,
    private templateService: TemplateService,
    private templatesManagerService: TemplatesManagerService,
    private innovationFlowService: InnovationFlowService,
    private accountHostService: AccountHostService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async convertSpaceL1ToSpaceL0OrFail(
    conversionData: ConvertSpaceL1ToSpaceL0Input
  ): Promise<ISpace | never> {
    let spaceL1 = await this.spaceService.getSpaceOrFail(
      conversionData.spaceL1ID,
      {
        relations: {
          agent: true,
          community: {
            roleSet: true,
          },
          collaboration: {
            innovationFlow: true,
          },
          storageAggregator: true,
          subspaces: true,
          parentSpace: true, // Needed to be able to unset it
        },
      }
    );
    if (
      !spaceL1.community ||
      !spaceL1.community.roleSet ||
      !spaceL1.collaboration ||
      !spaceL1.collaboration.innovationFlow ||
      !spaceL1.storageAggregator ||
      !spaceL1.subspaces ||
      !spaceL1.agent
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on space L1: ${spaceL1.id}`,
        LogContext.CONVERSION
      );
    }
    const subspacesL1 = spaceL1.subspaces;
    const roleSetL1 = spaceL1.community.roleSet;
    const agentL1 = spaceL1.agent;

    const spaceL0Orig = await this.spaceService.getSpaceOrFail(
      spaceL1.levelZeroSpaceID,
      {
        relations: {
          subspaces: true,
          account: {
            storageAggregator: true,
          },
        },
      }
    );
    if (
      !spaceL0Orig.account ||
      !spaceL0Orig.account.storageAggregator ||
      !spaceL0Orig.subspaces
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on space L0: ${spaceL0Orig.id}`,
        LogContext.CONVERSION
      );
    }

    // Need to get the containing account for the space
    const account = spaceL0Orig.account;
    const storageAggregatorAccount = spaceL0Orig.account.storageAggregator;

    // Remove the admins, so that also implicit subspace admin role is removed
    const userAdmins = await this.roleSetService.getUsersWithRole(
      roleSetL1,
      RoleName.ADMIN
    );
    for (const userAdmin of userAdmins) {
      await this.roleSetService.removeUserFromRole(
        roleSetL1,
        RoleName.ADMIN,
        userAdmin.id,
        false
      );
    }

    const reservedNameIDs =
      await this.namingService.getReservedNameIDsLevelZeroSpaces();
    const spaceL0NewNameID =
      this.namingService.createNameIdAvoidingReservedNameIDs(
        `${spaceL1.nameID}`,
        reservedNameIDs
      );

    spaceL1.level = SpaceLevel.L0;
    spaceL1.nameID = spaceL0NewNameID;
    spaceL1.type = SpaceType.SPACE;
    spaceL1.levelZeroSpaceID = spaceL1.id;
    spaceL1.parentSpace = undefined; // Unfortunately this is not enough
    spaceL1.account = account;
    spaceL1.storageAggregator.parentStorageAggregator =
      storageAggregatorAccount;

    // Some fields on a Space L0 do not exist on Space L1 so we need to create them
    spaceL1.license = this.spaceService.createLicenseForSpaceL0();
    spaceL1.templatesManager =
      await this.spaceService.createTemplatesManagerForSpaceL0();

    // reset to default Space L0 innovation flow
    const resetInnovationFlowStates = await this.getInnovationFlowForSpaceL0();
    spaceL1.collaboration.innovationFlow =
      await this.innovationFlowService.updateInnovationFlowStates(
        spaceL1.collaboration.innovationFlow.id,
        resetInnovationFlowStates
      );

    spaceL1 = await this.spaceService.save(spaceL1);

    // Ensure that the license plans for new spaces are applied
    spaceL1.agent = await this.accountHostService.assignLicensePlansToSpace(
      agentL1,
      spaceL1.id,
      account.type
    );
    // Need to do the roleset update after
    await this.roleSetService.removeParentRoleSet(roleSetL1.id);
    // and add back in the admins
    for (const userAdmin of userAdmins) {
      await this.roleSetService.assignUserToRole(
        roleSetL1,
        RoleName.ADMIN,
        userAdmin.id
      );
    }

    // And remove the space from the old space L0; note that setting to undefined is not enough, need to go through the parent space
    spaceL0Orig.subspaces = spaceL0Orig.subspaces.filter(
      subspace => subspace.id !== spaceL1.id
    );
    await this.spaceService.save(spaceL0Orig);

    // Now migrate all the child L2 spaces...
    for (const spaceL2 of subspacesL1) {
      await this.convertSpaceL2ToSpaceL1OrFail({
        spaceL2ID: spaceL2.id,
      });
    }

    return spaceL1;
  }

  private async getInnovationFlowForSpaceL0(): Promise<IInnovationFlowState[]> {
    const platformTemplatesManager =
      await this.platformService.getTemplatesManagerOrFail();
    const levelZeroTemplate =
      await this.templatesManagerService.getTemplateFromTemplateDefault(
        platformTemplatesManager.id,
        TemplateDefaultType.PLATFORM_SPACE
      );
    const templateWithInnovationFlow =
      await this.templateService.getTemplateOrFail(levelZeroTemplate.id, {
        relations: {
          collaboration: {
            innovationFlow: true,
          },
        },
      });

    if (
      !templateWithInnovationFlow.collaboration ||
      !templateWithInnovationFlow.collaboration.innovationFlow
    ) {
      throw new RelationshipNotFoundException(
        `Unable to retrieve Space L0 innovation flow template: ${levelZeroTemplate.id} is missing a relation`,
        LogContext.CONVERSION
      );
    }
    return templateWithInnovationFlow.collaboration.innovationFlow.states;
  }

  async convertSpaceL2ToSpaceL1OrFail(
    conversionData: ConvertSpaceL2ToSpaceL1Input
  ): Promise<ISpace | never> {
    let spaceL2 = await this.spaceService.getSpaceOrFail(
      conversionData.spaceL2ID,
      {
        relations: {
          community: {
            roleSet: true,
          },
          storageAggregator: true,
          parentSpace: {
            storageAggregator: true,
            parentSpace: {
              storageAggregator: true,
            },
          },
        },
      }
    );
    if (
      !spaceL2.community ||
      !spaceL2.storageAggregator ||
      !spaceL2.parentSpace ||
      !spaceL2.parentSpace.storageAggregator ||
      !spaceL2.parentSpace.parentSpace
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on Space L2: ${spaceL2.id}`,
        LogContext.CONVERSION
      );
    }
    const roleSetL2 = spaceL2.community.roleSet;

    const spaceL0 = await this.spaceService.getSpaceOrFail(
      spaceL2.levelZeroSpaceID,
      {
        relations: {
          storageAggregator: true,
          community: {
            roleSet: true,
          },
        },
      }
    );
    if (
      !spaceL0.storageAggregator ||
      !spaceL0.community ||
      !spaceL0.community.roleSet
    ) {
      throw new EntityNotInitializedException(
        `Conversion L2 to L1: Unable to locate all entities on on Space L0: ${spaceL0.id}`,
        LogContext.CONVERSION
      );
    }
    const storageAggregatorL0 = spaceL0.storageAggregator;
    const roleSetL0 = spaceL0.community.roleSet;

    // Remove the admins, so that also implicit subspace admin role is removed
    const userAdmins = await this.roleSetService.getUsersWithRole(
      roleSetL2,
      RoleName.ADMIN
    );
    for (const userAdmin of userAdmins) {
      await this.roleSetService.removeUserFromRole(
        roleSetL2,
        RoleName.ADMIN,
        userAdmin.id,
        false
      );
    }

    spaceL2.level = SpaceLevel.L1;
    spaceL2.type = SpaceType.CHALLENGE;
    spaceL2.parentSpace = spaceL0;
    spaceL2.storageAggregator.parentStorageAggregator = storageAggregatorL0;
    spaceL2.community.roleSet =
      await this.roleSetService.setParentRoleSetAndCredentials(
        roleSetL2,
        roleSetL0
      );

    spaceL2 = await this.spaceService.save(spaceL2);
    // and add back in the admins
    for (const userAdmin of userAdmins) {
      await this.roleSetService.assignUserToRole(
        roleSetL2,
        RoleName.ADMIN,
        userAdmin.id
      );
    }
    return spaceL2;
  }

  async convertSpaceL1ToSpaceL2OrFail(
    conversionData: ConvertSpaceL1ToSpaceL2Input
  ): Promise<ISpace | never> {
    let spaceL1 = await this.spaceService.getSpaceOrFail(
      conversionData.spaceL1ID,
      {
        relations: {
          community: {
            roleSet: true,
          },
          storageAggregator: true,
        },
      }
    );
    if (
      !spaceL1.community ||
      !spaceL1.community.roleSet ||
      !spaceL1.storageAggregator
    ) {
      throw new EntityNotInitializedException(
        `Unable to locate all entities on on Space L1: ${spaceL1.id}`,
        LogContext.CONVERSION
      );
    }
    const roleSetL1 = spaceL1.community.roleSet;

    const parentSpaceL1 = await this.spaceService.getSpaceOrFail(
      conversionData.parentSpaceL1ID,
      {
        relations: {
          storageAggregator: true,
          community: {
            roleSet: true,
          },
        },
      }
    );
    if (
      !parentSpaceL1.storageAggregator ||
      !parentSpaceL1.community ||
      !parentSpaceL1.community.roleSet
    ) {
      throw new EntityNotInitializedException(
        `Conversion L1 to L2: Unable to locate all entities on on parent Space L1: ${parentSpaceL1.id}`,
        LogContext.CONVERSION
      );
    }

    if (spaceL1.levelZeroSpaceID !== parentSpaceL1.levelZeroSpaceID) {
      throw new ValidationException(
        'Only can convert a L1 Space to be L2 within the same L0 Space',
        LogContext.CONVERSION
      );
    }
    const storageAggregatorParentL1 = parentSpaceL1.storageAggregator;
    const roleSetParentL1 = parentSpaceL1.community.roleSet;

    const spaceCommunityRoles = await this.getSpaceCommunityRoles(roleSetL1);
    await this.removeContributors(roleSetL1, spaceCommunityRoles);

    spaceL1.level = SpaceLevel.L2;
    spaceL1.type = SpaceType.OPPORTUNITY;
    spaceL1.parentSpace = parentSpaceL1;
    spaceL1.storageAggregator.parentStorageAggregator =
      storageAggregatorParentL1;
    spaceL1.community.roleSet =
      await this.roleSetService.setParentRoleSetAndCredentials(
        roleSetL1,
        roleSetParentL1
      );

    spaceL1 = await this.spaceService.save(spaceL1);
    // and add back in the admins
    for (const userAdmin of spaceCommunityRoles.userAdmins) {
      await this.roleSetService.assignUserToRole(
        roleSetL1,
        RoleName.ADMIN,
        userAdmin.id
      );
    }
    return spaceL1;
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
    const userAdmins = await this.roleSetService.getUsersWithRole(
      roleSet,
      RoleName.ADMIN
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
      userAdmins,
      orgMembers,
      orgLeads,
      vcMembers,
    };
  }

  private async removeContributors(
    roleSet: IRoleSet,
    spaceCommunityRoles: SpaceCommunityRoles
  ) {
    const validatePolicyLimits = false;
    for (const userMember of spaceCommunityRoles.userMembers) {
      await this.roleSetService.removeUserFromRole(
        roleSet,
        RoleName.MEMBER,
        userMember.id,
        validatePolicyLimits
      );
    }
    for (const userLead of spaceCommunityRoles.userLeads) {
      await this.roleSetService.removeUserFromRole(
        roleSet,
        RoleName.LEAD,
        userLead.id,
        validatePolicyLimits
      );
    }
    for (const orgMember of spaceCommunityRoles.orgMembers) {
      await this.roleSetService.removeOrganizationFromRole(
        roleSet,
        RoleName.MEMBER,
        orgMember.id,
        validatePolicyLimits
      );
    }
    for (const orgLead of spaceCommunityRoles.orgLeads) {
      await this.roleSetService.removeOrganizationFromRole(
        roleSet,
        RoleName.LEAD,
        orgLead.id,
        validatePolicyLimits
      );
    }
    for (const vcMember of spaceCommunityRoles.vcMembers) {
      await this.roleSetService.removeVirtualFromRole(
        roleSet,
        RoleName.MEMBER,
        vcMember.id,
        validatePolicyLimits
      );
    }
  }
}

// Create a new type for usage in this service that has fields for user members + leads, org members + leads etc
type SpaceCommunityRoles = {
  userMembers: IUser[];
  userLeads: IUser[];
  userAdmins: IUser[];
  orgMembers: IOrganization[];
  orgLeads: IOrganization[];
  vcMembers: IVirtualContributor[];
};
