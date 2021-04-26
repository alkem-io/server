/* eslint-disable @typescript-eslint/no-var-requires */
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MatrixUserService } from '../user/user.matrix.service';
import { MatrixCommunicationService } from './communication.matrix.service';

@Injectable()
export class MatrixCommunicationPool {
  private _clients: Record<string, MatrixCommunicationService>;

  constructor(
    private configService: ConfigService,
    @Inject() private userService: MatrixUserService
  ) {
    /* TODO
      - need to create sliding expiration mechanism
      - additionally have a maximum pool size and destroy clients to make space for new ones
      - need to integrate event-dispatcher and wait for the client sync state
      - need to expose mechanism to subscribe (socket) using the event-dispatcher
    */
    this._clients = {};
  }

  async acquire(userId: string): Promise<MatrixCommunicationService> {
    if (!this._clients[userId]) {
      const operatingUser = await this.userService.login({
        name: userId,
        username: userId,
        password: 'generated_password',
      });
      this._clients[userId] = new MatrixCommunicationService(
        this.configService,
        operatingUser
      );
    }

    return this._clients[userId];
  }

  release(userId: string): void {
    if (this._clients[userId]) {
      this._clients[userId].dispose();
      delete this._clients[userId];
    }
  }
}
