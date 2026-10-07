import { PRIVILEGED_SESSION_WINDOW_MS } from '@common/constants';
import { GLOBAL_POLICY_REGISTRATION_PLATFORM_USERS_ADMIN_DELETE_USER } from '@common/constants/authorization/global.policy.constants';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationRoleGlobal } from '@common/enums/authorization.credential.global';
import { LogContext } from '@common/enums/logging.context';
import { SessionRefreshRequiredException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  redactError,
  redactStack,
} from '@core/auth/oidc/revocation/oidc-session-revocation.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateOrganizationInput } from '@domain/community/organization/dto/organization.dto.create';
import { DeleteOrganizationInput } from '@domain/community/organization/dto/organization.dto.delete';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { AccountDeletionInitiatorBranch } from '@domain/community/user/account-deletion/account.deletion.blocker.service';
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
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { PlatformUserRecordAuditService } from '@src/platform-admin/platform-user-record-audit/platform.user.record.audit.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RegistrationService } from './registration.service';

/** T063 — A5's declared owner/legacy-reachers (T062's grant). */
const A5_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_USERS_ADMIN,
];
const A5_LEGACY_REACHERS: readonly AuthorizationCredential[] = [];

@InstrumentResolver()
@Resolver()
export class RegistrationResolverMutations {
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
    private notificationExternalAdapter: NotificationExternalAdapter,
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
    // Self-ness is derived server-side (actor == target), never trusted from
    // the caller — the same derivation the shared blocker predicate and the
    // freshness gate below both key off.
    const isSelf = actorContext.actorID === deleteData.ID;
    const branch: AccountDeletionInitiatorBranch = isSelf ? 'self' : 'admin';

    if (isSelf) {
      // The session-age gate: refuse before any deletion work when the calling
      // session was not established within the privileged window.
      //
      // NOTE this is a session-AGE gate, not re-authentication: it proves the
      // session is young, not that a credential was presented. See
      // alkem-io/server#6417.
      //
      // Fail CLOSED on a missing, zero or unparseable issuedAt — never treat an
      // undeterminable age as fresh. The age is also required to be
      // non-negative: a future-dated issuedAt (clock skew between the BFF and
      // this node) yields a negative age, which would otherwise slip past the
      // upper bound and satisfy the gate. Not applied on admin-on-other.
      const issuedAt = actorContext.issuedAt;
      const sessionAgeMs = issuedAt ? Date.now() - issuedAt : undefined;
      if (
        sessionAgeMs === undefined ||
        sessionAgeMs < 0 ||
        sessionAgeMs > PRIVILEGED_SESSION_WINDOW_MS
      ) {
        throw new SessionRefreshRequiredException(
          'Deleting your own account requires a recently established session',
          LogContext.AUTH
        );
      }
    }

    const user = await this.userService.getUserByIdOrFail(deleteData.ID, {
      relations: { profile: true },
    });
    // 027-platform-role-redesign (T062, A5, research D5) — dual path, and
    // T076/T077 removed one of the three branches it used to have.
    //
    // What remains: SELF-deletion, by actor-identity comparison (`isSelf`
    // above — equivalent to holding USER_SELF_MANAGEMENT resource-scoped to
    // one's own id), and PLATFORM_USERS_ADMIN, checked against the
    // resolver-local policy scoped to that credential ALONE.
    //
    // What went: the legacy-admin branch, which checked plain DELETE against a
    // hardcoded `[GLOBAL_ADMIN]` policy. It existed to keep `global-admin`
    // deleting users through the whole additive slice WITHOUT letting the root
    // rule's now-cascading DELETE (FR-004) satisfy the same branch — because A5
    // is outside SC-004's single named exception, closed at A6/A7. That hazard
    // is why the branch could never simply check `user.authorization`, and it
    // is exactly why the branch is deleted rather than re-pointed: Platform
    // Users Admin owns A5 outright now, and any second admin path here would
    // hand user deletion to a role spec row 2 explicitly denies it.
    const canDeleteAsPlatformUsersAdmin =
      this.authorizationService.isAccessGranted(
        actorContext,
        this.platformUsersAdminDeleteUserPolicy,
        AuthorizationPrivilege.PLATFORM_USERS_ADMIN
      );
    if (!isSelf && !canDeleteAsPlatformUsersAdmin) {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        this.platformUsersAdminDeleteUserPolicy,
        AuthorizationPrivilege.PLATFORM_USERS_ADMIN,
        `user delete: ${user.id}`
      );
    }

    // On the self branch the sign-in identity is always removed, overriding
    // any caller-supplied value: a surviving identity would otherwise mint a
    // fresh, empty account at the departed user's next sign-in.
    const effectiveDeleteData: DeleteUserInput = isSelf
      ? { ...deleteData, deleteIdentity: true }
      : deleteData;

    // On the self branch the initiator IS `user`, whose row is gone from
    // the primary store by the time the notification below runs — resolve
    // its payload now, from the still-loaded pre-deletion entity, so the
    // notification never has to look the (about to be) deleted initiator
    // up by id after the fact.
    const triggeredByPayload = isSelf
      ? this.notificationExternalAdapter.createUserPayloadFromUser(user)
      : undefined;

    const userDeleted =
      await this.registrationService.deleteUserWithPendingMemberships(
        effectiveDeleteData,
        branch,
        actorContext.actorID
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
    // T076/T077 (Slice B) simplified this: with the legacy-admin branch gone,
    // `platform-users-admin` is the only administrative path, so the condition
    // reduces to that one branch. It still names the branch rather than merely
    // negating `isSelf` — `resolveInitiatorRole` THROWS when the actor holds
    // no owning role, so the writer must never be invoked on a call no admin
    // branch authorized. `A5_LEGACY_REACHERS` is now empty, which is what
    // makes the FR-025 `platform_admin` carve-out unreachable here.
    const isAdministrativeDeletion = !isSelf && canDeleteAsPlatformUsersAdmin;
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

    // Best-effort: the mutation must resolve successfully regardless of
    // whether this notification can be sent (it previously wasn't — the
    // self path's post-deletion lookup of the now-gone initiator threw
    // AFTER the account was already irreversibly deleted).
    const notificationInput: NotificationInputPlatformUserRemoved = {
      triggeredBy: actorContext.actorID,
      user,
      triggeredByPayload,
    };
    try {
      await this.notificationPlatformAdapter.platformUserRemoved(
        notificationInput
      );
    } catch (error: any) {
      this.logger.error?.(
        {
          message:
            'Failed to send the platform user-removed notification; the deletion still stands',
          userID: deleteData.ID,
          error: redactError(error),
        },
        redactStack(error),
        LogContext.COMMUNITY
      );
    }
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
