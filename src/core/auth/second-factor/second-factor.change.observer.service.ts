import { randomUUID } from 'node:crypto';
import { LogContext } from '@common/enums';
import { retryWithBackoff } from '@domain/community/user-email-change/user.email.change.retry.util';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { extractNonLeakyReason } from '@domain/community/user-password-change/user.password.change.observer.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  SecondFactorAuditService,
  SecondFactorMethod,
} from './second-factor.audit.service';

/** Wire payload of `USER_SECOND_FACTOR_CHANGE_SECURITY_SIGNAL`. */
export interface UserSecondFactorChangeSecuritySignalPayload {
  recipientEmail: string;
  observedAtISO8601: string;
}

export interface HandleSecondFactorChangeInput {
  /** The Kratos identity whose second factor changed. */
  identityId: string;
  method: SecondFactorMethod;
  /** Defaults to now. */
  observedAt?: string;
  sourceFlowId?: string;
  requestContext?: { userAgent?: string };
}

/**
 * Records a change to a member's second factor and tells the member. Kratos
 * owns the factor; the platform only records and notifies. The notice is
 * best-effort: a notice that could not be published is recorded instead.
 */
@Injectable()
export class SecondFactorChangeObserverService {
  constructor(
    private readonly auditService: SecondFactorAuditService,
    private readonly userLookupService: UserLookupService,
    private readonly notificationAdapter: NotificationExternalAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /** A change reported by Kratos' settings hook. A failed row write rejects. */
  async handleObservedChange(
    input: HandleSecondFactorChangeInput
  ): Promise<void> {
    const user = await this.userLookupService.getUserByAuthenticationID(
      input.identityId
    );
    if (!user) {
      this.logger.warn?.(
        {
          message:
            'Second-factor change reported for an identity that links no user; dropping',
          identityId: input.identityId,
        },
        LogContext.KRATOS_HOOKS
      );
      return;
    }
    const correlationId = randomUUID();
    const observedAt = input.observedAt ?? new Date().toISOString();
    await this.auditService.recordFactorChange(
      { id: user.id },
      {
        method: input.method,
        observedAt,
        sourceFlowId: input.sourceFlowId,
        requestContext: input.requestContext,
        correlationId,
      }
    );
    await this.notify(user, observedAt, correlationId);
  }

  /** Publishes the notice; on failure records it under `correlationId`. */
  async notify(
    user: { id: string; email: string },
    observedAt: string,
    correlationId: string
  ): Promise<void> {
    const payload: UserSecondFactorChangeSecuritySignalPayload = {
      recipientEmail: user.email,
      observedAtISO8601: observedAt,
    };
    try {
      await retryWithBackoff(() =>
        this.notificationAdapter.publishSecondFactorChangeSecuritySignal(
          payload
        )
      );
    } catch (error) {
      await this.auditService.recordSignalFailed(
        { id: user.id },
        { failureReason: extractNonLeakyReason(error), correlationId }
      );
      this.logger.error(
        {
          message:
            'Second-factor change notice could not be published; the change stands',
          userId: user.id,
          correlationId,
        },
        (error as Error)?.stack ?? '',
        LogContext.KRATOS_HOOKS
      );
    }
  }
}
