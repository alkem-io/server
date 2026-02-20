import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UpdateOrganizationInput } from '@domain/community/organization/dto';
import { IUserGroup } from '@domain/community/user-group';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { CreateUserGroupInput } from '../user-group/dto';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { OrganizationAuthorizationResetInput } from './dto/organization.dto.reset.authorization';
import { UpdateOrganizationSettingsInput } from './dto/organization.dto.update.settings';
import { IOrganization } from './organization.interface';
import { OrganizationService } from './organization.service';
import { OrganizationAuthorizationService } from './organization.service.authorization';

@InstrumentResolver()
@Resolver(() => IOrganization)
export class OrganizationResolverMutations {
  constructor(
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private organizationService: OrganizationService,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  @Mutation(() => IUserGroup, {
    description: 'Creates a new User Group for the specified Organization.',
  })
  async createGroupOnOrganization(
    @CurrentActor() actorContext: ActorContext,
    @Args('groupData') groupData: CreateUserGroupInput
  ): Promise<IUserGroup> {
    const organization = await this.organizationService.getOrganizationOrFail(
      groupData.parentID
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      organization.authorization,
      AuthorizationPrivilege.CREATE,
      `orgCreateGroup: ${organization.id}`
    );

    const group = await this.organizationService.createGroup(groupData);
    const authorizations =
      await this.userGroupAuthorizationService.applyAuthorizationPolicy(
        group,
        organization.authorization
      );
    await this.authorizationPolicyService.saveAll(authorizations);
    return group;
  }

  @Mutation(() => IOrganization, {
    description: 'Updates one of the Setting on an Organization',
  })
  async updateOrganizationSettings(
    @CurrentActor() actorContext: ActorContext,
    @Args('settingsData') settingsData: UpdateOrganizationSettingsInput
  ): Promise<IOrganization> {
    let organization = await this.organizationService.getOrganizationOrFail(
      settingsData.organizationID
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      organization.authorization,
      AuthorizationPrivilege.UPDATE,
      `organization settings update: ${organization.id}`
    );

    organization = await this.organizationService.updateOrganizationSettings(
      organization,
      settingsData.settings
    );
    organization = await this.organizationService.save(organization);
    // As the settings may update the authorization for the Space, the authorization policy will need to be reset

    const updatedAuthorizations =
      await this.organizationAuthorizationService.applyAuthorizationPolicy(
        organization
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return this.organizationService.getOrganizationOrFail(organization.id);
  }

  @Mutation(() => IOrganization, {
    description: 'Updates the specified Organization.',
  })
  @Profiling.api
  async updateOrganization(
    @CurrentActor() actorContext: ActorContext,
    @Args('organizationData') organizationData: UpdateOrganizationInput
  ): Promise<IOrganization> {
    const organization = await this.organizationService.getOrganizationOrFail(
      organizationData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      organization.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${organization.id}`
    );

    return await this.organizationService.updateOrganization(organizationData);
  }

  @Mutation(() => IOrganization, {
    description:
      'Reset the Authorization Policy on the specified Organization.',
  })
  @Profiling.api
  async authorizationPolicyResetOnOrganization(
    @CurrentActor() actorContext: ActorContext,
    @Args('authorizationResetData')
    authorizationResetData: OrganizationAuthorizationResetInput
  ): Promise<IOrganization> {
    const organization = await this.organizationService.getOrganizationOrFail(
      authorizationResetData.organizationID,
      {
        relations: {
          actor: {
            profile: {
              storageBucket: true,
            },
          },
        },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      organization.authorization,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization definition on organization: ${authorizationResetData.organizationID}`
    );
    const authorizations =
      await this.organizationAuthorizationService.applyAuthorizationPolicy(
        organization
      );
    await this.authorizationPolicyService.saveAll(authorizations);
    return await this.organizationService.getOrganizationOrFail(
      organization.id
    );
  }
}
