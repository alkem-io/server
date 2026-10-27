import { LogContext } from '@common/enums';
import { OperationNotAllowedException } from '@common/exceptions/operation.not.allowed.exception';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { MatrixSessionAuditDetails } from '@domain/community/user-email-change/platform.audit.entry.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { MatrixSessionCredentials } from './dto/matrix.session.credentials';

const MINT_WINDOW_SECONDS = 60;
const MINT_MAX_PER_ACTOR_PER_WINDOW = 10;

@Injectable()
export class MatrixSessionService {
  constructor(
    @InjectRepository(PlatformAuditEntry)
    private readonly auditRepository: Repository<PlatformAuditEntry>,
    private readonly communicationAdapter: CommunicationAdapter,
    @Inject(MESSAGING_REDIS_CLIENT) private readonly redis: Redis,
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
    // Per-actor bound on the mint, claimed before anything is issued
    // (workspace#091 D11 as amended). The window is an epoch-minute suffix on
    // the key, so a counter whose EXPIRE did not land belongs to a minute that
    // is never written again and cannot throttle anyone permanently.
    const epochMinute = Math.floor(Date.now() / (MINT_WINDOW_SECONDS * 1000));
    const mintKey = `matrix-session:mint:${actorID}:${epochMinute}`;
    let mintsInWindow: number;
    try {
      mintsInWindow = await this.redis.incr(mintKey);
      if (mintsInWindow === 1) {
        await this.redis.expire(mintKey, MINT_WINDOW_SECONDS);
      }
    } catch (error: unknown) {
      // Fails OPEN, like every other messaging-Redis caller: chat sign-in
      // must not stop working because the store is down.
      this.logger.error(
        `Matrix session mint quota store error - failing open for actor ${actorID}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.COMMUNICATION
      );
      mintsInWindow = 0;
    }
    if (mintsInWindow > MINT_MAX_PER_ACTOR_PER_WINDOW) {
      throw new OperationNotAllowedException(
        'Too many Matrix session mints for this actor - try again shortly.',
        LogContext.COMMUNICATION
      );
    }

    const credentials =
      await this.communicationAdapter.createActorSession(actorID);

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
          // An explicit allowlist, never a spread of the adapter response: a
          // spread would put the minted access token into the audit row.
          details: {
            deviceId: credentials.deviceId,
          } satisfies MatrixSessionAuditDetails,
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
