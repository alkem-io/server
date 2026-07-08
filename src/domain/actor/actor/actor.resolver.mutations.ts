import { CurrentActor } from '@common/decorators';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CredentialType } from '@common/enums/credential.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RoleSetCacheService } from '@domain/access/role-set/role.set.service.cache';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { UUID } from '@domain/common/scalars';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ActorService } from './actor.service';

/**
 * Space role credentials whose direct grant/revoke must invalidate the
 * role-set membership caches: isMember() / membership-status reads are
 * cache-first, so a credential mutation without invalidation leaves stale
 * answers (e.g. a re-application blocked with ROLE_SET_ALREADY_MEMBER after
 * an admin revoked the membership credential).
 */
const SPACE_ROLE_CREDENTIAL_TYPES: CredentialType[] = [
  AuthorizationCredential.SPACE_MEMBER,
  AuthorizationCredential.SPACE_ADMIN,
  AuthorizationCredential.SPACE_LEAD,
  AuthorizationCredential.SPACE_SUBSPACE_ADMIN,
  AuthorizationCredential.SPACE_MEMBER_INVITEE,
];

@Resolver()
export class ActorResolverMutations {
  constructor(
    private readonly actorService: ActorService,
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService,
    private readonly communityResolverService: CommunityResolverService,
    private readonly roleSetCacheService: RoleSetCacheService
  ) {}

  @Mutation(() => ICredential, {
    description: 'Grant a credential to an Actor.',
  })
  async grantCredentialToActor(
    @CurrentActor() actorContext: ActorContext,
    @Args('actorID', { type: () => UUID }) actorID: string,
    @Args('credentialType', { type: () => CredentialType })
    credentialType: CredentialType,
    @Args('resourceID', { type: () => UUID, nullable: true })
    resourceID?: string
  ): Promise<ICredential> {
    // Granting credentials requires platform admin access
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'grantCredentialToActor mutation'
    );

    const credential = await this.actorService.grantCredentialOrFail(actorID, {
      type: credentialType,
      resourceID: resourceID ?? '',
    });
    await this.cleanRoleSetMembershipCache(actorID, credentialType, resourceID);
    return credential;
  }

  @Mutation(() => Boolean, {
    description: 'Revoke a credential from an Actor.',
  })
  async revokeCredentialFromActor(
    @CurrentActor() actorContext: ActorContext,
    @Args('actorID', { type: () => UUID }) actorID: string,
    @Args('credentialType', { type: () => CredentialType })
    credentialType: CredentialType,
    @Args('resourceID', { type: () => UUID, nullable: true })
    resourceID?: string
  ): Promise<boolean> {
    // Revoking credentials requires platform admin access
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'revokeCredentialFromActor mutation'
    );

    const revoked = await this.actorService.revokeCredential(actorID, {
      type: credentialType,
      resourceID,
    });
    await this.cleanRoleSetMembershipCache(actorID, credentialType, resourceID);
    return revoked;
  }

  /**
   * Best-effort role-set membership-cache invalidation after a direct
   * credential grant/revoke on a Space. Never fails the mutation — the
   * credential write is the source of truth; cache TTL is the fallback.
   */
  private async cleanRoleSetMembershipCache(
    actorID: string,
    credentialType: CredentialType,
    resourceID?: string
  ): Promise<void> {
    if (!resourceID) {
      return;
    }
    if (!SPACE_ROLE_CREDENTIAL_TYPES.includes(credentialType)) {
      return;
    }
    try {
      const roleSetId =
        await this.communityResolverService.getRoleSetIdForSpace(resourceID);
      if (roleSetId) {
        await this.roleSetCacheService.cleanActorMembershipCache(
          actorID,
          roleSetId
        );
      }
    } catch {
      // best-effort only; cache TTL expiry is the fallback
    }
  }
}
