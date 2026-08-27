import { parseSupportedEligibleLanguages } from '@common/constants/supported.languages';
import { LogContext } from '@common/enums/logging.context';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { RoleName } from '@common/enums/role.name';
import { RelationshipNotFoundException } from '@common/exceptions';
import { UserNotVerifiedException } from '@common/exceptions/user/user.not.verified.exception';
import { getEmailDomain } from '@common/utils';
import {
  redactError,
  redactStack,
} from '@core/auth/oidc/revocation/oidc-session-revocation.service';
import { KratosSessionData } from '@core/authentication/kratos.session';
import { ApplicationService } from '@domain/access/application/application.service';
import { CreateInvitationInput } from '@domain/access/invitation/dto/invitation.dto.create';
import { IInvitation } from '@domain/access/invitation/invitation.interface';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { InvitationAuthorizationService } from '@domain/access/invitation/invitation.service.authorization';
import { IPlatformInvitation } from '@domain/access/invitation.platform/platform.invitation.interface';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IOrganization } from '@domain/community/organization';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { AccountDeletionAuditService } from '@domain/community/user/account-deletion/account.deletion.audit.service';
import { AccountDeletionInitiatorBranch } from '@domain/community/user/account-deletion/account.deletion.blocker.service';
import { DeleteUserInput } from '@domain/community/user/dto/user.dto.delete';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { AccountService } from '@domain/space/account/account.service';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { NotificationInputPlatformUserRegistered } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.user.registered';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';

