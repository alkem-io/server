import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import {
  AccountDeletionAuditDetails,
  IPlatformAuditEntry,
} from '@domain/community/user-email-change/platform.audit.entry.interface';
import { PlatformAuditEntryRepository } from '@domain/community/user-email-change/platform.audit.entry.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export interface WriteAccountDeletionPrimaryInput {
  subjectUserId: string;
  /**
   * The actor who performed the deletion. Equal to `subjectUserId` on the
   * self branch; on the admin branch this is the ONLY thing that identifies
   * which administrator acted, since `initiatorRole` alone cannot.
   */
  initiatorUserId?: string;
  initiatorRole: PlatformAuditInitiatorRole;
  accountID: string;
  externalSubscriptionID?: string | null;
  documentCount: number;
}

/**
 * Writes the account-deletion audit trail: one primary record atomic with
 * the primary-store deletion, plus one appended, best-effort record per
 * post-commit external leg. Never writes the departed user's display name
 * or email — `AccountDeletionAuditDetails` is an allowlist that has no field
 * for either.
 */
@Injectable()
export class AccountDeletionAuditService {
  constructor(private auditEntryRepository: PlatformAuditEntryRepository) {}

  /**
   * Writes the primary record using the caller's transactional
   * EntityManager, so it commits or rolls back atomically with the
   * deletion itself.
   */
  public async writePrimary(
    em: EntityManager,
    input: WriteAccountDeletionPrimaryInput
  ): Promise<IPlatformAuditEntry> {
    const details: AccountDeletionAuditDetails = {
      accountID: input.accountID,
      blockerCheck: 'pass',
      externalSubscriptionID: input.externalSubscriptionID ?? null,
      documentCount: input.documentCount,
    };
    return this.auditEntryRepository.appendAccountDeletionEntry(
      {
        subjectUserId: input.subjectUserId,
        initiatorUserId: input.initiatorUserId,
        initiatorRole: input.initiatorRole,
        outcome: PlatformAuditOutcome.ACCOUNT_DELETED,
        details,
      },
      em
    );
  }

  /**
   * Appends a post-commit leg outcome (session revocation, identity
   * deletion, file-bytes cleanup) — always outside any transaction, always
   * best-effort: the caller never lets a failure here fail the deletion.
   */
  public async appendLegOutcome(
    subjectUserId: string,
    initiatorRole: PlatformAuditInitiatorRole,
    outcome: PlatformAuditOutcome,
    details?: AccountDeletionAuditDetails
  ): Promise<IPlatformAuditEntry> {
    return this.auditEntryRepository.appendAccountDeletionEntry({
      subjectUserId,
      initiatorRole,
      outcome,
      details,
    });
  }
}
