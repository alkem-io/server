/* eslint-disable @typescript-eslint/no-var-requires */
import { LogContext } from '@common/enums';
import { MatrixAgentPoolException } from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { MatrixUserManagementService } from '@src/services/platform/matrix/management/matrix.user.management.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixAgent } from '../agent/matrix.agent';
import { MatrixAgentService } from '../agent/matrix.agent.service';

@Injectable()
export class MatrixAgentPool {
  private _wrappers: Record<string, MatrixAgent>;
  private _sessions: Record<string, string>;

  constructor(
    private matrixAgentService: MatrixAgentService,
    private matrixUserManagementService: MatrixUserManagementService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    /* TODO
      - need to create sliding expiration mechanism
      - additionally have a maximum pool size and destroy clients to make space for new ones
      - need to expose mechanism to subscribe (socket) using the event-dispatcher
    */
    this._wrappers = {};
    this._sessions = {};
  }

  async acquire(email: string, session?: string): Promise<MatrixAgent> {
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
    if (!this._wrappers[email]) {
      const operatingUser = await this.acquireUser(email);
      const client = await this.matrixAgentService.createMatrixAgent(
        operatingUser
      );
      await client.start();

      this._wrappers[email] = client;
      if (session) {
        this._sessions[session] = email;
      }
    }

    return this._wrappers[email];
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
    if (this._wrappers[email]) {
      this._wrappers[email].dispose();
      delete this._wrappers[email];
    }
  }
}
