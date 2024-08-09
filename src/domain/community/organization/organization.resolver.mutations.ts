import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { OrganizationService } from './organization.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import {
  UpdateOrganizationInput,
  DeleteOrganizationInput,
} from '@domain/community/organization/dto';
import { IUserGroup } from '@domain/community/user-group';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { OrganizationAuthorizationService } from './organization.service.authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { OrganizationAuthorizationResetInput } from './dto/organization.dto.reset.authorization';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IPreference, PreferenceService } from '@domain/common/preference';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { UpdateOrganizationPreferenceInput } from '@domain/community/organization/dto/organization.dto.update.preference';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { CreateUserGroupInput } from '../user-group/dto';
import { IOrganization } from './organization.interface';

@Resolver(() => IOrganization)
export class OrganizationResolverMutations {
  constructor(
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private organizationService: OrganizationService,
    private authorizationService: AuthorizationService,
    private preferenceService: PreferenceService,
    private preferenceSetService: PreferenceSetService
  ) {}

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
      `orgCreateGroup: ${organization.id}`
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
      `orgUpdate: ${organization.id}`
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
      `deleteOrg: ${organization.id}`
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
