import { CurrentActor } from '@common/decorators';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { OrganizationAssociateEligibilityReason } from '@common/enums/organization.associate.eligibility.reason';
import { getEmailDomain } from '@common/utils';
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
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { IProfile } from '@domain/common/profile';
import { UUID } from '@domain/common/scalars';
import { IOrganization } from '@domain/community/organization';
import { IUserGroup } from '@domain/community/user-group';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { IAccount } from '@domain/space/account/account.interface';
import {
  HostedResourcesViewerScope,
  IAccountHostedResources,
} from '@domain/space/account/dto/account.hosted.resources';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IOrganizationSettings } from '../organization-settings/organization.settings.interface';
import { IOrganizationVerification } from '../organization-verification/organization.verification.interface';
import { IOrganizationAssociateEligibility } from './dto/organization.associate.eligibility.dto';
import { isDomainJoinEligible } from './organization.domain.join.policy';
import { Organization } from './organization.entity';
import { OrganizationService } from './organization.service';

const ORGANIZATION_ASSOCIATION_CREDENTIALS: AuthorizationCredential[] = [
  AuthorizationCredential.ORGANIZATION_ASSOCIATE,
  AuthorizationCredential.ORGANIZATION_ADMIN,
  AuthorizationCredential.ORGANIZATION_OWNER,
];

