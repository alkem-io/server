import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AlkemioConfig } from '@src/types';
import { createPool, Pool, PoolOptions, RowDataPacket } from 'mysql2/promise';

export type KratosSessionSyncConfig =
  AlkemioConfig['identity']['authentication']['providers']['oidc']['session_sync'];

export type KratosExpiredSession = {
  id: string;
  identity_id: string;
};

@Injectable()
export class KratosSessionRepository implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    const sessionSyncConfig = this.getSessionSyncConfig();
    this.pool = this.createPool(sessionSyncConfig);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end().catch((error: Error) => {
      this.logger.warn?.(`Failed to close Kratos MySQL pool: ${error.message}`);
    });
  }

  async findExpiredSessions(limit = 100): Promise<KratosExpiredSession[]> {
    const query =
      'SELECT id, identity_id FROM sessions WHERE active = 1 AND expires_at < NOW() LIMIT ?';
    const [rows] = await this.pool.query<RowDataPacket[]>(query, [limit]);
    return rows.map(row => ({
      id: String(row.id ?? ''),
      identity_id: String(row.identity_id ?? ''),
    }));
  }

  async getIdentityTraits(
    identityId: string
  ): Promise<Record<string, unknown> | null> {
    const query = 'SELECT traits FROM identities WHERE id = ? LIMIT 1';
    const [rows] = await this.pool.query<RowDataPacket[]>(query, [identityId]);
    const traitsRaw = rows[0]?.traits;

    if (!traitsRaw) {
      return null;
    }

    try {
      if (typeof traitsRaw === 'string') {
        return JSON.parse(traitsRaw) as Record<string, unknown>;
      }

      if (Buffer.isBuffer(traitsRaw)) {
        return JSON.parse(traitsRaw.toString('utf-8')) as Record<
          string,
          unknown
        >;
      }

      return traitsRaw as Record<string, unknown>;
    } catch (error) {
      const err = error as Error;
      this.logger.warn?.(
        `Failed to parse traits JSON for identity ${identityId}: ${err.message}`
      );
      return null;
    }
  }

  async markSessionInactive(sessionId: string): Promise<void> {
    await this.pool.query('UPDATE sessions SET active = 0 WHERE id = ?', [
      sessionId,
    ]);
  }

  private getSessionSyncConfig(): KratosSessionSyncConfig {
    const config = this.configService.get(
      'identity.authentication.providers.oidc.session_sync',
      { infer: true }
    );

    if (!config) {
      throw new Error(
        'identity.authentication.providers.oidc.session_sync is not configured'
      );
    }

    return config;
  }

  private createPool(config: KratosSessionSyncConfig): Pool {
    const db = config.kratos_database;
    const storageDb = this.configService.get('storage.database', {
      infer: true,
    });

    if (!storageDb) {
      throw new Error('storage.database is not configured');
    }

    const host = db.host ?? storageDb.host;
    const port = db.port ?? storageDb.port;
    const user = db.username ?? storageDb.username;
    const password = db.password ?? storageDb.password;
    const database = db.database ?? storageDb.database;

    const options: PoolOptions = {
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 5,
      idleTimeout: 60_000,
      queueLimit: 0,
    };

    return createPool(options);
  }
}
