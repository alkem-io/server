import { AuthorizationPrivilege } from '@common/enums';
import { SpaceLevel } from '@common/enums/space.level';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { Space } from '@domain/space/space/space.entity';
import { SpaceService } from '@domain/space/space/space.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InjectEntityManager } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AuthResetService } from '@services/auth-reset/publisher/auth-reset.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { EntityManager } from 'typeorm';
import { AdminAuthorizationService } from './admin.authorization.service';

@InstrumentResolver()
@Resolver()
export class AdminAuthorizationResolverMutations {
  constructor(
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService,
    private authResetService: AuthResetService,
    private virtualContributorService: VirtualContributorService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private spaceService: SpaceService,
    private platformOperationsAuditService: PlatformOperationsAuditService
  ) {}

  // 027-platform-role-redesign (T080, Slice B, FR-022): the four credential
  // mutations that stood here — grant/revokeCredentialTo{User,Organization}
  // — are DELETED, and T034a's resolver-local `[GLOBAL_ADMIN]` pin goes with
  // them. That pairing is the point of the census's `retiredIn: 'B'` marker:
  // the pin existed only to keep T034's widening of PLATFORM_ROLES_ASSIGN
  // off these four, so a pin outliving its mutations would be a policy
  // object guarding nothing, and a mutation outliving its pin would be the
  // hole T034a was built to close.
  //
  // The SERVICE methods are deliberately retained on
  // `AdminAuthorizationService` — `bootstrap.service.ts` calls
  // `grantCredentialToUser` directly to seed service accounts, which is the
  // one credential-granting path that must survive Slice B (FR-013b
  // break-glass recovery depends on it). What is removed is the GraphQL
  // surface, not the capability the platform seeds itself with.
  //
  // Role assignment now happens exclusively through the assignment rule
  // engine's mutations, which is what makes the six rules — and the audit
  // trail they write — unbypassable rather than merely preferred.

  @Mutation(() => String, {
    description: 'Reset the Authorization Policy on all entities',
  })
  public async authorizationPolicyResetAll(
    @CurrentActor() actorContext: ActorContext
  ): Promise<string> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization on platform`
    );

    try {
      const result = await this.authResetService.publishResetAll();
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPolicyResetAll',
        outcome: 'success',
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPolicyResetAll',
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }

  @Mutation(() => Boolean, {
    description:
      'Ensure all access privileges for the platform roles are re-calculated',
  })
  public async authorizationPlatformRolesAccessReset(
    @CurrentActor() actorContext: ActorContext
  ): Promise<boolean> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset platformRolesAccess on all Spaces`
    );

    try {
      const spaces = await this.entityManager.find(Space, {
        where: {
          level: SpaceLevel.L0,
        },
      });
      for (const space of spaces) {
        await this.spaceService.updatePlatformRolesAccessRecursively(space);
      }
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPlatformRolesAccessReset',
        outcome: 'success',
      });
      return true;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPlatformRolesAccessReset',
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }

  @Mutation(() => IAuthorizationPolicy, {
    description:
      'Reset the specified Authorization Policy to global admin privileges',
  })
  public async authorizationPolicyResetToGlobalAdminsAccess(
    @CurrentActor() actorContext: ActorContext,
    @Args('authorizationID') authorizationID: string
  ): Promise<IAuthorizationPolicy> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    const platformPolicyUpdated =
      this.adminAuthorizationService.extendAuthorizationPolicyWithAuthorizationReset(
        platformPolicy
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicyUpdated,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization on a single authorization policy`
    );

    try {
      const result =
        await this.adminAuthorizationService.resetAuthorizationPolicy(
          authorizationID
        );
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPolicyResetToGlobalAdminsAccess',
        target: { authorizationID },
        outcome: 'success',
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPolicyResetToGlobalAdminsAccess',
        target: { authorizationID },
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }

  @Mutation(() => Boolean, {
    description: 'Refresh the Bodies of Knowledge on All VCs',
  })
  public async refreshAllBodiesOfKnowledge(
    @CurrentActor() actorContext: ActorContext
  ): Promise<boolean> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      `refresh all bodies of knowledge`
    );

    try {
      const result =
        await this.virtualContributorService.refreshAllBodiesOfKnowledge(
          actorContext
        );
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'refreshAllBodiesOfKnowledge',
        outcome: 'success',
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'refreshAllBodiesOfKnowledge',
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }
}
