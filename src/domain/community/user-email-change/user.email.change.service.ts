import { randomUUID } from 'node:crypto';
import { LogContext } from '@common/enums';
import { UserService } from '@domain/community/user/user.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationInputUserEmailChangeSpaceAdmin } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.user.email.change';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { apmAgent } from '@src/apm';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserEmailChangeTriggerOutcome } from './dto/notification.payloads';
import { PlatformAuditInitiatorRole } from './enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from './enums/platform.audit.outcome';
import { UserEmailChangeInitiatorRole } from './enums/user.email.change.initiator.role';
import { PlatformAuditEntry } from './platform.audit.entry.entity';
import { EmailChangeApprover } from './platform.audit.entry.interface';
import {
  CursorPageArgs,
  CursorPagedAuditEntries,
  PlatformAuditEntryRepository,
} from './platform.audit.entry.repository';
import { maskEmail } from './user.email.change.email.masking.util';
import {
  UserEmailChangeErrorCode,
  UserEmailChangeException,
} from './user.email.change.errors';
import { retryWithBackoff } from './user.email.change.retry.util';
import { UserEmailChangeAuditService } from './user.email.change.service.audit';
import { UserEmailChangeSubjectFootprintResolver } from './user.email.change.subject.footprint.util';

export interface ApplyAdminEmailChangeResult {
  success: true;
  email: string;
}

export interface ResolveDriftResult {
  success: true;
  email: string;
}

/**
 * Orchestration service for the platform-admin synchronous email-change flow
 * (spec 097). Companion spec 098 will extend this service with `initiateSelf`,
 * `confirm`, and `getActivePendingForSubject` for the self-service verification
 * flow.
 */
@Injectable()
export class UserEmailChangeService {
  private readonly clientWebUrl: string;

  constructor(
    private readonly auditRepository: PlatformAuditEntryRepository,
    private readonly auditService: UserEmailChangeAuditService,
    private readonly subjectFootprintResolver: UserEmailChangeSubjectFootprintResolver,
    private readonly kratosService: KratosService,
    private readonly notificationAdapter: NotificationExternalAdapter,
    private readonly notificationPlatformAdapter: NotificationPlatformAdapter,
    private readonly notificationSpaceAdapter: NotificationSpaceAdapter,
    private readonly userService: UserService,
    private readonly userLookupService: UserLookupService,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.clientWebUrl = this.configService.get('endpoints.client_web', {
      infer: true,
    });
  }

  // --- public surface (skeleton — bodies filled in by Phase 2 / 3 / 5) ---

  public async applyAdminEmailChange(
    initiatorAdminId: string,
    subjectUserId: string,
    newEmail: string,
    reason: string,
    approver: EmailChangeApprover
  ): Promise<ApplyAdminEmailChangeResult> {
    const correlationId = randomUUID();
    const subject = await this.loadSubjectOrThrow(subjectUserId);
    const oldEmail = subject.email;

    await this.validateNoChange(subject, newEmail, {
      correlationId,
      initiatorAdminId,
      reason,
      approver,
    });
    await this.validateFormatAndUniqueness(
      subject,
      newEmail,
      correlationId,
      initiatorAdminId,
      reason,
      approver
    );

    await this.commitAcrossSides({
      subjectUserId: subject.id,
      subjectAuthenticationId: subject.authenticationID ?? '',
      oldEmail,
      newEmail,
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
      initiatorUserId: initiatorAdminId,
      correlationId,
      reason,
      approver,
    });

    return { success: true, email: newEmail };
  }

