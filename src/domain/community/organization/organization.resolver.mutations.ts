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
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IPreference, PreferenceService } from '@domain/common/preference';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { UpdateOrganizationPreferenceInput } from '@domain/community/organization/dto/organization.dto.update.preference';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { CreateUserGroupInput } from '../user-group/dto';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { IOrganization } from './organization.interface';
import { RemoveOrganizationRoleFromUserInput } from './dto/organization.dto.remove.role.from.user';
import { AssignOrganizationRoleToUserInput } from './dto/organization.dto.assign.role.to.user';
import { OrganizationRole } from '@common/enums/organization.role';

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
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();

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
      authorizationResetData.organizationID,
      {
        relations: {
          profile: {
            storageBucket: true,
          },
        },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization definition on organization: ${authorizationResetData.organizationID}`
    );
    return await this.organizationAuthorizationService.applyAuthorizationPolicy(
      organization
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns an Organization Role to user.',
  })
  @Profiling.api
  async assignOrganizationRoleToUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignOrganizationRoleToUserInput
  ): Promise<IUser> {
    const organization = await this.organizationService.getOrganizationOrFail(
      membershipData.organizationID
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.GRANT,
      `assign organization role to user: ${organization.nameID} - ${membershipData.role}`
    );
    return await this.organizationService.assignOrganizationRoleToUser(
      membershipData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes Organization Role from user.',
  })
  @Profiling.api
  async removeOrganizationRoleFromUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveOrganizationRoleFromUserInput
  ): Promise<IUser> {
    const organization = await this.organizationService.getOrganizationOrFail(
      membershipData.organizationID
    );
    let authorization = organization.authorization;
    if (membershipData.role === OrganizationRole.ASSOCIATE) {
      // Extend the authorization policy with a credential rule to assign the GRANT privilege
      // to the user specified in the incoming mutation. Then if it is the same user as is logged
      // in then the user will have the GRANT privilege + so can carry out the mutation
      authorization =
        this.organizationAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
          organization,
          membershipData.userID
        );
    }
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.GRANT,
      `remove user organization role from user: ${organization.nameID} - ${membershipData.role}`
    );
    return await this.organizationService.removeOrganizationRoleFromUser(
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
