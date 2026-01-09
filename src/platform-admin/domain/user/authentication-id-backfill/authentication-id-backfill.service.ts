import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AdminAuthenticationIDBackfillResult } from './dto/admin.authentication-id-backfill.result';
import { User } from '@domain/community/user/user.entity';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AgentInfoCacheService } from '@core/authentication.agent.info/agent.info.cache.service';
import { LogContext } from '@common/enums';
import { Identity } from '@ory/kratos-client';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';
import { UserService } from '@domain/community/user/user.service';

@Injectable()
export class AdminAuthenticationIDBackfillService {
  private static readonly DEFAULT_BATCH_SIZE = 100;

  constructor(
    private readonly userService: UserService,
    private readonly kratosService: KratosService,
    private readonly agentInfoCacheService: AgentInfoCacheService,
    @InjectEntityManager('default')
    private readonly entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async backfillAuthenticationIDs(): Promise<AdminAuthenticationIDBackfillResult> {
    const outcome: AdminAuthenticationIDBackfillResult = {
      processed: 0,
      updated: 0,
      skipped: 0,
      retriedBatches: 0,
    };

    this.logger.log?.(
      'Starting authentication ID backfill run',
      LogContext.AUTH
    );

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.fetchBatch(offset);
      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      const snapshot = { ...outcome };
      try {
        await this.processBatch(batch, outcome);
      } catch (error) {
        outcome.processed = snapshot.processed;
        outcome.updated = snapshot.updated;
        outcome.skipped = snapshot.skipped;
        outcome.retriedBatches = snapshot.retriedBatches;

        this.logger.error?.(
          `Backfill batch failed at offset ${offset}: ${(error as Error)?.message}`,
          (error as Error)?.stack,
          LogContext.AUTH
        );

        try {
          await this.processBatch(batch, outcome);
          outcome.retriedBatches += 1;
          this.logger.warn?.(
            `Backfill batch at offset ${offset} succeeded on retry`,
            LogContext.AUTH
          );
        } catch (retryError) {
          this.logger.error?.(
            `Backfill batch at offset ${offset} failed after retry: ${(retryError as Error)?.message}`,
            (retryError as Error)?.stack,
            LogContext.AUTH
          );
          throw retryError;
        }
      }

      offset += batch.length;
    }

    this.logger.log?.(
      `Completed authentication ID backfill run: processed=${outcome.processed}, updated=${outcome.updated}, skipped=${outcome.skipped}, retriedBatches=${outcome.retriedBatches}`,
      LogContext.AUTH
    );

    return outcome;
  }

  private async fetchBatch(offset: number): Promise<User[]> {
    return await this.entityManager
      .createQueryBuilder(User, 'user')
      .orderBy('user.rowId', 'ASC')
      .skip(offset)
      .take(AdminAuthenticationIDBackfillService.DEFAULT_BATCH_SIZE)
      .getMany();
  }

  private async processBatch(
    users: User[],
    outcome: AdminAuthenticationIDBackfillResult
  ): Promise<void> {
    for (const user of users) {
      outcome.processed += 1;

      if (user.authenticationID) {
        outcome.skipped += 1;
        this.logger.verbose?.(
          `Skipping user ${user.id}: authenticationID already populated`,
          LogContext.AUTH
        );
        continue;
      }

      const identity = await this.lookupIdentity(user);
      if (!identity) {
        outcome.skipped += 1;
        continue;
      }

      const agentInfo = this.buildAgentInfo(identity, user.email);

      try {
        const updatedUser =
          await this.userService.createUserFromAgentInfo(agentInfo);
        if (updatedUser.id !== user.id) {
          outcome.skipped += 1;
          this.logger.warn?.(
            `Backfill for user ${user.id} returned a different profile (${updatedUser.id}); skipping update`,
            LogContext.AUTH
          );
          continue;
        }

        if (updatedUser.authenticationID === identity.id) {
          outcome.updated += 1;
          // Invalidate cache using the newly assigned authenticationID
          await this.agentInfoCacheService.deleteAgentInfoFromCache(
            updatedUser.authenticationID
          );
          this.logger.verbose?.(
            `Backfilled authenticationID for user ${updatedUser.id}`,
            LogContext.AUTH
          );
        } else {
          outcome.skipped += 1;
          this.logger.warn?.(
            `User ${updatedUser.id} did not persist expected authenticationID after backfill`,
            LogContext.AUTH
          );
        }
      } catch (error) {
        this.logger.error?.(
          `Failed to backfill authenticationID for user ${user.id}: ${(error as Error)?.message}`,
          (error as Error)?.stack,
          LogContext.AUTH
        );
        outcome.skipped += 1;
        continue;
      }
    }
  }

  private async lookupIdentity(user: User): Promise<Identity | undefined> {
    const identity = await this.kratosService.getIdentityByEmail(user.email);
    if (!identity) {
      this.logger.warn?.(
        `No Kratos identity found for user ${user.id} (${user.email})`,
        LogContext.AUTH
      );
      return undefined;
    }
    return identity;
  }

  private buildAgentInfo(identity: Identity, fallbackEmail: string): AgentInfo {
    const agentInfo = new AgentInfo();
    const oryIdentity = identity as OryDefaultIdentitySchema;
    const traits = oryIdentity.traits as Record<string, any>;

    const identityEmail = (traits?.email as string) ?? fallbackEmail;

    if (identityEmail !== fallbackEmail) {
      this.logger.warn?.(
        `Kratos identity ${identity.id} email (${identityEmail}) differs from stored user email (${fallbackEmail}); using stored email for backfill`,
        LogContext.AUTH
      );
    }

    agentInfo.email = fallbackEmail;
    agentInfo.firstName = (traits?.name?.first as string) ?? '';
    agentInfo.lastName = (traits?.name?.last as string) ?? '';
    agentInfo.avatarURL = (traits?.picture as string) ?? '';
    agentInfo.authenticationID = identity.id;
    agentInfo.emailVerified = Array.isArray(oryIdentity.verifiable_addresses)
      ? oryIdentity.verifiable_addresses.some(
          (address: { via?: string; verified?: boolean }) =>
            address?.via === 'email' && address?.verified
        )
      : false;
    return agentInfo;
  }
}