  public async resolveDrift(
    adminId: string,
    subjectUserId: string,
    canonicalEmail: string
  ): Promise<ResolveDriftResult> {
    const drift =
      await this.auditRepository.findLatestUnresolvedDriftBySubject(
        subjectUserId
      );
    if (!drift) {
      throw new UserEmailChangeException(
        UserEmailChangeErrorCode.EMAIL_CHANGE_DRIFT_NOT_FOUND,
        'No outstanding drift to resolve for the named subject.',
        LogContext.AUTH,
        { subjectUserId }
      );
    }

    const driftOld = drift.details?.oldEmail;
    const driftNew = drift.details?.newEmail;
    if (canonicalEmail !== driftOld && canonicalEmail !== driftNew) {
      throw new UserEmailChangeException(
        UserEmailChangeErrorCode.EMAIL_CHANGE_VALIDATION,
        'canonicalEmail must match either the old or new email recorded on the drift entry.',
        LogContext.AUTH,
        { subjectUserId }
      );
    }

    const correlationId = drift.correlationId ?? randomUUID();
    const subject = await this.loadSubjectOrThrow(subjectUserId);

    try {
      await retryWithBackoff(async () => {
        const currentKratosEmail =
          await this.kratosService.getIdentityEmailTrait(
            subject.authenticationID ?? ''
          );
        if (currentKratosEmail !== canonicalEmail) {
          await this.kratosService.updateIdentityEmailTrait(
            subject.authenticationID ?? '',
            canonicalEmail
          );
        }
        if (subject.email !== canonicalEmail) {
          subject.email = canonicalEmail;
          await this.userService.save(subject);
        }
      });
    } catch (err) {
      await this.auditService.record({
        subjectUserId,
        initiatorUserId: adminId,
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
        outcome: PlatformAuditOutcome.DRIFT_RESOLUTION_FAILED,
        oldEmail: driftOld,
        newEmail: driftNew,
        failureReason: extractNonLeakyReason(err),
        correlationId,
      });
      throw new UserEmailChangeException(
        UserEmailChangeErrorCode.EMAIL_CHANGE_DRIFT_RESOLUTION_FAILED,
        'Drift resolution exhausted its retry budget.',
        LogContext.AUTH,
        { subjectUserId }
      );
    }

    await this.auditService.record({
      subjectUserId,
      initiatorUserId: adminId,
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
      outcome: PlatformAuditOutcome.DRIFT_RESOLVED,
      oldEmail: driftOld,
      newEmail: canonicalEmail,
      correlationId,
    });

    return { success: true, email: canonicalEmail };
  }

  public async getAuditEntriesForSubject(
    subjectUserId: string,
    args: CursorPageArgs
  ): Promise<CursorPagedAuditEntries> {
    return this.auditRepository.findEmailChangeBySubjectPaged(
      subjectUserId,
      args
    );
  }

  public async getLatestAuditEntryForSubject(
    subjectUserId: string
  ): Promise<PlatformAuditEntry | null> {
    return this.auditRepository.findLatestEmailChangeBySubject(subjectUserId);
  }

  // --- internal helpers (filled in by Phase 2/3) ---

  private async loadSubjectOrThrow(subjectUserId: string) {
    const subject =
      await this.userLookupService.getUserByIdOrFail(subjectUserId);
    if (!subject.authenticationID) {
      throw new UserEmailChangeException(
        UserEmailChangeErrorCode.EMAIL_CHANGE_SUBJECT_NOT_FOUND,
        'Subject user is missing the identity-provider link.',
        LogContext.AUTH,
        { subjectUserId }
      );
    }
    // The stored authenticationID may dangle (stale link to an identity that no
    // longer exists in Kratos). Detect this BEFORE the commit so it surfaces as
    // a clean 404 SUBJECT_NOT_FOUND rather than a retried 502 KRATOS_WRITE_FAILED.
    const identity = await this.kratosService.getIdentityById(
      subject.authenticationID
    );
    if (!identity) {
      throw new UserEmailChangeException(
        UserEmailChangeErrorCode.EMAIL_CHANGE_SUBJECT_NOT_FOUND,
        'Subject user has no resolvable identity-provider identity.',
        LogContext.AUTH,
        { subjectUserId }
      );
    }
    return subject;
  }

