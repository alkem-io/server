import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  ActorLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { OrganizationStorageAggregatorLoaderCreator } from '@core/dataloader/creators/loader.creators/community/organization.storage.aggregator.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { IProfile } from '@domain/common/profile';
import { UUID } from '@domain/common/scalars';
import { IOrganization } from '@domain/community/organization';
import { IUserGroup } from '@domain/community/user-group';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { IAccount } from '@domain/space/account/account.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IOrganizationSettings } from '../organization-settings/organization.settings.interface';
import { IOrganizationVerification } from '../organization-verification/organization.verification.interface';
import { Organization } from './organization.entity';
import { OrganizationService } from './organization.service';

@Resolver(() => IOrganization)
export class OrganizationResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private organizationService: OrganizationService,
    private groupService: UserGroupService
  ) {}

  @ResolveField('groups', () => [IUserGroup], {
    nullable: true,
    description: 'Groups defined on this organization.',
  })
  async groups(
    @Parent() parent: Organization,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IUserGroup[]> {
    // Reload to ensure the authorization is loaded
    const organization = await this.organizationService.getOrganizationOrFail(
      parent.id
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      organization.authorization,
      AuthorizationPrivilege.READ,
      `read user groups on org: ${organization.id}`
    );

    return this.organizationService.getUserGroups(organization);
  }

  @ResolveField('roleSet', () => IRoleSet, {
    nullable: false,
    description: 'The RoleSet for this Organization.',
  })
  async roleSet(@Parent() organization: IOrganization): Promise<IRoleSet> {
    return this.organizationService.getRoleSet(organization);
  }

  @ResolveField('group', () => IUserGroup, {
    nullable: true,
    description: 'Group defined on this organization.',
  })
  async group(
    @CurrentActor() actorContext: ActorContext,
    @Parent() parent: Organization,
    @Args('ID', { type: () => UUID }) groupID: string
  ): Promise<IUserGroup> {
    // Reload to ensure the authorization is loaded
    const organization = await this.organizationService.getOrganizationOrFail(
      parent.id
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
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

  @ResolveField('settings', () => IOrganizationSettings, {
    nullable: false,
    description: 'The settings for this Organization.',
  })
  settings(@Parent() organization: IOrganization): IOrganizationSettings {
    return organization.settings;
  }

  @ResolveField('account', () => IAccount, {
    nullable: true,
    description: 'The account hosted by this Organization.',
  })
  async account(
    @Parent() organization: IOrganization,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IAccount | undefined> {
    const accountVisible = this.authorizationService.isAccessGranted(
      actorContext,
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
  async profile(
    @Parent() organization: Organization,
    @Loader(ProfileLoaderCreator, {
      parentClassRef: Organization,
      checkResultPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IProfile>
  ) {
    return loader.load(organization.id);
  }

  @ResolveField('verification', () => IOrganizationVerification, {
    nullable: false,
    description: 'The verification handler for this organization.',
  })
  async verification(@Parent() organization: Organization) {
    return await this.organizationService.getVerification(organization);
  }

  @ResolveField('actor', () => IActor, {
    nullable: false,
    description: 'The Actor representing this User.',
  })
  async agent(
    @Parent() organization: Organization,
    @Loader(ActorLoaderCreator, { parentClassRef: Organization })
    loader: ILoader<IActor>
  ): Promise<IActor> {
    return loader.load(organization.id);
  }

  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: true,
    description:
      'The StorageAggregator for managing storage buckets in use by this Organization',
  })
  async storageAggregator(
    @Parent() organization: Organization,
    @Loader(OrganizationStorageAggregatorLoaderCreator, {
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IStorageAggregator>
  ): Promise<IStorageAggregator> {
    return loader.load(organization.id);
  }

  @ResolveField('metrics', () => [INVP], {
    nullable: true,
    description: 'Metrics about the activity within this Organization.',
  })
  async metrics(@Parent() organization: Organization) {
    return await this.organizationService.getMetrics(organization);
  }
}
