import {
  GLOBAL_POLICY_REGISTRATION_LEGACY_ADMIN_DELETE_USER,
  GLOBAL_POLICY_REGISTRATION_PLATFORM_USERS_ADMIN_DELETE_USER,
} from '@common/constants/authorization/global.policy.constants';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationRoleGlobal } from '@common/enums/authorization.credential.global';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateOrganizationInput } from '@domain/community/organization/dto/organization.dto.create';
import { DeleteOrganizationInput } from '@domain/community/organization/dto/organization.dto.delete';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { CreateUserInput } from '@domain/community/user/dto/user.dto.create';
import { DeleteUserInput } from '@domain/community/user/dto/user.dto.delete';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { NotificationInputPlatformUserRemoved } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.user.removed';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { PlatformUserRecordAuditService } from '@src/platform-admin/platform-user-record-audit/platform.user.record.audit.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RegistrationService } from './registration.service';

/** T063 — A5's declared owner/legacy-reachers (T062's grant). */
const A5_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_USERS_ADMIN,
];
const A5_LEGACY_REACHERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.GLOBAL_ADMIN,
  AuthorizationCredential.GLOBAL_SUPPORT,
  AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
];

@InstrumentResolver()
@Resolver()
export class RegistrationResolverMutations {
  /** spec-server-1 follow-through fix: `deleteUser`'s legacy-admin branch of
   * its A5 dual-path gate checks DELETE against THIS resolver-local,
   * hardcoded [GLOBAL_ADMIN] policy — NOT `user.authorization` — because
   * the root content rule (FR-004, ninth analyze pass) now cascades DELETE
   * platform-wide to `platform-content-full-access` too, and A5 is outside
   * SC-004's single named exception (closed at A6/A7 only). Checking the
   * merged, cascaded `user.authorization` for plain DELETE would let a
   * Content Full Access holder delete any user account. Self-deletion is
   * handled separately, by actor-identity comparison, never through this
   * policy. */
  private legacyGlobalAdminDeleteUserPolicy: IAuthorizationPolicy;

  /** sec-server-4 fix: `deleteUser`'s admin branch checks PLATFORM_USERS_ADMIN
   * against THIS resolver-local policy — scoped to `PLATFORM_USERS_ADMIN`
   * ALONE, no legacy credentials — rather than `user.authorization`, whose
   * PLATFORM_USERS_ADMIN grant set is additively widened (A4's email-change
   * legacy reachers) to also admit global-support/global-license-manager/
   * global-platform-manager. None of the three ever held deleteUser
   * pre-feature (only GLOBAL_ADMIN, via the separate legacy-admin branch
   * above, and self). */
  private platformUsersAdminDeleteUserPolicy: IAuthorizationPolicy;