  private async validateNoChange(
    subject: { id: string; email: string },
    newEmail: string,
    ctx: {
      correlationId: string;
      initiatorAdminId: string;
      reason: string;
      approver: EmailChangeApprover;
    }
  ): Promise<void> {
    if (subject.email.toLowerCase() === newEmail.toLowerCase()) {
      await this.auditService.record({
        subjectUserId: subject.id,
        initiatorUserId: ctx.initiatorAdminId,
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
        outcome: PlatformAuditOutcome.REJECTED_VALIDATION,
        oldEmail: subject.email,
        newEmail,
        reason: ctx.reason,
        approver: ctx.approver,
        failureReason: 'no_change',
        correlationId: ctx.correlationId,
      });
      throw new UserEmailChangeException(
        UserEmailChangeErrorCode.EMAIL_CHANGE_NO_CHANGE,
        'New email equals current email.',
        LogContext.AUTH,
        { subjectUserId: subject.id }
      );
    }
  }

  private async validateFormatAndUniqueness(
    subject: { id: string; email: string },
    newEmail: string,
    correlationId: string,
    initiatorAdminId: string,
    reason: string,
    approver: EmailChangeApprover
  ): Promise<void> {
    if (!isLikelyEmail(newEmail)) {
      await this.auditService.record({
        subjectUserId: subject.id,
        initiatorUserId: initiatorAdminId,
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
        outcome: PlatformAuditOutcome.REJECTED_VALIDATION,
        oldEmail: subject.email,
        newEmail,
        reason,
        approver,
        failureReason: 'malformed_email',
        correlationId,
      });
      throw new UserEmailChangeException(
        UserEmailChangeErrorCode.EMAIL_CHANGE_VALIDATION,
        'New email is malformed.',
        LogContext.AUTH,
        { subjectUserId: subject.id }
      );
    }

    const existingAlkemio = await this.userService.getUserByEmail(newEmail);
    const conflictAlkemio =
      existingAlkemio !== null && existingAlkemio.id !== subject.id;

    let conflictKratos = false;
    try {
      const identityAtEmail =
        await this.kratosService.findIdentityByEmail(newEmail);
      if (identityAtEmail) {
        // The subject's own Kratos identity is acceptable; any other identity holding
        // the address is a conflict.
        const subjectKratosId = (subject as { authenticationID?: string })
          .authenticationID;
        if (!subjectKratosId || identityAtEmail.id !== subjectKratosId) {
          conflictKratos = true;
        }
      }
    } catch (err) {
      // A Kratos lookup failure during validation is treated as a transient error
      // surfaced to the caller — not a conflict. We do not write a rejected_conflict
      // audit row in that case.
      this.logger.warn(
        `Kratos uniqueness lookup failed during email-change validation: ${(err as Error)?.message}`,
        LogContext.KRATOS
      );
    }

    if (conflictAlkemio || conflictKratos) {
      await this.auditService.record({
        subjectUserId: subject.id,
        initiatorUserId: initiatorAdminId,
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
        outcome: PlatformAuditOutcome.REJECTED_CONFLICT,
        oldEmail: subject.email,
        newEmail,
        reason,
        approver,
        failureReason: 'conflict',
        correlationId,
      });
      throw new UserEmailChangeException(
        UserEmailChangeErrorCode.EMAIL_CHANGE_CONFLICT,
        'The new email is already in use.',
        LogContext.AUTH,
        { subjectUserId: subject.id }
      );
    }
  }

