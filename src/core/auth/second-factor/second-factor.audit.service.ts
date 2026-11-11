import { AuthorizationCredential } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import {
  SecondFactorChangeAuditDetails,
  SecondFactorResetAuditDetails,
  SecondFactorResetFailedStep,
  SecondFactorRuleAuditDetails,
} from '@domain/community/user-email-change/platform.audit.entry.interface';
import { SecuritySignalFailureReason } from '@domain/community/user-password-change/user.password.change.observer.service';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import {
  resolveInitiatorRole,
  resolveInitiatorRoleBestEffort,
} from '@src/platform-admin/platform-audit-attribution/resolve.initiator.role';
import { EntityManager } from 'typeorm';

/** Closed set: never the raw message of the client or the store. */
export type SecondFactorResetFailureReason =
  | 'timeout'
  | `http_${number}`
  | 'sessions_incomplete'
  | 'marker_not_written'
  | 'unknown';

export type SecondFactorMethod = 'totp' | 'webauthn' | 'lookup_secret';

export type SecondFactorSubject = { id: string };

type ResetIds = { kratosIdentityId: string; correlationId: string };

const RESET_OWNERS = [
  AuthorizationCredential.PLATFORM_SUPPORT,
  AuthorizationCredential.PLATFORM_USERS_ADMIN,
];

/**
 * The one writer of `authentication` audit rows. FAIL-CLOSED: a write error
 * propagates to the caller. Details are built from explicit allow-lists, so
 * no email, display name, secret or raw error text reaches a row.
 */
@Injectable()
export class SecondFactorAuditService {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager
  ) {}

  /** Written in the caller's transaction, beside the settings save. */
  async recordRuleTransition(
    manager: EntityManager,
    actor: ActorContext,
    input: {
      scope: 'platform' | 'organization';
      organizationId?: string;
      from: boolean;
      to: boolean;
      since: string | null;
    }
  ): Promise<void> {
    const actorCredentialTypes = credentialTypes(actor);
    // An organisation's own owner or admin holds no platform role: `self`.
    const initiatorRole =
      input.scope === 'platform'
        ? resolveInitiatorRole({
            actorCredentialTypes,
            intendedOwners: [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
          })
        : resolveInitiatorRoleBestEffort({
            actorCredentialTypes,
            intendedOwners: [
              AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
            ],
          });
    const details: SecondFactorRuleAuditDetails = {
      scope: input.scope,
      from: input.from,
      to: input.to,
      since: input.since,
    };
    if (input.scope === 'organization') {
      details.organizationId = input.organizationId;
    }
    await this.write(manager, {
      subjectOrganizationId:
        input.scope === 'organization' ? input.organizationId : undefined,
      initiatorUserId: actor.actorID,
      initiatorRole,
      outcome: PlatformAuditOutcome.CONFIGURATION_CHANGED,
      details,
    });
  }

  async recordResetStarted(
    actor: ActorContext,
    target: SecondFactorSubject,
    input: ResetIds & { invalidatePassword: boolean }
  ): Promise<void> {
    await this.writeReset(
      actor,
      target,
      input,
      PlatformAuditOutcome.SECOND_FACTOR_RESET_STARTED,
      {
        kratosIdentityId: input.kratosIdentityId,
        invalidatePassword: input.invalidatePassword,
      }
    );
  }

  async recordResetCompleted(
    actor: ActorContext,
    target: SecondFactorSubject,
    input: ResetIds & {
      removedCredentialTypes: string[];
      sessionsRevoked: number;
      tokenRevocationFailedCount: number;
      passwordInvalidated: boolean;
      passwordLastChangedAt?: string;
    }
  ): Promise<void> {
    const details: SecondFactorResetAuditDetails = {
      kratosIdentityId: input.kratosIdentityId,
      removedCredentialTypes: [...input.removedCredentialTypes],
      sessionsRevoked: input.sessionsRevoked,
      tokenRevocationFailedCount: input.tokenRevocationFailedCount,
      passwordInvalidated: input.passwordInvalidated,
    };
    if (input.passwordLastChangedAt !== undefined) {
      details.passwordLastChangedAt = input.passwordLastChangedAt;
    }
    await this.writeReset(
      actor,
      target,
      input,
      PlatformAuditOutcome.SECOND_FACTOR_RESET_COMPLETED,
      details
    );
  }

  async recordResetFailed(
    actor: ActorContext,
    target: SecondFactorSubject,
    input: ResetIds & {
      failedStep: SecondFactorResetFailedStep;
      failureReason: SecondFactorResetFailureReason;
    }
  ): Promise<void> {
    await this.writeReset(
      actor,
      target,
      input,
      PlatformAuditOutcome.SECOND_FACTOR_RESET_FAILED,
      {
        kratosIdentityId: input.kratosIdentityId,
        failedStep: input.failedStep,
      },
      input.failureReason
    );
  }

  /** A member's own change, reported by the identity provider. */
  async recordFactorChange(
    user: SecondFactorSubject,
    input: {
      method: SecondFactorMethod;
      observedAt: string;
      sourceFlowId?: string;
      requestContext?: { userAgent?: string };
      correlationId: string;
    }
  ): Promise<void> {
    const details: SecondFactorChangeAuditDetails = {
      method: input.method,
      observedAt: input.observedAt,
    };
    if (input.sourceFlowId !== undefined) {
      details.sourceFlowId = input.sourceFlowId;
    }
    if (input.requestContext?.userAgent !== undefined) {
      details.requestContext = { userAgent: input.requestContext.userAgent };
    }
    await this.write(this.entityManager, {
      subjectUserId: user.id,
      initiatorUserId: user.id,
      initiatorRole: PlatformAuditInitiatorRole.SELF,
      outcome: PlatformAuditOutcome.OBSERVED,
      correlationId: input.correlationId,
      details,
    });
  }

  /** The notice to the member could not be published. */
  async recordSignalFailed(
    user: SecondFactorSubject,
    input: {
      failureReason: SecuritySignalFailureReason;
      correlationId: string;
    }
  ): Promise<void> {
    await this.write(this.entityManager, {
      subjectUserId: user.id,
      initiatorUserId: user.id,
      initiatorRole: PlatformAuditInitiatorRole.SELF,
      outcome: PlatformAuditOutcome.SECURITY_SIGNAL_FAILED,
      failureReason: input.failureReason,
      correlationId: input.correlationId,
    });
  }

  private async writeReset(
    actor: ActorContext,
    target: SecondFactorSubject,
    ids: ResetIds,
    outcome: PlatformAuditOutcome,
    details: SecondFactorResetAuditDetails,
    failureReason?: SecondFactorResetFailureReason
  ): Promise<void> {
    await this.write(this.entityManager, {
      subjectUserId: target.id,
      initiatorUserId: actor.actorID,
      initiatorRole: resolveInitiatorRole({
        actorCredentialTypes: credentialTypes(actor),
        intendedOwners: RESET_OWNERS,
      }),
      outcome,
      failureReason,
      correlationId: ids.correlationId,
      details,
    });
  }

  private async write(
    manager: EntityManager,
    row: Partial<PlatformAuditEntry>
  ): Promise<void> {
    const entry = manager.create(PlatformAuditEntry, {
      ...row,
      category: PlatformAuditCategory.AUTHENTICATION,
    });
    await manager.save(entry);
  }
}

function credentialTypes(actor: ActorContext): AuthorizationCredential[] {
  return actor.credentials.map(c => c.type as AuthorizationCredential);
}
