import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { OrganizationFilterInput } from '@core/filtering/input-types/organization.filter.input';
import { UserFilterInput } from '@core/filtering/input-types/user.filter.input';
import { PaginatedOrganization } from '@core/pagination/paginated.organization';
import { PaginatedUsers } from '@core/pagination/paginated.user';
import { PaginationArgs } from '@core/pagination/pagination.args';
import { ContributorQueryArgs } from '@domain/actor/actor/dto/actor.query.args';
import { IVirtualAssistant } from '@domain/community/virtual-assistant/virtual.assistant.interface';
import { VirtualAssistantService } from '@domain/community/virtual-assistant/virtual.assistant.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { SpacesQueryArgs } from '@domain/space/space/dto/space.args.query.spaces';
import { ISpace } from '@domain/space/space/space.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPacksInput } from '@library/library/dto/library.dto.innovationPacks.input';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { CurrentActor } from '@src/common/decorators';
import { PlatformAdminCommunicationQueryResults } from './dto/platform.admin.query.communication.results';
import { PlatformAdminIdentityQueryResults } from './dto/platform.admin.query.identity.results';
import { PlatformAdminQueryResults } from './dto/platform.admin.query.results';
import { PlatformAdminService } from './platform.admin.service';

@Resolver(() => PlatformAdminQueryResults)
export class PlatformAdminResolverFields {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private platformAdminService: PlatformAdminService,
    private virtualAssistantService: VirtualAssistantService
  ) {}

  /**
   * 027-platform-role-redesign (live finding F6) — the admin console's
   * INVENTORY READS, as opposed to the A-row actions taken on what they list.
   *
   * Every field below gated on the legacy `PLATFORM_ADMIN` catch-all, whose
   * grant set is {global-admin, global-support, global-license-manager}. None
   * of the thirteen new roles holds it — by design, that is the whole point of
   * the decomposition — so a Platform Users Admin admitted to `/admin/users`
   * by the client's own route guard was denied the list the page is made of
   * (observed live 2026-08-10: `platformAdminUsersList` → "unable to grant
   * 'platform-admin' privilege: platformAdmin Users"). The client was
   * re-anchored onto the per-family privileges (spec-clientweb-5, and
   * `useVisibleAdminSections.ts`); the server's matching read surfaces were
   * not, and the mismatch is exactly the width of this helper.
   *
   * Additive: `PLATFORM_ADMIN` stays FIRST in every list, so no legacy holder
   * loses a list, and the thrown message still names it when nothing matches.
   * The alternative — granting the catch-all itself to the new roles — would
   * hand each of them `grantCredentialToActor`, the forum and the Wingback
   * subscription mutations along with it. Read affordances only; every action
   * inside these sections keeps its own gate.
   */
  private async grantAnyOrFail(
    actorContext: ActorContext,
    privileges: readonly AuthorizationPrivilege[],
    msg: string
  ): Promise<void> {
    const policy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();

    for (const privilege of privileges.slice(1)) {
      if (
        this.authorizationService.isAccessGranted(
          actorContext,
          policy,
          privilege
        )
      ) {
        return;
      }
    }

    // None of the alternatives matched — fail on the primary privilege, so the
    // error message and the thrown exception's `privilege` field stay the ones
    // this surface has always reported.
    this.authorizationService.grantAccessOrFail(
      actorContext,
      policy,
      privileges[0],
      msg
    );
  }

  @ResolveField(() => [IAccount], {
    nullable: false,
    description:
      'Retrieve all Accounts on the Platform. This is only available to Platform Admins.',
  })
  async accounts(
    @CurrentActor() actorContext: ActorContext
  ): Promise<IAccount[]> {
    await this.grantAnyOrFail(
      actorContext,
      [
        AuthorizationPrivilege.PLATFORM_ADMIN,
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
      ],
      'platformAdmin Accounts'
    );

    return this.platformAdminService.getAllAccounts();
  }

  @ResolveField(() => [IInnovationHub], {
    nullable: false,
    description:
      'Retrieve all Innovation Hubs on the Platform. This is only available to Platform Admins.',
  })
  async innovationHubs(
    @CurrentActor() actorContext: ActorContext
  ): Promise<IInnovationHub[]> {
    await this.grantAnyOrFail(
      actorContext,
      [
        AuthorizationPrivilege.PLATFORM_ADMIN,
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
        // R-F.2 (2026-09-16): Support's console list read — see `organizations`.
        AuthorizationPrivilege.PLATFORM_SUPPORT_LISTS_READ,
      ],
      'platformAdmin InnovationHubs'
    );

    return this.platformAdminService.getAllInnovationHubs();
  }

  @ResolveField(() => [IInnovationPack], {
    nullable: false,
    description:
      'Retrieve all Innovation Packs on the Platform. This is only available to Platform Admins.',
  })
  async innovationPacks(
    @CurrentActor() actorContext: ActorContext,
    @Args('queryData', { type: () => InnovationPacksInput, nullable: true })
    args?: InnovationPacksInput
  ): Promise<IInnovationPack[]> {
    await this.grantAnyOrFail(
      actorContext,
      [
        AuthorizationPrivilege.PLATFORM_ADMIN,
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
        // R-F.2 (2026-09-16): Support's console list read — see `organizations`.
        AuthorizationPrivilege.PLATFORM_SUPPORT_LISTS_READ,
      ],
      'platformAdmin InnovationPacks'
    );

    return this.platformAdminService.getAllInnovationPacks(args);
  }

  @ResolveField(() => [ISpace], {
    nullable: false,
    description:
      'Retrieve all Spaces on the Platform. This is only available to Platform Admins.',
  })
  async spaces(
    @CurrentActor() actorContext: ActorContext,
    @Args() args: SpacesQueryArgs
  ): Promise<ISpace[]> {
    await this.grantAnyOrFail(
      actorContext,
      [
        AuthorizationPrivilege.PLATFORM_ADMIN,
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
        // 027 R-F.3 (2026-09-18, licensing-section-design.md) — the License
        // Manager's half of F1. It owns plan assignment on spaces (A12) and
        // space visibility (A14), but those privileges are anchored on the
        // space and licensing-framework trees; on THIS policy it held nothing,
        // so it could not list what it licenses. A dedicated platform-level
        // READ admits it to the three lists whose rows it acts on — spaces,
        // organizations, users — and to no other field here. Each row's
        // action still meets its own A12/A14 gate.
        AuthorizationPrivilege.PLATFORM_LICENSING_LISTS_READ,
      ],
      'platformAdmin Spaces'
    );

    return this.platformAdminService.getAllSpaces(args);
  }

  @ResolveField(() => PaginatedUsers, {
    nullable: false,
    description:
      'Retrieve all Users on the Platform. This is only available to Platform Admins.',
  })
  async users(
    @CurrentActor() actorContext: ActorContext,
    @Args() pagination: PaginationArgs,
    @Args({
      name: 'withTags',
      nullable: true,
      description: 'Return only users with tags',
    })
    withTags?: boolean,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ): Promise<PaginatedUsers> {
    await this.grantAnyOrFail(
      actorContext,
      [
        AuthorizationPrivilege.PLATFORM_ADMIN,
        AuthorizationPrivilege.PLATFORM_USERS_ADMIN,
        // R-F.3 (2026-09-18): License Manager's console list read — see
        // `spaces`. Safe on the USERS list only because `User.email` / `phone`
        // keep their own per-field READ_USER_PII gate (user.resolver.fields.ts).
        AuthorizationPrivilege.PLATFORM_LICENSING_LISTS_READ,
      ],
      'platformAdmin Users'
    );

    return this.platformAdminService.getAllUsers(pagination, withTags, filter);
  }

  @ResolveField(() => PaginatedOrganization, {
    nullable: false,
    description:
      'Retrieve all Organizations on the Platform. This is only available to Platform Admins.',
  })
  async organizations(
    @CurrentActor() actorContext: ActorContext,
    @Args() pagination: PaginationArgs,
    @Args('status', {
      nullable: true,
      description: 'Return only Organizations with this verification status',
      type: () => OrganizationVerificationEnum,
    })
    status?: OrganizationVerificationEnum,
    @Args('filter', { nullable: true }) filter?: OrganizationFilterInput
  ): Promise<PaginatedOrganization> {
    await this.grantAnyOrFail(
      actorContext,
      [
        AuthorizationPrivilege.PLATFORM_ADMIN,
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
        // 027 R-F.2 (2026-09-16, research D29) — the other half of F6. Platform
        // Support owns the organization lifecycle (A6) and org-owned pack/hub
        // edits (A7), but its privileges are anchored on the organization and
        // account trees; on THIS policy it held nothing, so it could not find
        // what it services. A dedicated platform-level READ admits it to the
        // three lists whose rows it acts on — organizations, packs, hubs — and
        // to no other field here. Each row's action still meets its own gate.
        AuthorizationPrivilege.PLATFORM_SUPPORT_LISTS_READ,
        // R-F.3 (2026-09-18): License Manager's console list read — see `spaces`.
        AuthorizationPrivilege.PLATFORM_LICENSING_LISTS_READ,
      ],
      'platformAdmin Organizations'
    );
    return this.platformAdminService.getAllOrganizations(
      pagination,
      filter,
      status
    );
  }

  @ResolveField(() => [IVirtualContributor], {
    nullable: false,
    description:
      'Retrieve all Virtual Contributors on the Platform. This is only available to Platform Admins.',
  })
  async virtualContributors(
    @CurrentActor() actorContext: ActorContext,
    @Args() args: ContributorQueryArgs
  ): Promise<IVirtualContributor[]> {
    await this.grantAnyOrFail(
      actorContext,
      [
        AuthorizationPrivilege.PLATFORM_ADMIN,
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
      ],
      'platformAdmin Virtual Contributors'
    );

    return this.platformAdminService.getAllVirtualContributors(args);
  }

  @ResolveField(() => IVirtualAssistant, {
    nullable: false,
    description:
      'The singleton virtual-assistant actor, including its current admin capability grant and ID. This is only available to Platform Admins, and is the discovery path for updateAssistantActorCapabilities.',
  })
  async virtualAssistant(
    @CurrentActor() actorContext: ActorContext
  ): Promise<IVirtualAssistant> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin VirtualAssistant'
    );

    return this.virtualAssistantService.getSingletonOrFail({
      relations: { profile: true },
    });
  }

  @ResolveField(() => PlatformAdminCommunicationQueryResults, {
    nullable: false,
    description: 'Lookup Communication related information.',
  })
  async communication(
    @CurrentActor() actorContext: ActorContext
  ): Promise<PlatformAdminCommunicationQueryResults> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin Communication'
    );
    return {} as PlatformAdminCommunicationQueryResults;
  }

  @ResolveField(() => PlatformAdminIdentityQueryResults, {
    nullable: false,
    description: 'Lookup Identity related information.',
  })
  async identity(
    @CurrentActor() actorContext: ActorContext
  ): Promise<PlatformAdminIdentityQueryResults> {
    await this.grantAnyOrFail(
      actorContext,
      [
        AuthorizationPrivilege.PLATFORM_ADMIN,
        AuthorizationPrivilege.PLATFORM_USERS_ADMIN,
      ],
      'platformAdmin Identity'
    );
    return {} as PlatformAdminIdentityQueryResults;
  }
}