  /**
   * Post-validation commit chain shared by `applyAdminEmailChange` and by
   * spec 098's `confirm`. Order: Kratos forward (retried) → Alkemio write →
   * `committed` audit → session invalidation (best-effort + retry) → three
   * notification publishes (each independently retried, failures audited).
   *
   * Rollback / drift branches are layered into the orchestration entry-points
   * (T027 / T028) rather than living here — rollback semantics depend on which
   * side-write failed, and that decision is the caller's.
   */
  private async commitAcrossSides(args: {
    subjectUserId: string;
    subjectAuthenticationId: string;
    oldEmail: string;
    newEmail: string;
    initiatorRole: PlatformAuditInitiatorRole;
    initiatorUserId?: string;
    correlationId: string;
    reason?: string;
    approver?: EmailChangeApprover;
  }): Promise<void> {
    const {
      subjectUserId,
      subjectAuthenticationId,
      oldEmail,
      newEmail,
      initiatorRole,
      initiatorUserId,
      correlationId,
      reason,
      approver,
    } = args;

    // (0) Crash-window breadcrumb (FR-009c / research.md §R15). Persisted BEFORE the
    // forward Kratos write so a process death between the Kratos write and the
    // Alkemio write leaves a durable, correlatable trail — a `commit_started` row
    // with no terminal row sharing its correlationId is the signal
    // `adminUserEmailChangeDriftResolve` keys on. If this write itself fails the
    // operation never starts (no side has been touched) and the error propagates.
    await this.auditService.record({
      subjectUserId,
      initiatorUserId,
      initiatorRole,
      outcome: PlatformAuditOutcome.COMMIT_STARTED,
      oldEmail,
      newEmail,
      reason,
      approver,
      correlationId,
    });

    // (a) Forward Kratos.
    try {
      await retryWithBackoff(() =>
        this.kratosService.updateIdentityEmailTrait(
          subjectAuthenticationId,
          newEmail
        )
      );
    } catch (err) {
      this.logger.error(
        `email_change forward Kratos write failed for subject ${subjectUserId}: ${describeError(err)}`,
        (err as Error)?.stack ?? '',
        LogContext.KRATOS
      );
      await this.auditService.record({
        subjectUserId,
        initiatorUserId,
        initiatorRole,
        outcome: PlatformAuditOutcome.ROLLED_BACK,
        oldEmail,
        newEmail,
        reason,
        approver,
        failureReason: extractNonLeakyReason(err),
        correlationId,
      });
      throw new UserEmailChangeException(
        isLikelyNetworkError(err)
          ? UserEmailChangeErrorCode.EMAIL_CHANGE_KRATOS_UNREACHABLE
          : UserEmailChangeErrorCode.EMAIL_CHANGE_KRATOS_WRITE_FAILED,
        'Forward Kratos write exhausted its retry budget.',
        LogContext.KRATOS,
        { subjectUserId }
      );
    }

    // (b) Forward Alkemio.
    let alkemioWriteOk = false;
    try {
      const subject =
        await this.userLookupService.getUserByIdOrFail(subjectUserId);
      subject.email = newEmail;
      await this.userService.save(subject);
      alkemioWriteOk = true;
    } catch (alkemioErr) {
      // (b.rollback) Compensate by reverting Kratos to the old email.
      try {
        await retryWithBackoff(() =>
          this.kratosService.updateIdentityEmailTrait(
            subjectAuthenticationId,
            oldEmail
          )
        );
        await this.auditService.record({
          subjectUserId,
          initiatorUserId,
          initiatorRole,
          outcome: PlatformAuditOutcome.ROLLED_BACK,
          oldEmail,
          newEmail,
          reason,
          approver,
          failureReason: extractNonLeakyReason(alkemioErr),
          correlationId,
        });
        throw new UserEmailChangeException(
          UserEmailChangeErrorCode.EMAIL_CHANGE_ALKEMIO_WRITE_FAILED,
          'Alkemio write failed; Kratos reverted successfully.',
          LogContext.AUTH,
          { subjectUserId }
        );
      } catch (revertErr) {
        if (revertErr instanceof UserEmailChangeException) {
          throw revertErr;
        }
        // Drift — Kratos holds the new value, Alkemio holds the old value, and
        // the revert exhausted its retry budget.
        await this.recordDriftAndNotify({
          subjectUserId,
          initiatorUserId,
          initiatorRole,
          oldEmail,
          newEmail,
          correlationId,
          reason,
          approver,
          failureReason: extractNonLeakyReason(revertErr),
        });
        throw new UserEmailChangeException(
          UserEmailChangeErrorCode.EMAIL_CHANGE_DRIFT_DETECTED,
          'Drift detected — Kratos holds the new value, Alkemio holds the old value.',
          LogContext.AUTH,
          { subjectUserId }
        );
      }
    }

    if (!alkemioWriteOk) return; // unreachable — kept for type narrowing

    // (c) Audit committed BEFORE the best-effort side-effects.
    await this.auditService.record({
      subjectUserId,
      initiatorUserId,
      initiatorRole,
      outcome: PlatformAuditOutcome.COMMITTED,
      oldEmail,
      newEmail,
      reason,
      approver,
      correlationId,
    });

    const commitTimestampISO8601 = new Date().toISOString();

    // (d) Session invalidation.
    await this.runWithAuditFailure(
      () =>
        this.kratosService.invalidateAllIdentitySessions(
          subjectAuthenticationId
        ),
      {
        subjectUserId,
        initiatorUserId,
        initiatorRole,
        outcome: PlatformAuditOutcome.SESSION_INVALIDATION_FAILED,
        oldEmail,
        newEmail,
        reason,
        approver,
        correlationId,
      }
    );

    // (e.1) Security signal → OLD address.
    await this.runWithAuditFailure(
      () =>
        this.notificationAdapter.publishEmailChangeSecuritySignal({
          recipientEmail: oldEmail,
          commitTimestampISO8601,
          initiatorRole: this.mapInitiatorRoleForNotification(initiatorRole),
          newEmailMasked: maskEmail(newEmail),
        }),
      {
        subjectUserId,
        initiatorUserId,
        initiatorRole,
        outcome: PlatformAuditOutcome.SECURITY_SIGNAL_FAILED,
        oldEmail,
        newEmail,
        reason,
        approver,
        correlationId,
      }
    );

    // (e.2) Acknowledgement → NEW address.
    await this.runWithAuditFailure(
      () =>
        this.notificationAdapter.publishEmailChangeNewAddressNotification({
          recipientEmail: newEmail,
          commitTimestampISO8601,
          initiatorRole: this.mapInitiatorRoleForNotification(initiatorRole),
          newEmailFull: newEmail,
          loginUrl: this.clientWebUrl,
        }),
      {
        subjectUserId,
        initiatorUserId,
        initiatorRole,
        outcome: PlatformAuditOutcome.NEW_ADDRESS_NOTIFICATION_FAILED,
        oldEmail,
        newEmail,
        reason,
        approver,
        correlationId,
      }
    );

    // (e.3) Global-admin fan-out.
    await this.runWithAuditFailure(
      async () => {
        const footprint =
          await this.subjectFootprintResolver.buildSubjectFootprint(
            subjectUserId
          );
        const initiatorProfile = initiatorUserId
          ? await this.userLookupService.getUserByIdOrFail(initiatorUserId, {
              relations: { profile: true },
            })
          : undefined;
        const subjectProfile = await this.userLookupService.getUserByIdOrFail(
          subjectUserId,
          {
            relations: { profile: true },
          }
        );
        await this.notificationPlatformAdapter.userEmailChangeGlobalAdmin({
          triggeredBy: initiatorUserId ?? subjectUserId,
          subjectUserID: subjectUserId,
          subjectProfileSummary: {
            id: subjectProfile.id,
            displayName: subjectProfile.profile.displayName,
          },
          oldEmail,
          newEmail,
          initiatorProfileSummary: initiatorProfile
            ? {
                id: initiatorProfile.id,
                displayName: initiatorProfile.profile.displayName,
              }
            : undefined,
          initiatorRole: this.mapInitiatorRoleForNotification(initiatorRole),
          approver,
          reason,
          commitTimestampISO8601,
          triggerOutcome: 'COMMITTED',
          subjectMemberships: {
            spaces: footprint.spaces,
            organizations: footprint.organizations,
          },
          subjectGlobalRoles: footprint.globalRoles,
        });
      },
      {
        subjectUserId,
        initiatorUserId,
        initiatorRole,
        outcome: PlatformAuditOutcome.GLOBAL_ADMIN_NOTIFICATION_FAILED,
        oldEmail,
        newEmail,
        reason,
        approver,
        correlationId,
      }
    );

    // (e.4) Per-space fan-out to the admins / leads of every space the
    // subject is a member of.
    await this.publishSpaceAdminNotifications({
      subjectUserId,
      initiatorUserId,
      initiatorRole,
      oldEmail,
      newEmail,
      correlationId,
      reason,
      approver,
      commitTimestampISO8601,
      triggerOutcome: 'COMMITTED',
    });
  }