@Resolver(() => IOrganization)
export class OrganizationResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private organizationService: OrganizationService,
    private groupService: UserGroupService,
    private roleSetService: RoleSetService,
    private userLookupService: UserLookupService,
    private accountLookupService: AccountLookupService
  ) {}

  /**
   * The viewer-relative "what may I do on this organization" signal (FR-016):
   * apply, join directly, respond to a pending invitation, wait on a pending
   * application, or nothing (already an associate / not authenticated).
   * Never throws — absence is expressed through `reason`, not an error, so a
   * profile page render never fails because of this field. The mutation
   * side (`joinRoleSet`, `applyForEntryRoleOnRoleSet`) re-checks eligibility
   * independently; this field is advisory for the interface only.
   */
  @ResolveField(
    'myAssociateEligibility',
    () => IOrganizationAssociateEligibility,
    {
      nullable: false,
      description:
        "The viewer's eligibility to apply to, or join, this organization as an associate.",
    }
  )
  async myAssociateEligibility(
    @Parent() parent: Organization,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IOrganizationAssociateEligibility> {
    const notEligible = (
      reason: OrganizationAssociateEligibilityReason
    ): IOrganizationAssociateEligibility => ({
      canApply: false,
      canJoinDirectly: false,
      reason,
    });

    if (!actorContext.actorID || actorContext.isAnonymous) {
      return notEligible(
        OrganizationAssociateEligibilityReason.NOT_AUTHENTICATED
      );
    }

    const organization = await this.organizationService.getOrganizationOrFail(
      parent.id,
      { relations: { roleSet: true, verification: true } }
    );
    if (!organization.roleSet) {
      return notEligible(
        OrganizationAssociateEligibilityReason.NOT_AUTHENTICATED
      );
    }

    const membershipStatus =
      await this.roleSetService.getMembershipStatusByActorContext(
        actorContext,
        organization.roleSet
      );
    if (membershipStatus === CommunityMembershipStatus.MEMBER) {
      return notEligible(
        OrganizationAssociateEligibilityReason.ALREADY_ASSOCIATE
      );
    }
    if (membershipStatus === CommunityMembershipStatus.INVITATION_PENDING) {
      return notEligible(
        OrganizationAssociateEligibilityReason.INVITATION_PENDING
      );
    }
    if (membershipStatus === CommunityMembershipStatus.APPLICATION_PENDING) {
      return notEligible(
        OrganizationAssociateEligibilityReason.APPLICATION_PENDING
      );
    }

    const user = await this.userLookupService.getUserByIdOrFail(
      actorContext.actorID
    );
    const domainEligibility = isDomainJoinEligible(
      organization,
      getEmailDomain(user.email)
    );
    const allowApplications =
      organization.settings?.membership?.allowApplications ?? true;
    const applyGranted = this.authorizationService.isAccessGranted(
      actorContext,
      organization.roleSet.authorization,
      AuthorizationPrivilege.ROLESET_ENTRY_ROLE_APPLY
    );
    const canApply = allowApplications && applyGranted;

    if (domainEligibility.eligible) {
      return {
        canApply,
        canJoinDirectly: true,
        reason: OrganizationAssociateEligibilityReason.ELIGIBLE_TO_JOIN,
      };
    }
    if (!allowApplications) {
      return notEligible(
        OrganizationAssociateEligibilityReason.APPLICATIONS_NOT_ACCEPTED
      );
    }
    if (!applyGranted) {
      return notEligible(
        OrganizationAssociateEligibilityReason.APPLY_NOT_GRANTED
      );
    }
    return {
      canApply: true,
      canJoinDirectly: false,
      reason: OrganizationAssociateEligibilityReason.ELIGIBLE_TO_APPLY,
    };
  }

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
    const account = await this.organizationService.getAccount(organization);
    return this.canSeeFullAccount(organization, actorContext, account)
      ? account
      : undefined;
  }

  // The resources hosted by this Organization's account as the current viewer
  // may see them: PUBLIC Virtual Contributors and Innovation Packs to every
  // registered viewer, ACCOUNT ones also to the organization's associates,
  // admins and owners, HIDDEN ones only to its admins and owners and to the
  // viewers who can see the account itself, and every Innovation Hub. Null for
  // anonymous viewers. Intended for single-profile reads only.
  @ResolveField('hostedResources', () => IAccountHostedResources, {
    nullable: true,
    description:
      'Viewer-scoped hosted resources, null if anonymous. Single-profile use.',
  })
  async hostedResources(
    @Parent() organization: IOrganization,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IAccountHostedResources | null> {
    // No privilege decorator on purpose: every registered viewer must get an
    // answer, scoped to what they may see. The enforcement point is the
    // domain filter in AccountLookupService, driven by the scope computed
    // here; anonymous viewers get nothing.
    if (!actorContext.actorID || actorContext.isAnonymous) {
      return null;
    }
    const account = await this.organizationService.getAccount(organization);
    const scope: HostedResourcesViewerScope = this.canSeeFullAccount(
      organization,
      actorContext,
      account
    )
      ? 'FULL'
      : this.isOrganizationAssociate(organization, actorContext)
        ? 'ORGANIZATION_ASSOCIATE'
        : 'REGISTERED';
    return this.accountLookupService.getHostedResourcesForViewer(
      account.id,
      scope
    );
  }

  /**
   * Whether the actor may see this organization's account itself: holders
   * of UPDATE on the organization (its admins and owners), or a platform
   * role holding its own privilege on the account (see
   * `accountOpenToPlatformRole`).
   */
  private canSeeFullAccount(
    organization: IOrganization,
    actorContext: ActorContext,
    account: IAccount
  ): boolean {
    return (
      this.authorizationService.isAccessGranted(
        actorContext,
        organization.authorization,
        AuthorizationPrivilege.UPDATE
      ) || this.accountOpenToPlatformRole(actorContext, account)
    );
  }

  /**
   * Whether the actor is associated with this organization, recognised by
   * the same organization-scoped credentials its READ rule uses (associate,
   * admin or owner) — read from the request's actor context, so the answer
   * follows the current association on every request.
   */
  private isOrganizationAssociate(
    organization: IOrganization,
    actorContext: ActorContext
  ): boolean {
    return actorContext.credentials.some(
      credential =>
        ORGANIZATION_ASSOCIATION_CREDENTIALS.includes(
          credential.type as AuthorizationCredential
        ) && credential.resourceID === organization.id
    );
  }

  // The Platform License Manager assigns plans to organization accounts but
  // is no organization admin, and the Resource Admin accepts
  // account-transfer targets but is no organization admin either — both
  // hold their real privilege on the account's OWN policy, not on the
  // organization's. Open the account when the actor holds
  // ACCOUNT_LICENSE_MANAGE or TRANSFER_RESOURCE_ACCEPT on it. READ is
  // deliberately excluded: accounts grant READ to anonymous and registered
  // users, so checking it here would expose every account id to anyone.
  private accountOpenToPlatformRole(
    actorContext: ActorContext,
    account: IAccount
  ): boolean {
    return (
      !!account.authorization &&
      [
        AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE,
        AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT,
      ].some(privilege =>
        this.authorizationService.isAccessGranted(
          actorContext,
          account.authorization!,
          privilege
        )
      )
    );
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
