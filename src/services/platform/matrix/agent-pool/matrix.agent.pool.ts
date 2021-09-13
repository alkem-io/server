/* eslint-disable @typescript-eslint/no-var-requires */
import { LogContext } from '@common/enums';
import { MatrixAgentPoolException } from '@common/exceptions';
import { Disposable } from '@interfaces/disposable.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common/interfaces';
import { MatrixUserManagementService } from '@src/services/platform/matrix/management/matrix.user.management.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixAgent, MatrixAgentMiddlewares } from '../agent/matrix.agent';
import { MatrixAgentService } from '../agent/matrix.agent.service';

@Injectable()
export class MatrixAgentPool
  implements Disposable, OnModuleDestroy, OnModuleInit
{
  private _cache: Record<string, { agent: MatrixAgent; expiresOn: number }>;
  private _sessions: Record<string, string>;
  private _intervalService!: NodeJS.Timer;

  constructor(
    private matrixAgentService: MatrixAgentService,
    private matrixUserManagementService: MatrixUserManagementService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this._cache = {};
    this._sessions = {};
  }

  onModuleInit() {
    this._intervalService = setInterval(
      function (this: MatrixAgentPool) {
        // implement basic caching - the cache-manager should not be used for dto's only
        const now = new Date().getTime();
        for (const key in this._cache) {
          if (this._cache[key].expiresOn < now) {
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

  async acquire(
    email: string,
    session?: string,
    middlewares?: MatrixAgentMiddlewares
  ): Promise<MatrixAgent> {
    this.logger.verbose?.(
      `[AgentPool] obtaining user for email: ${email}`,
      LogContext.COMMUNICATION
    );
    if (!email || email.length === 0) {
      throw new MatrixAgentPoolException(
        `Invalid email address provided: ${email}`,
        LogContext.COMMUNICATION
      );
    }

    const getExpirationDateTicks = () => new Date().getTime() + 1000 * 60 * 15;

    if (!this._cache[email]) {
      const operatingUser = await this.acquireUser(email);
      const client = await this.matrixAgentService.createMatrixAgent(
        operatingUser
      );
      await client.start(middlewares);

      this._cache[email] = {
        agent: client,
        expiresOn: getExpirationDateTicks(),
      };
    } else {
      this._cache[email].expiresOn = getExpirationDateTicks();
    }

    if (session) {
      this._sessions[session] = email;
    }

    return this._cache[email].agent;
  }

  async acquireSession(session: string) {
    const email = this._sessions[session];

    return this.acquire(email);
  }

  async releaseSession(session: string) {
    delete this._sessions[session];
  }

  private async acquireUser(email: string) {
    const isRegistered = await this.matrixUserManagementService.isRegistered(
      email
    );

    if (isRegistered) {
      return await this.matrixUserManagementService.login(email);
    }

    return await this.matrixUserManagementService.register(email);
  }

  release(email: string): void {
    this.logger.verbose?.(
      `[AgentPool] releasing session for email: ${email}`,
      LogContext.COMMUNICATION
    );
    if (this._cache[email]) {
      this._cache[email].agent.dispose();
      delete this._cache[email];
    }
  }
}