  private async runWithAuditFailure(
    op: () => Promise<unknown>,
    auditOnExhaustion: {
      subjectUserId: string;
      initiatorUserId?: string;
      initiatorRole: PlatformAuditInitiatorRole;
      outcome: PlatformAuditOutcome;
      oldEmail: string;
      newEmail: string;
      reason?: string;
      approver?: EmailChangeApprover;
      correlationId: string;
    }
  ): Promise<void> {
    try {
      await retryWithBackoff(op);
    } catch (err) {
      await this.auditService.record({
        ...auditOnExhaustion,
        failureReason: extractNonLeakyReason(err),
      });
      this.logger.error(
        `Post-commit side-effect failed (${auditOnExhaustion.outcome}); commit stands. Cause: ${describeError(err)}`,
        (err as Error)?.stack ?? '',
        LogContext.AUTH
      );
    }
  }

  private async recordDriftAndNotify(args: {
    subjectUserId: string;
    initiatorUserId?: string;
    initiatorRole: PlatformAuditInitiatorRole;
    oldEmail: string;
    newEmail: string;
    correlationId: string;
    reason?: string;
    approver?: EmailChangeApprover;
    failureReason: string;
  }): Promise<void> {
    // (1) Persist drift_detected FIRST so T029's lookup remains correct even
    //     when a subsequent global_admin_notification_failed row lands.
    await this.auditService.record({
      subjectUserId: args.subjectUserId,
      initiatorUserId: args.initiatorUserId,
      initiatorRole: args.initiatorRole,
      outcome: PlatformAuditOutcome.DRIFT_DETECTED,
      oldEmail: args.oldEmail,
      newEmail: args.newEmail,
      reason: args.reason,
      approver: args.approver,
      failureReason: args.failureReason,
      correlationId: args.correlationId,
    });

    // (2) Winston error log with documented marker.
    this.logger.error(
      `email_change_drift_detected subject=${args.subjectUserId}`,
      '',
      LogContext.AUTH
    );

    // (3) APM captureError with documented marker.
    try {
      apmAgent?.captureError(new Error('email_change_drift_detected'), {
        custom: {
          marker: 'email_change_drift_detected',
          subjectUserId: args.subjectUserId,
          correlationId: args.correlationId,
        },
      });
    } catch {
      // APM failures must never propagate.
    }

    // (4) Global-admin publish with triggerOutcome: DRIFT_DETECTED.
    const commitTimestampISO8601 = new Date().toISOString();
    await this.runWithAuditFailure(
      async () => {
        const footprint =
          await this.subjectFootprintResolver.buildSubjectFootprint(
            args.subjectUserId
          );
        const subjectProfile = await this.userLookupService.getUserByIdOrFail(
          args.subjectUserId,
          { relations: { profile: true } }
        );
        const initiatorProfile = args.initiatorUserId
          ? await this.userLookupService.getUserByIdOrFail(
              args.initiatorUserId,
              { relations: { profile: true } }
            )
          : undefined;
        await this.notificationPlatformAdapter.userEmailChangeGlobalAdmin({
          triggeredBy: args.initiatorUserId ?? args.subjectUserId,
          subjectUserID: args.subjectUserId,
          subjectProfileSummary: {
            id: subjectProfile.id,
            displayName: subjectProfile.profile.displayName,
          },
          oldEmail: args.oldEmail,
          newEmail: args.newEmail,
          initiatorProfileSummary: initiatorProfile
            ? {
                id: initiatorProfile.id,
                displayName: initiatorProfile.profile.displayName,
              }
            : undefined,
          initiatorRole: this.mapInitiatorRoleForNotification(
            args.initiatorRole
          ),
          approver: args.approver,
          reason: args.reason,
          commitTimestampISO8601,
          triggerOutcome: 'DRIFT_DETECTED',
          subjectMemberships: {
            spaces: footprint.spaces,
            organizations: footprint.organizations,
          },
          subjectGlobalRoles: footprint.globalRoles,
        });
      },
      {
        subjectUserId: args.subjectUserId,
        initiatorUserId: args.initiatorUserId,
        initiatorRole: args.initiatorRole,
        outcome: PlatformAuditOutcome.GLOBAL_ADMIN_NOTIFICATION_FAILED,
        oldEmail: args.oldEmail,
        newEmail: args.newEmail,
        reason: args.reason,
        approver: args.approver,
        correlationId: args.correlationId,
      }
    );

    // (5) Per-space fan-out to the admins / leads of every space the subject
    // is a member of — drift-detected variant.
    await this.publishSpaceAdminNotifications({
      subjectUserId: args.subjectUserId,
      initiatorUserId: args.initiatorUserId,
      initiatorRole: args.initiatorRole,
      oldEmail: args.oldEmail,
      newEmail: args.newEmail,
      correlationId: args.correlationId,
      reason: args.reason,
      approver: args.approver,
      commitTimestampISO8601,
      triggerOutcome: 'DRIFT_DETECTED',
    });
  }

