import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SynapseAdminService } from '@services/infrastructure/synapse/synapse-admin.service';
import { AlkemioConfig } from '@src/types';
import {
  KratosSessionRepository,
  KratosSessionSyncConfig,
} from '@services/session-sync/kratos-session.repository';

@Injectable()
export class SessionSyncService implements OnModuleInit, OnModuleDestroy {
  private static readonly intervalName = 'kratos-session-sync';
  private readonly enabled: boolean;
  private readonly intervalMs: number;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly synapseAdminService: SynapseAdminService,
    private readonly kratosSessionRepository: KratosSessionRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    const sessionSyncConfig = this.getSessionSyncConfig();
    this.enabled = sessionSyncConfig.enabled;
    this.intervalMs = Math.max(sessionSyncConfig.interval_ms, 60_000);
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.debug?.(
        'Kratos session sync disabled; skipping scheduler registration'
      );
      return;
    }

    if (
      this.schedulerRegistry.doesExist(
        'interval',
        SessionSyncService.intervalName
      )
    ) {
      this.logger.warn?.(
        'Session sync interval already registered; skipping duplicate registration'
      );
      return;
    }

    const handler = async () => {
      try {
        await this.syncExpiredSessions();
      } catch (error) {
        const err = error as Error;
        this.logger.error?.(
          `Session synchronization failed: ${err.message}`,
          err.stack
        );
      }
    };

    const interval = setInterval(handler, this.intervalMs);
    this.schedulerRegistry.addInterval(
      SessionSyncService.intervalName,
      interval
    );
    this.logger.log?.(
      `Scheduled Kratos session sync every ${this.intervalMs}ms`
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (
      this.schedulerRegistry.doesExist(
        'interval',
        SessionSyncService.intervalName
      )
    ) {
      const interval = this.schedulerRegistry.getInterval(
        SessionSyncService.intervalName
      );
      clearInterval(interval);
      this.schedulerRegistry.deleteInterval(SessionSyncService.intervalName);
    }
  }

  private async syncExpiredSessions(): Promise<void> {
    const start = Date.now();
    const expiredSessions =
      await this.kratosSessionRepository.findExpiredSessions();

    if (expiredSessions.length === 0) {
      this.logger.debug?.('No expired Kratos sessions found');
      return;
    }

    this.logger.log?.(
      `Processing ${expiredSessions.length} expired Kratos sessions`
    );

    let processed = 0;
    for (const session of expiredSessions) {
      const email = await this.getIdentityEmail(session.identity_id);
      if (!email) {
        this.logger.warn?.(
          `Skipping session ${session.id}; identity email missing`
        );
        continue;
      }

      try {
        await this.synapseAdminService.terminateSessionsByEmail(email);
        await this.kratosSessionRepository.markSessionInactive(session.id);
        processed += 1;
      } catch (error) {
        const err = error as Error;
        this.logger.error?.(
          `Failed to synchronize session ${session.id}: ${err.message}`
        );
      }
    }

    const duration = Date.now() - start;
    this.logger.log?.(
      `Kratos session sync finished: processed=${processed}, duration=${duration}ms`
    );
  }

  private async getIdentityEmail(identityId: string): Promise<string | null> {
    const traits =
      await this.kratosSessionRepository.getIdentityTraits(identityId);

    if (!traits) {
      return null;
    }

    const emailValue = (traits as { email?: string }).email;
    if (typeof emailValue === 'string' && emailValue.length > 0) {
      return emailValue;
    }

    return null;
  }

  private getSessionSyncConfig(): KratosSessionSyncConfig {
    const config = this.configService.get(
      'identity.authentication.providers.ory.session_sync',
      { infer: true }
    );

    if (!config) {
      throw new Error(
        'identity.authentication.providers.ory.session_sync is not configured'
      );
    }

    return config;
  }
}
