/* eslint-disable @typescript-eslint/no-var-requires */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MatrixUserService } from '@src/services/platform/matrix/user/user.matrix.service';
import { MatrixCommunicationClient } from './communication.matrix.pool.client';

@Injectable()
export class MatrixCommunicationPool {
  private _clients: Record<string, MatrixCommunicationClient>;
  private _sessions: Record<string, string>;

  constructor(
    private configService: ConfigService,
    private userService: MatrixUserService
  ) {
    /* TODO
      - need to create sliding expiration mechanism
      - additionally have a maximum pool size and destroy clients to make space for new ones
      - need to expose mechanism to subscribe (socket) using the event-dispatcher
    */
    this._clients = {};
    this._sessions = {};
  }

  async acquire(
    email: string,
    session?: string
  ): Promise<MatrixCommunicationClient> {
    if (!this._clients[email]) {
      const operatingUser = await this.acquireUser(email);
      const client = new MatrixCommunicationClient(
        this.configService,
        operatingUser
      );
      await client.start();

      this._clients[email] = client;
      if (session) {
        this._sessions[session] = email;
      }
    }

    return this._clients[email];
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
    if (this._clients[email]) {
      this._clients[email].dispose();
      delete this._clients[email];
    }
  }
}