  /**
   * Per-space email-change fan-out (committed + drift variants). Publishes one
   * `USER_EMAIL_CHANGE_SPACE_ADMIN_NOTIFICATION` event per space the subject is
   * a member of. The subject footprint + profiles are
   * resolved once; each space is then published under its own retry/audit
   * envelope so one space's failure neither blocks the others nor re-sends an
   * already-delivered space. Never throws — the commit always stands.
   */
  private async publishSpaceAdminNotifications(args: {
    subjectUserId: string;
    initiatorUserId?: string;
    initiatorRole: PlatformAuditInitiatorRole;
    oldEmail: string;
    newEmail: string;
    correlationId: string;
    reason?: string;
    approver?: EmailChangeApprover;
    commitTimestampISO8601: string;
    triggerOutcome: UserEmailChangeTriggerOutcome;
  }): Promise<void> {
    const {
      subjectUserId,
      initiatorUserId,
      initiatorRole,
      oldEmail,
      newEmail,
      correlationId,
      reason,
      approver,
      commitTimestampISO8601,
      triggerOutcome,
    } = args;

    try {
      const footprint =
        await this.subjectFootprintResolver.buildSubjectFootprint(
          subjectUserId
        );
      // Every space the subject is a member of qualifies — any role (member,
      // lead, or admin); recipients are resolved per space as that space's
      // admins/leads.
      const qualifyingSpaceIds = footprint.spaces.map(space => space.spaceId);
      if (qualifyingSpaceIds.length === 0) {
        return;
      }

      const subjectProfile = await this.userLookupService.getUserByIdOrFail(
        subjectUserId,
        { relations: { profile: true } }
      );
      const initiatorProfile = initiatorUserId
        ? await this.userLookupService.getUserByIdOrFail(initiatorUserId, {
            relations: { profile: true },
          })
        : undefined;

      const eventData: NotificationInputUserEmailChangeSpaceAdmin = {
        triggeredBy: initiatorUserId ?? subjectUserId,
        subjectUserID: subjectUserId,
        subjectProfileSummary: {
          id: subjectProfile.id,
          displayName: subjectProfile.profile.displayName,
        },
        oldEmail,
        newEmail,
        initiatorProfileSummary: initiatorProfile
          ? {
              id: initiatorProfile.id,
              displayName: initiatorProfile.profile.displayName,
            }
          : undefined,
        initiatorRole: this.mapInitiatorRoleForNotification(initiatorRole),
        commitTimestampISO8601,
        triggerOutcome,
      };

      // One event per space — each under its own retry/audit envelope.
      for (const spaceId of qualifyingSpaceIds) {
        await this.runWithAuditFailure(
          () =>
            this.notificationSpaceAdapter.userEmailChangeSpaceAdmin(
              eventData,
              spaceId
            ),
          {
            subjectUserId,
            initiatorUserId,
            initiatorRole,
            outcome: PlatformAuditOutcome.SPACE_ADMIN_NOTIFICATION_FAILED,
            oldEmail,
            newEmail,
            reason,
            approver,
            correlationId,
          }
        );
      }
    } catch (err) {
      // Footprint / profile resolution failed — no per-space event was
      // published. Audit once; the commit stands.
      await this.auditService.record({
        subjectUserId,
        initiatorUserId,
        initiatorRole,
        outcome: PlatformAuditOutcome.SPACE_ADMIN_NOTIFICATION_FAILED,
        oldEmail,
        newEmail,
        reason,
        approver,
        failureReason: extractNonLeakyReason(err),
        correlationId,
      });
      this.logger.error(
        `Post-commit side-effect failed (space_admin_notification_failed); commit stands. Cause: ${describeError(err)}`,
        (err as Error)?.stack ?? '',
        LogContext.AUTH
      );
    }
  }

