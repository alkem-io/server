import { randomUUID } from 'node:crypto';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@common/exceptions';
import { BaseException } from '@common/exceptions/base.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { OidcSessionRevocationService } from '@core/auth/oidc/revocation/oidc-session-revocation.service';
import {
  SecondFactorAuditService,
  SecondFactorResetFailureReason,
} from '@core/auth/second-factor/second-factor.audit.service';
import { SecondFactorChangeObserverService } from '@core/auth/second-factor/second-factor.change.observer.service';
import { SecondFactorResetFailedStep } from '@domain/community/user-email-change/platform.audit.entry.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  KratosService,
  SecondFactorCredentialType,
} from '@services/infrastructure/kratos/kratos.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

const SECOND_FACTOR_TYPES: SecondFactorCredentialType[] = [
  'totp',
  'webauthn',
  'lookup_secret',
];
const KRATOS_TIMEOUT_MS = 5000;

export type SecondFactorResetResult = {
  removedCredentialTypes: string[];
  sessionsRevoked: number;
  passwordInvalidated: boolean;
};

/** A step of the reset that failed, with the closed-set reason for its row. */
class ResetStepFailure extends Error {
  constructor(
    readonly failedStep: SecondFactorResetFailedStep,
    readonly failureReason: SecondFactorResetFailureReason,
    readonly cause: unknown
  ) {
    super(failedStep);
  }
}

/**
 * Support reset of a member's second factor: removes every second factor,
 * optionally replaces the password with an unusable secret (recovery by email
 * still works), ends every session at Kratos and in the application, and
 * records one logical reset as an intent row and an outcome row.
 *
 * The application revocation runs LAST: it writes the subject marker that
 * rejects every sign-in that began before it, so a sign-in racing the Kratos
 * steps cannot leave a usable session behind.
 */
@Injectable()
export class AdminUserSecondFactorService {
  constructor(
    private readonly userLookupService: UserLookupService,
    private readonly kratosService: KratosService,
    private readonly sessionRevocationService: OidcSessionRevocationService,
    private readonly auditService: SecondFactorAuditService,
    private readonly changeObserver: SecondFactorChangeObserverService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async resetSecondFactor(
    actor: ActorContext,
    userID: string,
    invalidatePassword: boolean
  ): Promise<SecondFactorResetResult> {
    if (userID === actor.actorID) {
      throw new ForbiddenException(
        'A second factor cannot be reset on your own account',
        LogContext.AUTH,
        { reason: 'self_target' }
      );
    }
    const target = await this.userLookupService.getUserByIdOrFail(userID);
    const kratosIdentityId = target.authenticationID;
    if (!kratosIdentityId) {
      throw new EntityNotFoundException(
        'User has no linked identity',
        LogContext.AUTH,
        { userId: userID }
      );
    }

    const correlationId = randomUUID();
    const ids = { kratosIdentityId, correlationId };
    await this.auditService.recordResetStarted(actor, target, {
      ...ids,
      invalidatePassword,
    });

    let removed: Set<string>;
    let sessionsRevoked: number;
    let tokenRevocationFailedCount: number;
    let passwordInvalidated = false;
    let passwordLastChangedAt: string | undefined;
    try {
      if (invalidatePassword) {
        passwordInvalidated = !!(await this.replacePassword(kratosIdentityId));
      }
      removed = await this.removeSecondFactors(kratosIdentityId);
      await this.step('kratos_sessions', () =>
        this.kratosService.invalidateAllIdentitySessions(kratosIdentityId, {
          timeoutMs: KRATOS_TIMEOUT_MS,
        })
      );
      // A session still open while the steps above ran may have enrolled a
      // new factor or set a new password: the second pass removes them too.
      for (const type of await this.removeSecondFactors(kratosIdentityId)) {
        removed.add(type);
      }
      if (invalidatePassword) {
        const replaced = await this.replacePassword(kratosIdentityId);
        if (replaced) {
          passwordInvalidated = true;
          passwordLastChangedAt = replaced.lastChangedAt;
        }
      }
      const report = await this.step('application_sessions', () =>
        this.sessionRevocationService.revokeAllForSub(
          kratosIdentityId,
          'second_factor_reset',
          { correlationId }
        )
      );
      if (report.failedCount > 0) {
        throw new ResetStepFailure(
          'application_sessions',
          'sessions_incomplete',
          undefined
        );
      }
      if (!report.subjectMarked) {
        throw new ResetStepFailure(
          'application_sessions',
          'marker_not_written',
          undefined
        );
      }
      sessionsRevoked = report.revokedCount;
      tokenRevocationFailedCount = report.tokenRevocationFailedCount;
    } catch (error) {
      if (!(error instanceof ResetStepFailure)) throw error;
      await this.auditService.recordResetFailed(actor, target, {
        ...ids,
        failedStep: error.failedStep,
        failureReason: error.failureReason,
      });
      this.logger.error(
        {
          message: 'Second-factor reset did not complete',
          failedStep: error.failedStep,
          failureReason: error.failureReason,
          cause: (error.cause as Error | undefined)?.message,
          correlationId,
        },
        undefined,
        LogContext.AUTH
      );
      throw new BaseException(
        'Second-factor reset did not complete',
        LogContext.AUTH,
        AlkemioErrorStatus.UNSPECIFIED,
        { failedStep: error.failedStep, correlationId }
      );
    }

    const removedCredentialTypes = SECOND_FACTOR_TYPES.filter(type =>
      removed.has(type)
    );
    await this.auditService.recordResetCompleted(actor, target, {
      ...ids,
      removedCredentialTypes,
      sessionsRevoked,
      tokenRevocationFailedCount,
      passwordInvalidated,
      ...(passwordLastChangedAt !== undefined && { passwordLastChangedAt }),
    });

    try {
      await this.changeObserver.notify(
        target,
        new Date().toISOString(),
        correlationId
      );
    } catch (error) {
      this.logger.error(
        {
          message: 'Second-factor reset notice failed; the reset stands',
          cause: (error as Error)?.message,
          correlationId,
        },
        undefined,
        LogContext.AUTH
      );
    }

    return { removedCredentialTypes, sessionsRevoked, passwordInvalidated };
  }

  private replacePassword(identityId: string) {
    return this.step('kratos_password', () =>
      this.kratosService.replacePasswordWithUnusableSecret(identityId, {
        timeoutMs: KRATOS_TIMEOUT_MS,
      })
    );
  }

  /** One pass over the three second-factor types; resolves what it removed. */
  private async removeSecondFactors(identityId: string): Promise<Set<string>> {
    const removed = new Set<string>();
    for (const type of SECOND_FACTOR_TYPES) {
      const wasPresent = await this.step('kratos_credentials', () =>
        this.kratosService.deleteIdentityCredential(identityId, type, {
          timeoutMs: KRATOS_TIMEOUT_MS,
        })
      );
      if (wasPresent) removed.add(type);
    }
    return removed;
  }

  private async step<T>(
    failedStep: SecondFactorResetFailedStep,
    run: () => Promise<T>
  ): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw new ResetStepFailure(failedStep, failureReasonOf(error), error);
    }
  }
}

function failureReasonOf(error: unknown): SecondFactorResetFailureReason {
  const e = error as { code?: string; response?: { status?: number } };
  if (e?.code === 'ECONNABORTED' || e?.code === 'ETIMEDOUT') return 'timeout';
  const status = e?.response?.status;
  if (typeof status === 'number') return `http_${status}`;
  return 'unknown';
}
