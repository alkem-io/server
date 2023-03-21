import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { OrganizationService } from './organization.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  DeleteOrganizationInput,
} from '@domain/community/organization/dto';
import { IUserGroup } from '@domain/community/user-group';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { OrganizationAuthorizationService } from './organization.service.authorization';
import { AgentInfo } from '@core/authentication/agent-info';
import { IUser } from '@domain/community/user/user.interface';
import { OrganizationAuthorizationResetInput } from './dto/organization.dto.reset.authorization';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { AssignOrganizationAssociateInput } from './dto/organization.dto.assign.associate';
import { RemoveOrganizationAssociateInput } from './dto/organization.dto.remove.associate';
import { RemoveOrganizationAdminInput } from './dto/organization.dto.remove.admin';
import { AssignOrganizationAdminInput } from './dto/organization.dto.assign.admin';
import { AssignOrganizationOwnerInput } from './dto/organization.dto.assign.owner';
import { RemoveOrganizationOwnerInput } from './dto/organization.dto.remove.owner';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IPreference, PreferenceService } from '@domain/common/preference';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { UpdateOrganizationPreferenceInput } from '@domain/community/organization/dto/organization.dto.update.preference';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { CreateUserGroupInput } from '../user-group/dto';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { IOrganization } from './organization.interface';

