/* eslint-disable @typescript-eslint/no-var-requires */
import { LogContext } from '@common/enums';
import { MatrixAgentPoolException } from '@common/exceptions';
import { Disposable } from '@interfaces/disposable.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common/interfaces';
import { MatrixUserManagementService } from '@src/services/platform/matrix/management/matrix.user.management.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixAgent } from '../agent/matrix.agent';
import { MatrixAgentService } from '../agent/matrix.agent.service';

@Injectable()
export class MatrixAgentPool
  implements Disposable, OnModuleDestroy, OnModuleInit
{
  private _cache: Record<string, { agent: MatrixAgent; expiresOn: number }>;
  private _intervalService!: NodeJS.Timer;

  constructor(
    private matrixAgentService: MatrixAgentService,
    private matrixUserManagementService: MatrixUserManagementService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this._cache = {};
  }

  onModuleInit() {
    this._intervalService = setInterval(
      function (this: MatrixAgentPool) {
        // implement basic caching - the cache-manager should not be used for dto's only
        const now = new Date().getTime();
        for (const key in this._cache) {
          if (this._cache[key].expiresOn > now) {
            continue;
          }

          this.release(key);
        }
      }.bind(this),
      2000
    );
  }

  onModuleDestroy() {
    this.dispose();
  }

  dispose(): void {
    clearInterval(this._intervalService);
    for (const key in this._cache) {
      this.release(key);
    }
  }

  async acquire(matrixUserID: string): Promise<MatrixAgent> {
    this.logger.verbose?.(
      `[AgentPool] obtaining agent for commsID: ${matrixUserID}`,
      LogContext.COMMUNICATION
    );
    if (!matrixUserID || matrixUserID.length === 0) {
      throw new MatrixAgentPoolException(
        `Invalid matrixUserID provided: ${matrixUserID}`,
        LogContext.COMMUNICATION
      );
    }

    const getExpirationDateTicks = () => new Date().getTime() + 1000 * 60 * 15;

    if (!this._cache[matrixUserID]) {
      const operatingUser = await this.acquireMatrixUser(matrixUserID);
      const client = await this.matrixAgentService.createMatrixAgent(
        operatingUser
      );

      await client.start();

      this._cache[matrixUserID] = {
        agent: client,
        expiresOn: getExpirationDateTicks(),
      };
    } else {
      this._cache[matrixUserID].expiresOn = getExpirationDateTicks();
    }

    return this._cache[matrixUserID].agent;
  }

  private async acquireMatrixUser(matrixUserID: string) {
    const isRegistered = await this.matrixUserManagementService.isRegistered(
      matrixUserID
    );

    if (isRegistered) {
      return await this.matrixUserManagementService.login(matrixUserID);
    }

    return await this.matrixUserManagementService.register(matrixUserID);
  }

  release(matrixUserID: string): void {
    this.logger.verbose?.(
      `[AgentPool] releasing session for matrixUserID: ${matrixUserID}`,
      LogContext.COMMUNICATION
    );
    if (this._cache[matrixUserID]) {
      this._cache[matrixUserID].agent.dispose();
      delete this._cache[matrixUserID];
    }
  }
}
