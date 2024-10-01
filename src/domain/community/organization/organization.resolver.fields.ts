import { UseGuards } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { Organization } from './organization.entity';
import { OrganizationService } from './organization.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IOrganization } from '@domain/community/organization';
import { IUserGroup } from '@domain/community/user-group';
import { IProfile } from '@domain/common/profile';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@common/decorators';
import { IAgent } from '@domain/agent/agent';
import { UUID } from '@domain/common/scalars';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { IOrganizationVerification } from '../organization-verification/organization.verification.interface';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { IPreference } from '@domain/common/preference';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { Loader } from '@core/dataloader/decorators';
import {
  AgentLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { OrganizationStorageAggregatorLoaderCreator } from '@core/dataloader/creators/loader.creators/community/organization.storage.aggregator.loader.creator';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IAccount } from '@domain/space/account/account.interface';

@Resolver(() => IOrganization)
export class OrganizationResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private organizationService: OrganizationService,
    private groupService: UserGroupService,
    private preferenceSetService: PreferenceSetService
  ) {}

  //@AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: true,
    description: 'Groups defined on this organization.',
  })
  @Profiling.api
  async groups(
    @Parent() parent: Organization,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUserGroup[]> {
    // Reload to ensure the authorization is loaded
    const organization = await this.organizationService.getOrganizationOrFail(
      parent.id
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.READ,
      `read user groups on org: ${organization.id}`
    );

    return this.organizationService.getUserGroups(organization);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('group', () => IUserGroup, {
    nullable: true,
    description: 'Group defined on this organization.',
  })
  @Profiling.api
  async group(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() parent: Organization,
    @Args('ID', { type: () => UUID }) groupID: string
  ): Promise<IUserGroup> {
    // Reload to ensure the authorization is loaded
    const organization = await this.organizationService.getOrganizationOrFail(
      parent.id
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.READ,
      `read single usergroup on org: ${organization.id}`
    );

    const userGroup = await this.groupService.getUserGroupOrFail(groupID, {
      relations: { profile: true },
    });

    if (userGroup.profile && !userGroup.profile?.displayName) {
      return {
        ...userGroup,
        profile: {
          ...userGroup.profile,
          displayName: 'This user group has no displayName. Please set one.',
        },
      };
    }

    return userGroup;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('account', () => IAccount, {
    nullable: true,
    description: 'The account hosted by this Organization.',
  })
  async account(
    @Parent() organization: IOrganization,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IAccount | undefined> {
    const accountVisible = this.authorizationService.isAccessGranted(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.UPDATE
    );
    if (accountVisible) {
      return await this.organizationService.getAccount(organization);
    }
    return undefined;
  }

  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: true,
    description: 'The Authorization for this Organization.',
  })
  async authorization(@Parent() parent: Organization) {
    const organization = await this.organizationService.getOrganizationOrFail(
      parent.id
    );

    return organization.authorization;
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The profile for this Organization.',
  })
  @UseGuards(GraphqlGuard)
  async profile(
    @Parent() organization: Organization,
    @CurrentUser() agentInfo: AgentInfo,
    @Loader(ProfileLoaderCreator, { parentClassRef: Organization })
    loader: ILoader<IProfile>
  ) {
    const profile = await loader.load(organization.id);
    // Note: the Organization profile is public.
    // Check if the user can read the profile entity, not the actual Organization entity
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.READ,
      `read profile on Organization: ${profile.displayName}`
    );
    return profile;
  }

  @ResolveField('verification', () => IOrganizationVerification, {
    nullable: false,
    description: 'The verification handler for this organization.',
  })
  @Profiling.api
  async verification(@Parent() organization: Organization) {
    return await this.organizationService.getVerification(organization);
  }

  @ResolveField('agent', () => IAgent, {
    nullable: false,
    description: 'The Agent representing this User.',
  })
  async agent(
    @Parent() organization: Organization,
    @Loader(AgentLoaderCreator, { parentClassRef: Organization })
    loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(organization.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: true,
    description:
      'The StorageAggregator for managing storage buckets in use by this Organization',
  })
  @UseGuards(GraphqlGuard)
  async storageAggregator(
    @Parent() organization: Organization,
    @Loader(OrganizationStorageAggregatorLoaderCreator)
    loader: ILoader<IStorageAggregator>
  ): Promise<IStorageAggregator> {
    return loader.load(organization.id);
  }

  @ResolveField('metrics', () => [INVP], {
    nullable: true,
    description: 'Metrics about the activity within this Organization.',
  })
  @Profiling.api
  async metrics(@Parent() organization: Organization) {
    return await this.organizationService.getMetrics(organization);
  }

  @ResolveField('preferences', () => [IPreference], {
    nullable: false,
    description: 'The preferences for this Organization',
  })
  @UseGuards(GraphqlGuard)
  async preferences(
    @Parent() parent: Organization,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IPreference[]> {
    // Reload to ensure the authorization is loaded
    const organization = await this.organizationService.getOrganizationOrFail(
      parent.id
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.READ,
      `read preferences on org: ${organization.id}`
    );
    const preferenceSet = await this.organizationService.getPreferenceSetOrFail(
      organization.id
    );
    return this.preferenceSetService.getPreferencesOrFail(preferenceSet);
  }
}
