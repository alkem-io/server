import { GLOBAL_POLICY_ADMIN_IDENTITY_DELETE_KRATOS } from '@common/constants/authorization/global.policy.constants';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformUserRecordAuditService } from '@src/platform-admin/platform-user-record-audit/platform.user.record.audit.service';
import { AdminIdentityService } from './admin.identity.service';

/** T063 — A5's declared owner (T062's grant). */
const A5_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_USERS_ADMIN,
];

@InstrumentResolver()
@Resolver()
export class AdminIdentityResolverMutations {
  /** Irreversible Kratos identity deletion is checked against THIS
   * resolver-local, hardcoded policy (the owning role alone) rather than the
   * shared platform policy, so a later widening of the shared
   * `PLATFORM_USERS_ADMIN` grant set cannot reach it. */
  private identityDeletePolicy: IAuthorizationPolicy;

  constructor(
    private adminIdentityService: AdminIdentityService,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private readonly userLookupService: UserLookupService,
    private readonly platformUserRecordAuditService: PlatformUserRecordAuditService
  ) {
    const policy = new AuthorizationPolicy(AuthorizationPolicyType.IN_MEMORY);
    const rule =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_USERS_ADMIN],
        [AuthorizationCredential.PLATFORM_USERS_ADMIN],
        GLOBAL_POLICY_ADMIN_IDENTITY_DELETE_KRATOS
      );
    this.identityDeletePolicy =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        policy,
        [rule]
      );
  }

  @Mutation(() => Boolean, {
    nullable: false,
    description: 'Delete a Kratos identity by ID.',
  })
  async adminIdentityDeleteKratosIdentity(
    @CurrentActor() actorContext: ActorContext,
    @Args('kratosIdentityId', { type: () => UUID })
    kratosIdentityId: string
  ): Promise<boolean> {
    // 027-platform-role-redesign (T062, A5, research D5) — sec-server-4
    // fix: re-anchored off PLATFORM_SETTINGS_ADMIN onto PLATFORM_USERS_ADMIN
    // (the owning role), checked against `identityDeletePolicy` — NOT the
    // shared platform policy.
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      this.identityDeletePolicy,
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