  private mapInitiatorRoleForNotification(
    role: PlatformAuditInitiatorRole
  ): UserEmailChangeInitiatorRole {
    // The wire value MUST be the lowercase enum value ('self' /
    // 'platform_admin') the notifications service expects (research §R3).
    return role === PlatformAuditInitiatorRole.SELF
      ? UserEmailChangeInitiatorRole.SELF
      : UserEmailChangeInitiatorRole.PLATFORM_ADMIN;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isLikelyEmail(value: string): boolean {
  return typeof value === 'string' && EMAIL_REGEX.test(value);
}

/**
 * Builds a diagnostic (not user-facing) description of an error for server logs.
 * Pulls the axios `response.status` + `response.data` when present so a Kratos
 * 4xx surfaces its real cause instead of just "Request failed with status code".
 */
function describeError(err: unknown): string {
  const anyErr = err as {
    message?: string;
    response?: { status?: number; data?: unknown };
  };
  const parts: string[] = [];
  if (anyErr?.message) parts.push(anyErr.message);
  if (anyErr?.response?.status) {
    parts.push(`status=${anyErr.response.status}`);
  }
  if (anyErr?.response?.data !== undefined) {
    let body: string;
    try {
      body =
        typeof anyErr.response.data === 'string'
          ? anyErr.response.data
          : JSON.stringify(anyErr.response.data);
    } catch {
      body = '[unserialisable response body]';
    }
    parts.push(`body=${body.slice(0, 1000)}`);
  }
  return parts.join(' | ') || String(err);
}

function isLikelyNetworkError(err: unknown): boolean {
  const message = String((err as Error)?.message ?? err ?? '').toLowerCase();
  return (
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('unreachable')
  );
}

function extractNonLeakyReason(err: unknown): string {
  const message = String((err as Error)?.message ?? err ?? '');
  // Strip any embedded address-looking tokens. Failure reasons are stored in a
  // small varchar column and must never carry account-enumeration content
  // (FR-014). Whitelist a handful of well-known short codes; otherwise normalise.
  if (!message) return 'unknown_error';
  if (/timeout|timed\s*out/i.test(message)) return 'timeout';
  if (/econnrefused|unreachable/i.test(message)) return 'kratos_unreachable';
  if (/network/i.test(message)) return 'network_error';
  return 'operation_failed';
}
