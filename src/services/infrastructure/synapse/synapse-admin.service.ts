import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { Pool, PoolClient, QueryResult } from 'pg';

type MatrixDatabaseConfig =
  AlkemioConfig['communications']['matrix']['database'];

@Injectable()
export class SynapseAdminService implements OnModuleDestroy {
  private readonly logger = new Logger(SynapseAdminService.name);
  private readonly adminBaseUrl: string;
  private readonly adminToken?: string;
  private readonly databasePool: Pool;
  private readonly authProvider: string;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly httpService: HttpService
  ) {
    const matrixConfig = this.configService.get('communications.matrix', {
      infer: true,
    });

    if (!matrixConfig?.admin_api?.url) {
      throw new Error('communications.matrix.admin_api.url is not configured');
    }

    this.authProvider = matrixConfig.oidc_provider_id || 'oidc-oidc-hydra';

    this.adminBaseUrl = this.trimTrailingSlash(matrixConfig.admin_api.url);
    this.adminToken = matrixConfig.admin_api.token;

    const dbConfig = matrixConfig.database;
    this.databasePool = this.createPool(dbConfig);
  }

  async onModuleDestroy(): Promise<void> {
    await this.databasePool.end().catch((error: Error) => {
      this.logger.warn(
        `Failed to close Synapse database pool: ${error.message}`
      );
    });
  }

  async terminateSessionsByEmail(email: string | undefined): Promise<number> {
    if (!email) {
      this.logger.debug('No email provided for Synapse session termination');
      return 0;
    }

    if (!this.adminToken) {
      this.logger.warn(
        'Synapse admin token not configured; skipping Matrix session termination'
      );
      return 0;
    }

    try {
      const matrixUserId = await this.getMatrixUserId(email);
      if (!matrixUserId) {
        this.logger.debug(`No Synapse user found for email ${email}`);
        return 0;
      }

      const devices = await this.getDevices(matrixUserId);
      if (devices.length === 0) {
        this.logger.debug(`Synapse user ${matrixUserId} has no active devices`);
        return 0;
      }

      await this.deleteDevices(matrixUserId, devices);
      this.logger.log(
        `Deleted ${devices.length} Synapse devices for ${matrixUserId}`
      );
      return devices.length;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Matrix session termination failed: ${err.message}`,
        err.stack
      );
      return 0;
    }
  }

  private async getMatrixUserId(email: string): Promise<string | null> {
    const client = await this.getClient();
    try {
      const query =
        'SELECT user_id FROM user_external_ids WHERE auth_provider = $1 AND external_id = $2 LIMIT 1';
      const result: QueryResult<{ user_id: string }> = await client.query(
        query,
        [this.authProvider, email]
      );
      return result.rows[0]?.user_id ?? null;
    } finally {
      client.release();
    }
  }

  private async getDevices(userId: string): Promise<string[]> {
    const url = `${this.adminBaseUrl}/_synapse/admin/v2/users/${encodeURIComponent(userId)}/devices`;
    const response = await this.httpService.axiosRef.get(url, {
      headers: this.getHeaders(),
    });

    const devices = response.data?.devices ?? [];
    return devices
      .map((device: { device_id: string }) => device.device_id)
      .filter(Boolean);
  }

  private async deleteDevices(
    userId: string,
    deviceIds: string[]
  ): Promise<void> {
    const url = `${this.adminBaseUrl}/_synapse/admin/v2/users/${encodeURIComponent(userId)}/delete_devices`;

    await this.httpService.axiosRef.post(
      url,
      { devices: deviceIds },
      {
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
      }
    );
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.adminToken}`,
    };
  }

  private createPool(dbConfig: MatrixDatabaseConfig): Pool {
    const ssl = dbConfig.ssl
      ? {
          rejectUnauthorized: false,
        }
      : undefined;

    return new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      ssl,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }

  private async getClient(): Promise<PoolClient> {
    return this.databasePool.connect();
  }

  private trimTrailingSlash(value: string): string {
    return value.endsWith('/') ? value.slice(0, -1) : value;
  }
}
