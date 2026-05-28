import { randomUUID } from 'node:crypto';
import { LogContext } from '@common/enums';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PlatformAuditInitiatorRole } from '../user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '../user-email-change/enums/platform.audit.outcome';
import { PasswordChangeAuditDetails } from '../user-email-change/platform.audit.entry.interface';
import { retryWithBackoff } from '../user-email-change/user.email.change.retry.util';
import { UserPasswordChangeSecuritySignalPayload } from './dto/notification.payloads';
import { UserPasswordChangeAuditService } from './user.password.change.audit.service';

export interface HandlePasswordChangeObservedInput {
  /**
   * The Kratos identity whose password changed. The platform correlates this
   * to an Alkemio user via `User.authenticationID`.
   */
  identityId: string;
  /**
   * Wall-clock timestamp the upstream flow reported. Optional — defaults to
   * "now" when the source did not supply one.
   */
  observedAt?: string;
  /**
   * Kratos settings-flow id (or equivalent) for cross-system correlation.
   * Optional.
   */
  sourceFlowId?: string;
  /**
   * Optional request context the webhook layer extracted (IP / user-agent).
   */
  requestContext?: PasswordChangeAuditDetails['requestContext'];
}

export interface HandlePasswordChangeObservedResult {
  /**
   * False when no Alkemio user is linked to the supplied Kratos identity —
   * the observation is logged and dropped. True when the audit row was
   * written (notification fan-out is best-effort and does not affect this).
   */
  recorded: boolean;
}

/**
 * Observer-side handler for Kratos-driven password changes. Kratos owns the
 * credential and runs the change flow; the platform's responsibility is
 * limited to:
 *   1. recording a `PASSWORD_CHANGE / OBSERVED` audit row, and
 *   2. publishing a single security-signal notification to the user's current
 *      email address so an attacker-driven change is visible to the legitimate
 *      account holder.
 *
 * The notification fan-out is best-effort and audits its own failure
 * (`SECURITY_SIGNAL_FAILED`) rather than failing the observation — the audit
 * row is the load-bearing record.
 */
@Injectable()
export class UserPasswordChangeObserverService {
  constructor(
    private readonly auditService: UserPasswordChangeAuditService,
    private readonly userLookupService: UserLookupService,
    private readonly notificationAdapter: NotificationExternalAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async handleObservedPasswordChange(
    input: HandlePasswordChangeObservedInput
  ): Promise<HandlePasswordChangeObservedResult> {
    const correlationId = randomUUID();
    const observedAt = input.observedAt ?? new Date().toISOString();

    const subject = await this.userLookupService.getUserByAuthenticationID(
      input.identityId
    );
    if (!subject) {
      // Identity has no Alkemio user link. This is expected for service
      // accounts, deleted users whose Kratos identity outlived them, or
      // identities created outside the registration flow. Log and drop —
      // writing an audit row without a subject would violate the schema.
      this.logger.warn(
        `password_change_observed for identity ${input.identityId} has no Alkemio user — dropping`,
        LogContext.KRATOS_HOOKS
      );
      return { recorded: false };
    }

    await this.auditService.record({
      subjectUserId: subject.id,
      initiatorUserId: subject.id,
      initiatorRole: PlatformAuditInitiatorRole.SELF,
      outcome: PlatformAuditOutcome.OBSERVED,
      observedAt,
      sourceFlowId: input.sourceFlowId,
      correlationId,
      requestContext: input.requestContext,
    });

    await this.publishSecuritySignal({
      subjectUserId: subject.id,
      recipientEmail: subject.email,
      observedAt,
      correlationId,
    });

    return { recorded: true };
  }

  private async publishSecuritySignal(args: {
    subjectUserId: string;
    recipientEmail: string;
    observedAt: string;
    correlationId: string;
  }): Promise<void> {
    const payload: UserPasswordChangeSecuritySignalPayload = {
      recipientEmail: args.recipientEmail,
      observedAtISO8601: args.observedAt,
    };
    try {
      await retryWithBackoff(() =>
        this.notificationAdapter.publishPasswordChangeSecuritySignal(payload)
      );
    } catch (err) {
      // Best-effort. The audit row stands; record the publish failure
      // separately so the security gap is visible to operators.
      await this.auditService.record({
        subjectUserId: args.subjectUserId,
        initiatorUserId: args.subjectUserId,
        initiatorRole: PlatformAuditInitiatorRole.SELF,
        outcome: PlatformAuditOutcome.SECURITY_SIGNAL_FAILED,
        correlationId: args.correlationId,
        failureReason: extractNonLeakyReason(err),
      });
      this.logger.error(
        `password_change security signal publish failed for subject ${args.subjectUserId}; observation stands`,
        (err as Error)?.stack ?? '',
        LogContext.KRATOS_HOOKS
      );
    }
  }
}

function extractNonLeakyReason(err: unknown): string {
  const message = String((err as Error)?.message ?? err ?? '');
  if (!message) return 'unknown_error';
  if (/timeout|timed\s*out/i.test(message)) return 'timeout';
  if (/econnrefused|unreachable/i.test(message)) return 'broker_unreachable';
  if (/network/i.test(message)) return 'network_error';
  return 'operation_failed';
}
