/* eslint-disable @typescript-eslint/no-var-requires */
import { ConfigurationTypes, LogContext } from '@common/enums';
import {
  MatrixAgentPoolException,
  NotSupportedException,
} from '@common/exceptions';
import { Disposable } from '@interfaces/disposable.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common/interfaces';
import { MatrixUserManagementService } from '@services/external/matrix/management/matrix.user.management.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixAgent } from '../agent/matrix.agent';
import { MatrixAgentService } from '../agent/matrix.agent.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MatrixAgentPool
  implements Disposable, OnModuleDestroy, OnModuleInit
{
  private _cache: Record<string, { agent: MatrixAgent; expiresOn: number }>;
  private _intervalService!: NodeJS.Timer;
  private _agentPoolSize: number;

  constructor(
    private matrixAgentService: MatrixAgentService,
    private configService: ConfigService,
    private matrixUserManagementService: MatrixUserManagementService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this._cache = {};
    this._agentPoolSize = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.agentpool_size;
    if (this._agentPoolSize < 2)
      throw new NotSupportedException(
        `Minimum agent pool size for communications is 2: ${this._agentPoolSize}`,
        LogContext.COMMUNICATION
      );
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

  getOldestAgentKey() {
    const sortedAgents = Object.values(this._cache).sort(
      (agent1, agent2) => agent1.expiresOn - agent2.expiresOn
    );

    // return the key of any
    return Object.keys(this._cache).find(
      // the one with lowest expiration date is the oldest
      key => this._cache[key] === sortedAgents[0]
    );
  }

  async acquire(matrixUserID: string, autoStart = false): Promise<MatrixAgent> {
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
      // if we exceed the pool size dispose of the oldest agent
      if (Object.keys(this._cache).length >= this._agentPoolSize) {
        const oldestAgentKey = this.getOldestAgentKey();
        this.logger.verbose?.(
          `[AgentPool] Cache limit of ${this._agentPoolSize} exceeded, releasing agent for : ${oldestAgentKey}`,
          LogContext.COMMUNICATION
        );

        this.release(oldestAgentKey);
      }

      const operatingUser = await this.acquireMatrixUser(matrixUserID);
      const client = await this.matrixAgentService.createMatrixAgent(
        operatingUser
      );

      if (autoStart) {
        await client.start();
      }

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

  release(matrixUserID?: string): void {
    if (!matrixUserID) {
      return;
    }

    this.logger.verbose?.(
      `[AgentPool] releasing session for matrixUserID: ${matrixUserID}`,
      LogContext.COMMUNICATION
    );

    // should be thread-safe
    if (this._cache[matrixUserID]) {
      delete this._cache[matrixUserID];
      try {
        // might be already automatically disposed or disposed from a different thread
        const cachedEntry = this._cache[matrixUserID];
        if (cachedEntry) {
          cachedEntry.agent.dispose();
        }
      } catch (error) {
        this.logger.error?.(
          `[AgentPool] releasing session for matrixUserID: ${matrixUserID} failed, ${error}`,
          LogContext.COMMUNICATION
        );
      }
    }
  }
}
