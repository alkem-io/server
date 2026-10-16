import { DevicePushToken } from '@domain/device-push-token/device.push.token.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RegisterDevicePushTokenInput } from './dto/device.push.token.dto.register.input';

@Injectable()
export class DevicePushTokenService {
  constructor(
    @InjectRepository(DevicePushToken)
    private devicePushTokenRepository: Repository<DevicePushToken>
  ) {}

  /**
   * Bind a device token to a user in ONE statement. `token` is UNIQUE, so the
   * upsert rebinds a token already held by someone else — which is what keeps
   * user A's notifications off a device now signed in as user B. A `findOne`
   * before the write is the live defect X-3; a `findOne` after it has nothing
   * to populate, since the mutation returns `Boolean`.
   */
  async register(
    userId: string,
    { token, platform }: RegisterDevicePushTokenInput
  ): Promise<void> {
    await this.devicePushTokenRepository.upsert(
      { token, platform, userId },
      { conflictPaths: ['token'] }
    );
  }

  /**
   * Unbind a device token from the signed-in user. The `userId` term IS the
   * authorization: it is what stops user B unbinding user A's device. Both an
   * unknown token and another user's token are no-op deletes.
   */
  async unregister(userId: string, token: string): Promise<void> {
    await this.devicePushTokenRepository.delete({ token, userId });
  }

  /**
   * The fan-out read. Mirrors `getActiveSubscriptions` — there is no `status`
   * column to filter on, because a dead token is reclaimed by the transport's
   * own verdict (`deleteByToken`), not by a lifecycle field.
   */
  async getTokensForUsers(userIds: string[]): Promise<DevicePushToken[]> {
    if (userIds.length === 0) return [];
    return this.devicePushTokenRepository.find({
      where: { userId: In(userIds) },
    });
  }

  /**
   * Delete a provably dead device address, on a verdict from the transport
   * (APNs 410 / 400 BadDeviceToken). Deliberately NOT self-scoped, unlike
   * `unregister`: the verdict is about the device, whoever currently holds it,
   * and scoping it to the message's user would leave a dead row alive whenever
   * the device had been rebound since fan-out.
   */
  async deleteByToken(token: string): Promise<void> {
    await this.devicePushTokenRepository.delete({ token });
  }
}