@Resolver(() => IOrganization)
export class OrganizationResolverMutations {
  constructor(
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private organizationService: OrganizationService,
    private authorizationService: AuthorizationService,
    private preferenceService: PreferenceService,
    private preferenceSetService: PreferenceSetService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description: 'Creates a new Organization on the platform.',
  })
  @Profiling.api
  async createOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('organizationData') organizationData: CreateOrganizationInput
  ): Promise<IOrganization> {
    const authorizationPolicy =
      this.platformAuthorizationService.getPlatformAuthorizationPolicy();

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.CREATE_ORGANIZATION,
      `create Organization: ${organizationData.nameID}`
    );
    const organization = await this.organizationService.createOrganization(
      organizationData,
      agentInfo
    );

    return await this.organizationAuthorizationService.applyAuthorizationPolicy(
      organization
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Creates a new User Group for the specified Organization.',
  })
  @Profiling.api
  async createGroupOnOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('groupData') groupData: CreateUserGroupInput
  ): Promise<IUserGroup> {
    const organization = await this.organizationService.getOrganizationOrFail(
      groupData.parentID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.CREATE,
      `orgCreateGroup: ${organization.nameID}`
    );

    const group = await this.organizationService.createGroup(groupData);
    return await this.userGroupAuthorizationService.applyAuthorizationPolicy(
      group,
      organization.authorization
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description: 'Updates the specified Organization.',
  })
  @Profiling.api
  async updateOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('organizationData') organizationData: UpdateOrganizationInput
  ): Promise<IOrganization> {
    const organization = await this.organizationService.getOrganizationOrFail(
      organizationData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${organization.nameID}`
    );

    return await this.organizationService.updateOrganization(organizationData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description: 'Deletes the specified Organization.',
  })
  async deleteOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteOrganizationInput
  ): Promise<IOrganization> {
    const organization = await this.organizationService.getOrganizationOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${organization.nameID}`
    );
    return await this.organizationService.deleteOrganization(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description:
      'Reset the Authorization Policy on the specified Organization.',
  })
  @Profiling.api
  async authorizationPolicyResetOnOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: OrganizationAuthorizationResetInput
  ): Promise<IOrganization> {
    const organization = await this.organizationService.getOrganizationOrFail(
      authorizationResetData.organizationID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.UPDATE, //// todo: replace with AUTHORIZATION_RESET once that has been granted
      `reset authorization definition on organization: ${authorizationResetData.organizationID}`
    );
    return await this.organizationAuthorizationService.applyAuthorizationPolicy(
      organization
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description:
      'Assigns a User as an associate of the specified Organization.',
  })
  @Profiling.api
  async assignUserToOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignOrganizationAssociateInput
  ): Promise<IOrganization> {
    const organization = await this.organizationService.getOrganizationOrFail(
      membershipData.organizationID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.GRANT,
      `assign user organization: ${organization.nameID}`
    );
    return await this.organizationService.assignMember(membershipData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description: 'Removes a User as a member of the specified Organization.',
  })
  @Profiling.api
  async removeUserFromOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveOrganizationAssociateInput
  ): Promise<IOrganization> {
    const organization = await this.organizationService.getOrganizationOrFail(
      membershipData.organizationID
    );

    // Extend the authorization policy with a credential rule to assign the GRANT privilege
    // to the user specified in the incoming mutation. Then if it is the same user as is logged
    // in then the user will have the GRANT privilege + so can carry out the mutation
    const extendedAuthorization =
      this.organizationAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
        organization,
        membershipData.userID
      );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      AuthorizationPrivilege.GRANT,
      `remove user from organization: ${organization.nameID}`
    );
    return await this.organizationService.removeAssociate(membershipData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a User as an Organization Admin.',
  })
  @Profiling.api
  async assignUserAsOrganizationAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignOrganizationAdminInput
  ): Promise<IUser> {
    const organization = await this.organizationService.getOrganizationOrFail(
      membershipData.organizationID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.GRANT,
      `assign user organization admin: ${organization.nameID}`
    );
    return await this.organizationService.assignOrganizationAdmin(
      membershipData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from being an Organization Admin.',
  })
  @Profiling.api
  async removeUserAsOrganizationAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveOrganizationAdminInput
  ): Promise<IUser> {
    const organization = await this.organizationService.getOrganizationOrFail(
      membershipData.organizationID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.GRANT,
      `remove user organization admin: ${organization.nameID}`
    );
    return await this.organizationService.removeOrganizationAdmin(
      membershipData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a User as an Organization Owner.',
  })
  @Profiling.api
  async assignUserAsOrganizationOwner(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignOrganizationOwnerInput
  ): Promise<IUser> {
    const organization = await this.organizationService.getOrganizationOrFail(
      membershipData.organizationID
    );
    // todo: what additional logic check do we want on the granting of org owner?
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.GRANT,
      `assign user organization owner: ${organization.nameID}`
    );
    return await this.organizationService.assignOrganizationOwner(
      membershipData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from being an Organization Owner.',
  })
  @Profiling.api
  async removeUserAsOrganizationOwner(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveOrganizationOwnerInput
  ): Promise<IUser> {
    const organization = await this.organizationService.getOrganizationOrFail(
      membershipData.organizationID
    );
    // todo: what additional logic check do we want on the granting of org owner?
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.GRANT,
      `remove user organization admin: ${organization.nameID}`
    );
    return await this.organizationService.removeOrganizationOwner(
      membershipData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPreference, {
    description: 'Updates one of the Preferences on an Organization',
  })
  @Profiling.api
  async updatePreferenceOnOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('preferenceData') preferenceData: UpdateOrganizationPreferenceInput
  ) {
    const organization = await this.organizationService.getOrganizationOrFail(
      preferenceData.organizationID
    );
    const preferenceSet = await this.organizationService.getPreferenceSetOrFail(
      organization.id
    );

    const preference = await this.preferenceSetService.getPreferenceOrFail(
      preferenceSet,
      preferenceData.type
    );
    this.preferenceService.validatePreferenceTypeOrFail(
      preference,
      PreferenceDefinitionSet.ORGANIZATION
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      preference.authorization,
      AuthorizationPrivilege.UPDATE,
      `organization preference update: ${preference.id}`
    );
    const preferenceUpdated = await this.preferenceService.updatePreference(
      preference,
      preferenceData.value
    );
    // As the preferences may update the authorization, the authorization policy will need to be reset
    await this.organizationAuthorizationService.applyAuthorizationPolicy(
      organization
    );
    return preferenceUpdated;
  }
}
