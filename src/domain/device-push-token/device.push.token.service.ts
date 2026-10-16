import { DevicePushToken } from '@domain/device-push-token/device.push.token.entity';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AlkemioConfig } from '@src/types';
import { In, Repository } from 'typeorm';
import { RegisterDevicePushTokenInput } from './dto/device.push.token.dto.register.input';

@Injectable()
export class DevicePushTokenService {
  private readonly maxTokensPerUser: number;

  constructor(
    @InjectRepository(DevicePushToken)
    private devicePushTokenRepository: Repository<DevicePushToken>,
    configService: ConfigService<AlkemioConfig, true>
  ) {
    this.maxTokensPerUser = configService.get<number>(
      'notifications.push.max_subscriptions_per_user' as any
    );
  }

  /**
   * Bind a device token to a user in ONE statement. `token` is UNIQUE, so the
   * upsert rebinds a token already held by someone else — which is what keeps
   * user A's notifications off a device now signed in as user B. A `findOne`
   * before the write is the live defect X-3; a `findOne` after it has nothing
   * to populate, since the mutation returns `Boolean`.
   *
   * The eviction after it is SEC-086-01 / ENG-086-SRV-02, and it amends hard
   * constraint 3's "no per-user cap": this mutation is `NON_ADMIN`, so without
   * a bound one authenticated caller mints unbounded rows and EVERY later
   * notification for them publishes one AMQP message per row onto the queue
   * that carries all web push too. It is the same bound the web half already
   * enforces (`push.subscription.service.ts` `enforceSubscriptionCap`), off the
   * same config value — not a new mechanism, and still no `status`, no
   * `lastActiveDate` and no `@Cron`.
   */
  async register(
    userId: string,
    { token, platform }: RegisterDevicePushTokenInput
  ): Promise<void> {
    await this.devicePushTokenRepository.upsert(
      { token, platform, userId },
      { conflictPaths: ['token'] }
    );

    const tokens = await this.devicePushTokenRepository.find({
      where: { userId },
      order: { updatedDate: 'DESC' },
      select: { id: true },
    });
    const beyondCap = tokens.slice(this.maxTokensPerUser);
    if (beyondCap.length > 0) {
      await this.devicePushTokenRepository.delete(
        beyondCap.map(evicted => evicted.id)
      );
    }
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
