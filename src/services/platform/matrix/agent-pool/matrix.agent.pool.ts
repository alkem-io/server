/* eslint-disable @typescript-eslint/no-var-requires */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MatrixManagementUserService } from '@src/services/platform/matrix/management/matrix.management.user.service';
import { MatrixAgent } from '@src/services/platform/matrix/agent-pool/matrix.agent';

@Injectable()
export class MatrixAgentPool {
  private _wrappers: Record<string, MatrixAgent>;
  private _sessions: Record<string, string>;

  constructor(
    private configService: ConfigService,
    private userService: MatrixManagementUserService
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
    if (!this._wrappers[email]) {
      const operatingUser = await this.acquireUser(email);
      const client = new MatrixAgent(this.configService, operatingUser);
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
    const isRegistered = await this.userService.isRegistered(email);

    if (isRegistered) {
      return await this.userService.login(email);
    }

    return await this.userService.register(email);
  }

  release(email: string): void {
    if (this._wrappers[email]) {
      this._wrappers[email].dispose();
      delete this._wrappers[email];
    }
  }
}