  constructor(
    private notificationPlatformAdapter: NotificationPlatformAdapter,
    private registrationService: RegistrationService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private accountAuthorizationService: AccountAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private readonly platformUserRecordAuditService: PlatformUserRecordAuditService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.legacyGlobalAdminDeleteUserPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.GLOBAL_ADMIN],
        [AuthorizationPrivilege.DELETE],
        GLOBAL_POLICY_REGISTRATION_LEGACY_ADMIN_DELETE_USER
      );
    this.platformUsersAdminDeleteUserPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.PLATFORM_USERS_ADMIN],
        [AuthorizationPrivilege.PLATFORM_USERS_ADMIN],
        GLOBAL_POLICY_REGISTRATION_PLATFORM_USERS_ADMIN_DELETE_USER
      );
  }

  @Mutation(() => IUser, {
    description: 'Creates a new User on the platform.',
  })
  async createUser(
    @CurrentActor() actorContext: ActorContext,
    @Args('userData') userData: CreateUserInput
  ): Promise<IUser> {
    const authorization =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      actorContext,
      authorization,
      AuthorizationPrivilege.CREATE,
      `create new User: ${actorContext.actorID}`
    );

    // Create the user entity
    const user = await this.userService.createUser(userData);

    // Finalize: authorization + invitations + notification (same path as registerNewUser)
    await this.registrationService.finalizeUserRegistration(user);

    return await this.userService.getUserByIdOrFail(user.id);
  }

  @Mutation(() => IOrganization, {
    description: 'Creates a new Organization on the platform.',
  })
  async createOrganization(
    @CurrentActor() actorContext: ActorContext,
    @Args('organizationData') organizationData: CreateOrganizationInput
  ): Promise<IOrganization> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();

    await this.authorizationService.grantAccessOrFail(
      actorContext,
      authorizationPolicy,
      AuthorizationPrivilege.CREATE_ORGANIZATION,
      `create Organization: ${organizationData.nameID}`
    );
    const organization = await this.organizationService.createOrganization(
      organizationData,
      actorContext
    );
    const organizationAuthorizations =
      await this.organizationAuthorizationService.applyAuthorizationPolicy(
        organization
      );
    await this.authorizationPolicyService.saveAll(organizationAuthorizations);

    const organizationAccount =
      await this.organizationService.getAccount(organization);
    const accountAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(
        organizationAccount
      );
    await this.authorizationPolicyService.saveAll(accountAuthorizations);

    return await this.organizationService.getOrganizationOrFail(
      organization.id
    );
  }

  @Mutation(() => IUser, {
    description: 'Deletes the specified User.',
  })
  @Profiling.api
  async deleteUser(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteUserInput
  ): Promise<IUser> {
    const user = await this.userService.getUserByIdOrFail(deleteData.ID, {
      relations: { profile: true },
    });
    // 027-platform-role-redesign (T062, A5, research D5): dual-path — off
    // the DELETE-cascade (today's sole admin path is GLOBAL_ADMIN via the
    // root policy's cascade), onto PLATFORM_USERS_ADMIN (T060's per-user
    // grant, user.service.authorization.ts) additively. Plain DELETE is
    // NOT dropped: it is also how a user deletes their OWN account
    // (USER_SELF_MANAGEMENT, resource-scoped to that user's own ID) — that
    // self-service path must keep working, so this is additive, not a
    // replacement.
    //
    // spec-server-1 follow-through fix: self-deletion is now checked by
    // actor-identity comparison (equivalent to holding USER_SELF_MANAGEMENT,
    // which every user is granted resource-scoped to their own id), and the
    // legacy-admin path checks DELETE against `legacyGlobalAdminDeleteUserPolicy`
    // — NOT `user.authorization` — so that Content Full Access's now-cascaded
    // (FR-004) DELETE on the user tree cannot satisfy this branch. A5 is
    // outside SC-004's single named exception (closed at A6/A7 only).
    const isSelfDelete = actorContext.actorID === user.id;
    const canDeleteAsLegacyAdmin = this.authorizationService.isAccessGranted(
      actorContext,
      this.legacyGlobalAdminDeleteUserPolicy,
      AuthorizationPrivilege.DELETE
    );
    const canDeleteAsSelfOrLegacyAdmin = isSelfDelete || canDeleteAsLegacyAdmin;
    // sec-server-4 fix: checked against `platformUsersAdminDeleteUserPolicy`
    // (PLATFORM_USERS_ADMIN alone) — NOT `user.authorization`, whose
    // PLATFORM_USERS_ADMIN grant set additively admits global-support/
    // global-license-manager/global-platform-manager too (A4's legacy
    // reachers), none of which ever held deleteUser pre-feature.
    const canDeleteAsPlatformUsersAdmin =
      this.authorizationService.isAccessGranted(
        actorContext,
        this.platformUsersAdminDeleteUserPolicy,
        AuthorizationPrivilege.PLATFORM_USERS_ADMIN
      );
    if (!canDeleteAsSelfOrLegacyAdmin && !canDeleteAsPlatformUsersAdmin) {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        this.legacyGlobalAdminDeleteUserPolicy,
        AuthorizationPrivilege.DELETE,
        `user delete: ${user.id}`
      );
    }
    const userDeleted =
      await this.registrationService.deleteUserWithPendingMemberships(
        deleteData
      );
    // T063/FR-018a: a self-service deletion is not an administrative action
    // and is not audited. Every OTHER deletion is.
    //
    // spec-server-27 fix (2026-07-31): this used to read
    // `if (canDeleteAsPlatformUsersAdmin)`, which silently excluded the
    // legacy `global-admin` branch — **the normal path for the whole of
    // Slice A**, since no human holds `platform-users-admin` until they are
    // granted it by hand (FR-012 does not migrate assignments). The result
    // was that the single most destructive administrative action on the
    // platform was recorded nowhere for the entire additive window, directly
    // contradicting FR-018.
    //
    // The writer was always able to attribute this: `A5_LEGACY_REACHERS`
    // exists for exactly this case and `resolveInitiatorRole` maps it to
    // `PlatformAuditInitiatorRole.PLATFORM_ADMIN` (the FR-025 legacy
    // carve-out). Only the resolver's condition was wrong.
    //
    // The condition names both branches rather than negating `isSelfDelete`
    // alone: `resolveInitiatorRole` THROWS when the actor holds neither an
    // owning role nor a legacy credential, so the writer must never be
    // invoked on a call no admin branch authorized.
    const isAdministrativeDeletion =
      !isSelfDelete &&
      (canDeleteAsPlatformUsersAdmin || canDeleteAsLegacyAdmin);
    if (isAdministrativeDeletion) {
      await this.platformUserRecordAuditService.recordActionForActor(
        actorContext,
        A5_INTENDED_OWNERS,
        A5_LEGACY_REACHERS,
        {
          action: 'deleteUser',
          targetUserId: user.id,
          outcome: 'identity_deleted',
        }
      );
    }
    // Send the notification
    const notificationInput: NotificationInputPlatformUserRemoved = {
      triggeredBy: actorContext.actorID,
      user,
    };
    await this.notificationPlatformAdapter.platformUserRemoved(
      notificationInput
    );
    return userDeleted;
  }

  @Mutation(() => IOrganization, {
    description: 'Deletes the specified Organization.',
  })
  async deleteOrganization(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteOrganizationInput
  ): Promise<IOrganization> {
    const organization = await this.organizationService.getOrganizationOrFail(
      deleteData.ID
    );
    // 027-platform-role-redesign (T041, A6, research D5, FR-007(e)): DUAL
    // PATH — the organization's own owner keeps ordinary DELETE (FR-023),
    // the platform role (platform-support) reaches the same mutation
    // through its own DELETE_ORGANIZATION privilege
    // (organization.service.authorization.ts, T039). Neither check alone is
    // sufficient; either satisfies the mutation. Void without T036 having
    // narrowed the root rule to exclude DELETE — see that file's comment.
    const canDeleteAsOwner = this.authorizationService.isAccessGranted(
      actorContext,
      organization.authorization,
      AuthorizationPrivilege.DELETE
    );
    const canDeleteAsPlatformSupport =
      this.authorizationService.isAccessGranted(
        actorContext,
        organization.authorization,
        AuthorizationPrivilege.DELETE_ORGANIZATION
      );
    if (!canDeleteAsOwner && !canDeleteAsPlatformSupport) {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        organization.authorization,
        AuthorizationPrivilege.DELETE,
        `deleteOrg: ${organization.id}`
      );
    }
    return await this.registrationService.deleteOrganizationWithPendingMemberships(
      deleteData
    );
  }
}
