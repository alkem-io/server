import { LogContext } from '@common/enums';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { MatrixSessionAuditDetails } from '@domain/community/user-email-change/platform.audit.entry.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { MatrixSessionCredentials } from './dto/matrix.session.credentials';

@Injectable()
export class MatrixSessionService {
  constructor(
    @InjectRepository(PlatformAuditEntry)
    private readonly auditRepository: Repository<PlatformAuditEntry>,
    private readonly communicationAdapter: CommunicationAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Mint a Matrix session for the caller's OWN actor (workspace#091,
   * FR-009/FR-010).
   *
   * Mint first, then audit: auditing first would record mints that never
   * happened. The audit write is FAIL-CLOSED — if the register cannot record
   * the mint, the credential is not returned, so the orphaned device id is
   * logged at error level (R-4) and the error rethrown.
   */
  async mintForActor(actorID: string): Promise<MatrixSessionCredentials> {
    const credentials =
      await this.communicationAdapter.createActorSession(actorID);

    // An explicit allowlist, never a spread of the adapter response: a
    // spread would put the minted access token into the audit row.
    const details: MatrixSessionAuditDetails = {
      deviceId: credentials.deviceId,
    };

    try {
      await this.auditRepository.save(
        this.auditRepository.create({
          category: PlatformAuditCategory.MATRIX_SESSION,
          // Self-service only: no admin writer exists, so the subject and the
          // initiator are the same actor and the role is unconditionally SELF
          // — including for a non-human actor (FR-009, no actor-type lookup).
          subjectUserId: actorID,
          initiatorUserId: actorID,
          initiatorRole: PlatformAuditInitiatorRole.SELF,
          outcome: PlatformAuditOutcome.KEY_MINTED,
          details,
        })
      );
    } catch (error: unknown) {
      this.logger.error(
        `Matrix session audit write failed - orphaned Matrix device ${credentials.deviceId} for actor ${actorID}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );
      throw error;
    }

    return credentials;
  }
}