export class RegistrationService {
  constructor(
    private accountService: AccountService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private accountAuthorizationService: AccountAuthorizationService,
    private organizationLookupService: OrganizationLookupService,
    private organizationService: OrganizationService,
    private platformInvitationService: PlatformInvitationService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private invitationService: InvitationService,
    private applicationService: ApplicationService,
    private roleSetService: RoleSetService,
    private notificationPlatformAdapter: NotificationPlatformAdapter,
    private accountDeletionAuditService: AccountDeletionAuditService,
    private fileServiceAdapter: FileServiceAdapter,
    private storageBucketService: StorageBucketService,
    private configService: ConfigService<AlkemioConfig, true>,
    @InjectEntityManager('default') private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async registerNewUser(kratosData: KratosSessionData): Promise<IUser> {
    if (!kratosData.emailVerified) {
      throw new UserNotVerifiedException(
        `User '${kratosData.email}' not verified`,
        LogContext.COMMUNITY
      );
    }

    const user = await this.userService.createUser(
      {
        email: kratosData.email,
        firstName: kratosData.firstName ?? '',
        lastName: kratosData.lastName ?? '',
        profileData: {
          displayName:
            `${kratosData.firstName ?? ''} ${kratosData.lastName ?? ''}`.trim() ||
            kratosData.email.split('@')[0],
        },
      },
      kratosData
    );

    // New user - finalize registration
    await this.assignUserToOrganizationByDomain(user);
    const finalizedUser = await this.finalizeUserRegistration(user);

    return finalizedUser;
  }

  /**
   * Finalizes user registration by applying authorization and processing pending invitations.
   * This should be called after user entity creation, regardless of the creation path.
   */
  public async finalizeUserRegistration(user: IUser): Promise<IUser> {
    // Grant essential credentials to the user
    const userWithCredentials =
      await this.userAuthorizationService.grantCredentialsAllUsersReceive(
        user.id
      );

    // Apply and save user authorization policy
    const userAuthorizations =
      await this.userAuthorizationService.applyAuthorizationPolicy(
        userWithCredentials.id
      );
    await this.authorizationPolicyService.saveAll(userAuthorizations);

    // Apply and save account authorization policy
    const userAccount = await this.userService.getAccount(userWithCredentials);
    const accountAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(
        userAccount
      );
    await this.authorizationPolicyService.saveAll(accountAuthorizations);

    // Process any pending invitations for this user
    await this.processPendingInvitations(userWithCredentials);

    // Send notification that user profile was created
    await this.sendUserCreatedNotification(userWithCredentials);

    this.logger.verbose?.(
      `Finalized registration for user: ${user.id}`,
      LogContext.AUTH
    );

    return userWithCredentials;
  }

  private async sendUserCreatedNotification(user: IUser): Promise<void> {
    const notificationInput: NotificationInputPlatformUserRegistered = {
      triggeredBy: user.id,
      userID: user.id,
    };
    await this.notificationPlatformAdapter.platformUserProfileCreated(
      notificationInput
    );
  }

  async assignUserToOrganizationByDomain(user: IUser): Promise<boolean> {
    const userEmailDomain = getEmailDomain(user.email);

    const org = await this.organizationLookupService.getOrganizationByDomain(
      userEmailDomain,
      {
        relations: {
          roleSet: true,
          verification: true,
        },
      }
    );

    if (!org) {
      this.logger.verbose?.(
        `Organization matching user's domain '${userEmailDomain}' not found.`,
        LogContext.COMMUNITY
      );
      return false;
    }

    const orgSettings = org.settings;

    const orgMatchDomain =
      orgSettings.membership.allowUsersMatchingDomainToJoin;
    if (!orgMatchDomain) {
      this.logger.verbose?.(
        `Organization '${org.id}' setting 'allowUsersMatchingDomainToJoin is disabled`,
        LogContext.COMMUNITY
      );
      return false;
    }

    if (!org.verification || !org.roleSet) {
      throw new RelationshipNotFoundException(
        `Unable to load roleSet of Verification for Organization for matching user domain ${org.id}`,
        LogContext.COMMUNITY
      );
    }
    if (
      org.verification.status !==
      OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION
    ) {
      this.logger.verbose?.(
        `Organization '${org.id}' not verified`,
        LogContext.COMMUNITY
      );
      return false;
    }

    await this.roleSetService.assignActorToRole(
      org.roleSet,
      RoleName.ASSOCIATE,
      user.id
    );

    this.logger.verbose?.(
      `User ${user.id} successfully added to Organization '${org.id}'`,
      LogContext.COMMUNITY
    );
    return true;
  }

  public async processPendingInvitations(user: IUser): Promise<IInvitation[]> {
    const platformInvitations =
      await this.platformInvitationService.findPlatformInvitationsForUser(
        user.email
      );

    // Seed language from the latest-created platform invitation that carries an
    // eligible suggested language (latest-created wins).
    // Must run before the loop so the settings update is complete before any
    // invitation authorization writes (no interleaving issue — both are in the
    // same synchronous processPendingInvitations call).
    await this.seedLanguageFromInvitation(user, platformInvitations);

    const roleSetInvitations: IInvitation[] = [];
    for (const platformInvitation of platformInvitations) {
      const roleSet = platformInvitation.roleSet;
      if (!roleSet) {
        this.logger.error?.(
          `Platform invitation ${platformInvitation.id} has no role set`,
          LogContext.COMMUNITY
        );
        continue;
      }

      const invitationInput: CreateInvitationInput = {
        invitedActorID: user.id,
        roleSetID: roleSet.id,
        createdBy: platformInvitation.createdBy,
        extraRoles: platformInvitation.roleSetExtraRoles,
        invitedToParent: platformInvitation.roleSetInvitedToParent,
      };
      let invitation =
        await this.roleSetService.createInvitationExistingActor(
          invitationInput
        );
      invitation.invitedToParent = platformInvitation.roleSetInvitedToParent;

      invitation = await this.invitationService.save(invitation);
      const authorization =
        await this.invitationAuthorizationService.applyAuthorizationPolicy(
          invitation,
          roleSet.authorization
        );
      await this.authorizationPolicyService.save(authorization);

      roleSetInvitations.push(invitation);

      await this.platformInvitationService.recordProfileCreated(
        platformInvitation
      );
    }
    return roleSetInvitations;
  }

  /**
   * Seeds the new account's language setting from the latest-created platform
   * invitation that carries an eligible suggestedLanguage.
   *
   * Rules:
   * - Only seeds when the account still has {language: null, languageOfferAnswered: false}
   *   (a fresh account that has not yet had a language written by any other path).
   * - Eligible = currently configured language.eligible list; an invitation whose
   *   suggestedLanguage is no longer eligible is silently skipped.
   * - Among the invitations that pass eligibility, the latest-created (highest
   *   createdDate) wins.
   * - Writing language also latches languageOfferAnswered = true via
   *   UserSettingsService.updateSettings.
   */
  private async seedLanguageFromInvitation(
    user: IUser,
    platformInvitations: IPlatformInvitation[]
  ): Promise<void> {
    // Ensure the settings relation is loaded.  grantCredentialsAllUsersReceive
    // (called earlier in finalizeUserRegistration) fetches the user with no
    // relations, so user.settings is undefined on the real production path —
    // User.settings is declared eager:false (user.entity.ts).  Reload with the
    // relation when it is missing so the guard below operates on real data, not
    // on an absent proxy.
    let settingsUser = user;
    if (!settingsUser.settings) {
      settingsUser = await this.userService.getUserByIdOrFail(user.id, {
        relations: { settings: true },
      });
    }

    // Only seed for a truly fresh account (null language + flag false).
    if (
      !settingsUser.settings ||
      settingsUser.settings.language !== null ||
      settingsUser.settings.languageOfferAnswered !== false
    ) {
      return;
    }

    const languageConfig = this.configService.get('language', { infer: true });
    // Use the shared helper so the eligible set here matches Config.language.eligible
    // and the compose-time RoleSetEligibleLanguageGuard, and unsupported values are
    // filtered out: a stored suggestion that is not in SUPPORTED_INTERFACE_LANGUAGES is
    // silently skipped rather than passed to updateUserSettings, which rejects
    // unsupported languages.
    const eligible = parseSupportedEligibleLanguages(languageConfig?.eligible);

    if (eligible.length === 0) {
      // Kill switch: empty eligible set — no seeding.
      return;
    }

    // Sort by createdDate descending to get the latest-created invitation first
    // (latest-created with an eligible suggestion wins).
    const sorted = [...platformInvitations].sort((a, b) => {
      const aTime = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const bTime = b.createdDate ? new Date(b.createdDate).getTime() : 0;
      return bTime - aTime;
    });

    for (const invitation of sorted) {
      const lang = invitation.suggestedLanguage;
      if (lang && eligible.includes(lang)) {
        // Found the latest-created eligible suggestion — seed and latch.
        // Use settingsUser (which has settings loaded) so updateUserSettings
        // can read user.settings without hitting an undefined dereference.
        await this.userService.updateUserSettings(settingsUser, {
          language: lang,
          // languageOfferAnswered is automatically latched by updateSettings
        });
        this.logger.verbose?.(
          `Seeded language '${lang}' from platform invitation for user ${settingsUser.id}`,
          LogContext.COMMUNITY
        );
        return;
      }
    }
  }

  /**
   * The account-deletion saga: one genuine transaction spanning invitations,
   * applications, the user tree, and the account tree — an interrupted
   * deletion leaves every one of those fully intact, never half-gone — plus
   * a primary audit record written atomically with it. `branch` came from
   * the resolver's actor==target derivation and decides which blocker set
   * and exception shape apply (self also blocks on sole organization
   * ownership; see `AccountDeletionBlockerService`) and which initiator role
   * the audit trail records.
   *
   * Slower external legs — session revocation, Kratos identity removal,
   * stored-file bytes — run AFTER this commits, each best-effort and each
   * individually appended to the audit trail; none of them can fail the
   * mutation.
   */
  async deleteUserWithPendingMemberships(
    deleteData: DeleteUserInput,
    branch: AccountDeletionInitiatorBranch
  ): Promise<IUser> {
    const userID = deleteData.ID;
    const initiatorRole =
      branch === 'self'
        ? PlatformAuditInitiatorRole.SELF
        : PlatformAuditInitiatorRole.PLATFORM_ADMIN;

    const user = await this.userService.getUserByIdOrFail(userID);
    const account = await this.userService.getAccount(user);

    const { deletedUser, documentIDs, storageBucketIDs } =
      await this.entityManager.transaction(async em => {
        const invitations =
          await this.invitationService.findInvitationsForActor(userID);
        for (const invitation of invitations) {
          await this.invitationService.deleteInvitation(
            { ID: invitation.id },
            em
          );
        }

        const applications =
          await this.applicationService.findApplicationsForUser(userID);
        for (const application of applications) {
          await this.applicationService.deleteApplication(
            { ID: application.id },
            em
          );
        }

        const userResult = await this.userService.deleteUserDbOnly(
          deleteData,
          em,
          branch
        );
        const accountResult =
          await this.accountService.deleteAccountOrFailForAccountDeletion(
            account,
            em
          );
        const documentIDs = [
          ...userResult.documentIDs,
          ...accountResult.documentIDs,
        ];
        const storageBucketIDs = [
          ...userResult.storageBucketIDs,
          ...accountResult.storageBucketIDs,
        ];

        await this.accountDeletionAuditService.writePrimary(em, {
          subjectUserId: userID,
          initiatorRole,
          accountID: account.id,
          externalSubscriptionID: account.externalSubscriptionID ?? null,
          documentCount: documentIDs.length,
        });

        return { deletedUser: userResult.user, documentIDs, storageBucketIDs };
      });

    await this.runPostCommitDeletionLegs(
      deletedUser,
      deleteData,
      initiatorRole,
      documentIDs,
      storageBucketIDs
    );

    return deletedUser;
  }

  /**
   * Post-commit external legs for a completed account deletion — session
   * revocation, Kratos identity removal, stored-file bytes — each
   * best-effort and each individually appended to the audit trail. A
   * failure here is recorded, logged, and NEVER re-thrown: by the time this
   * runs, the primary-store deletion has already committed and the mutation
   * must still report success (FR-017). The whole body runs inside an
   * outer guard (see the wrapping `runPostCommitDeletionLegs`) so even an
   * unexpected failure in the itemized guards below — not just the legs
   * they wrap — can never escape as a user-visible error.
   */
  private async runPostCommitDeletionLegsGuarded(
    deletedUser: IUser,
    deleteData: DeleteUserInput,
    initiatorRole: PlatformAuditInitiatorRole,
    documentIDs: string[],
    storageBucketIDs: string[]
  ): Promise<void> {
    const userID = deleteData.ID;

    const legOutcomes = await this.userService.revokeUserSessionsAndIdentity(
      deletedUser,
      deleteData
    );

    await this.accountDeletionAuditService.appendLegOutcome(
      userID,
      initiatorRole,
      legOutcomes.sessionRevocationSucceeded
        ? PlatformAuditOutcome.SESSION_REVOCATION_COMPLETED
        : PlatformAuditOutcome.SESSION_INVALIDATION_FAILED
    );

    if (legOutcomes.identityDeletionAttempted) {
      await this.accountDeletionAuditService.appendLegOutcome(
        userID,
        initiatorRole,
        legOutcomes.identityDeletionSucceeded
          ? PlatformAuditOutcome.IDENTITY_DELETION_COMPLETED
          : PlatformAuditOutcome.IDENTITY_DELETION_FAILED
      );
    }

    if (documentIDs.length > 0) {
      const failures: string[] = [];
      const failedDocumentIDs: string[] = [];
      for (const documentID of documentIDs) {
        try {
          await this.fileServiceAdapter.deleteDocument(documentID);
        } catch (error: any) {
          failures.push(redactError(error));
          failedDocumentIDs.push(documentID);
          this.logger.error?.(
            {
              message:
                'Failed to delete document bytes during account deletion; the deletion still stands',
              userID,
              documentID,
              error: redactError(error),
            },
            redactStack(error),
            LogContext.STORAGE_BUCKET
          );
        }
      }

      // `fileExternalIDs` names exactly which documents' bytes survive a
      // degraded file-service: the `file` rows that named them are removed
      // right below (via the bucket-row cascade), so this audit row is the
      // only durable identifier an operator can reconcile from.
      await this.accountDeletionAuditService.appendLegOutcome(
        userID,
        initiatorRole,
        failures.length === 0
          ? PlatformAuditOutcome.FILE_BYTES_CLEANUP_COMPLETED
          : PlatformAuditOutcome.FILE_BYTES_CLEANUP_FAILED,
        failures.length === 0
          ? undefined
          : {
              error: failures.slice(0, 3).join('; ').slice(0, 250),
              fileExternalIDs: failedDocumentIDs,
            }
      );
    }

    // Finalize the now-emptied storage bucket rows, once every document
    // above has actually gone through the Go file-service delete (never
    // through this ORM — see
    // `StorageBucketService.deleteStorageBucketForAccountDeletion`). Each
    // bucket is independently best-effort: a stray bucket row left behind
    // by a transient failure here never blocks the deletion that already
    // committed.
    for (const storageBucketID of storageBucketIDs) {
      try {
        await this.storageBucketService.removeStorageBucketRowForAccountDeletion(
          storageBucketID
        );
      } catch (error: any) {
        this.logger.error?.(
          {
            message:
              'Failed to remove an emptied storage bucket row during account deletion; the deletion still stands',
            userID,
            storageBucketID,
            error: redactError(error),
          },
          redactStack(error),
          LogContext.STORAGE_BUCKET
        );
      }
    }
  }

  /**
   * Entry point for the post-commit external legs: wraps
   * `runPostCommitDeletionLegsGuarded` in a final catch-all so that even a
   * failure the itemized per-leg guards don't anticipate — e.g. the audit
   * write itself rejecting — is recorded and swallowed rather than
   * propagating out of an already-committed deletion (FR-017, FR-019).
   */
  private async runPostCommitDeletionLegs(
    deletedUser: IUser,
    deleteData: DeleteUserInput,
    initiatorRole: PlatformAuditInitiatorRole,
    documentIDs: string[],
    storageBucketIDs: string[]
  ): Promise<void> {
    try {
      await this.runPostCommitDeletionLegsGuarded(
        deletedUser,
        deleteData,
        initiatorRole,
        documentIDs,
        storageBucketIDs
      );
    } catch (error: any) {
      this.logger.error?.(
        {
          message:
            'A post-commit account-deletion leg failed unexpectedly; the deletion still stands',
          userID: deleteData.ID,
          error: redactError(error),
        },
        redactStack(error),
        LogContext.COMMUNITY
      );
    }
  }

  async deleteOrganizationWithPendingMemberships(
    deleteData: DeleteUserInput
  ): Promise<IOrganization> {
    const organizationID = deleteData.ID;

    const invitations =
      await this.invitationService.findInvitationsForActor(organizationID);
    for (const invitation of invitations) {
      await this.invitationService.deleteInvitation({ ID: invitation.id });
    }

    let organization =
      await this.organizationLookupService.getOrganizationByIdOrFail(
        organizationID
      );
    const account = await this.organizationService.getAccount(organization);

    organization =
      await this.organizationService.deleteOrganization(deleteData);
    await this.accountService.deleteAccountOrFail(account);
    organization.id = organizationID;
    return organization;
  }
}
