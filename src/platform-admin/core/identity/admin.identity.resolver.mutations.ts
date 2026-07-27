import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformUserRecordAuditService } from '@src/platform-admin/platform-user-record-audit/platform.user.record.audit.service';
import { AdminIdentityService } from './admin.identity.service';

/** T063 — A5's declared owner/legacy-reachers (T062's grant). */
const A5_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_USERS_ADMIN,
];
const A5_LEGACY_REACHERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.GLOBAL_ADMIN,
  AuthorizationCredential.GLOBAL_SUPPORT,
  AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
  AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
];

@InstrumentResolver()
@Resolver()
export class AdminIdentityResolverMutations {
  constructor(
    private adminIdentityService: AdminIdentityService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private readonly userLookupService: UserLookupService,
    private readonly platformUserRecordAuditService: PlatformUserRecordAuditService
  ) {}

  @Mutation(() => Boolean, {
    nullable: false,
    description: 'Delete a Kratos identity by ID.',
  })
  async adminIdentityDeleteKratosIdentity(
    @CurrentActor() actorContext: ActorContext,
    @Args('kratosIdentityId', { type: () => UUID })
    kratosIdentityId: string
  ): Promise<boolean> {
    // 027-platform-role-redesign (T062, A5, research D5): re-anchored off
    // PLATFORM_SETTINGS_ADMIN onto PLATFORM_USERS_ADMIN, whose Slice A
    // grant set preserves every legacy reacher of the A4/A5 user-record
    // family (platform.service.authorization.ts).
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_USERS_ADMIN,
      'adminIdentityDeleteKratosIdentity'
    );

    // Resolve the targeted user BEFORE deletion — the audit subject MUST
    // be the real target (FR-030, SC-015), and the Kratos↔user binding is
    // gone once the identity is deleted.
    const targetUser =
      await this.userLookupService.getUserByAuthenticationID(kratosIdentityId);

    const success =
      await this.adminIdentityService.deleteIdentity(kratosIdentityId);

    // T063 — single-path surface (platform-wide PLATFORM_USERS_ADMIN gate,
    // no self-service branch): every successful call is audited.
    if (success) {
      await this.platformUserRecordAuditService.recordActionForActor(
        actorContext,
        A5_INTENDED_OWNERS,
        A5_LEGACY_REACHERS,
        {
          action: 'adminIdentityDeleteKratosIdentity',
          targetUserId: targetUser?.id ?? kratosIdentityId,
          kratosIdentityId,
          outcome: 'identity_deleted',
        }
      );
    }
    return success;
  }
}
