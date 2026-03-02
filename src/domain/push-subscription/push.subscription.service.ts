import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { PushSubscription } from '@domain/push-subscription/push.subscription.entity';
import { PushSubscriptionStatus } from '@domain/push-subscription/push.subscription.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { In, LessThan, Repository } from 'typeorm';
import { SubscribeToPushNotificationsInput } from './dto/push.subscription.dto.subscribe.input';

@Injectable()
export class PushSubscriptionService {
  private readonly maxSubscriptionsPerUser: number;
  private readonly staleDays: number;

  constructor(
    @InjectRepository(PushSubscription)
    private pushSubscriptionRepository: Repository<PushSubscription>,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.maxSubscriptionsPerUser = this.configService.get<number>(
      'notifications.push.max_subscriptions_per_user' as any
    );
    this.staleDays = this.configService.get<number>(
      'notifications.push.cleanup.stale_days' as any
    );
  }

  async subscribe(
    userId: string,
    input: SubscribeToPushNotificationsInput
  ): Promise<PushSubscription> {
    // Upsert: check if subscription with same endpoint exists
    const existing = await this.pushSubscriptionRepository.findOne({
      where: { endpoint: input.endpoint },
    });

    if (existing) {
      // Update existing subscription
      existing.p256dh = input.p256dh;
      existing.auth = input.auth;
      existing.status = PushSubscriptionStatus.ACTIVE;
      existing.userId = userId;
      if (input.userAgent) {
        existing.userAgent = input.userAgent;
      }
      const saved = await this.pushSubscriptionRepository.save(existing);
      this.logger.verbose?.(
        'Push subscription updated for existing endpoint',
        LogContext.PUSH_NOTIFICATION
      );
      return saved;
    }

    // Enforce max subscriptions per user cap
    await this.enforceSubscriptionCap(userId);

    // Create new subscription
    const subscription = this.pushSubscriptionRepository.create({
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      status: PushSubscriptionStatus.ACTIVE,
      userAgent: input.userAgent,
      userId,
    });

    const saved = await this.pushSubscriptionRepository.save(subscription);
    this.logger.verbose?.(
      'Push subscription created',
      LogContext.PUSH_NOTIFICATION
    );
    return saved;
  }

  async unsubscribe(
    subscriptionId: string,
    userId: string
  ): Promise<PushSubscription> {
    const subscription = await this.pushSubscriptionRepository.findOne({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new EntityNotFoundException(
        'Push subscription not found',
        LogContext.PUSH_NOTIFICATION,
        { subscriptionId, userId }
      );
    }

    await this.pushSubscriptionRepository.remove(subscription);
    // Return the removed entity with its id preserved for the response
    subscription.id = subscriptionId;
    return subscription;
  }

  async getActiveSubscriptions(userIds: string[]): Promise<PushSubscription[]> {
    if (userIds.length === 0) return [];
    return this.pushSubscriptionRepository.find({
      where: {
        userId: In(userIds),
        status: PushSubscriptionStatus.ACTIVE,
      },
    });
  }

  async markActive(subscriptionId: string): Promise<void> {
    await this.pushSubscriptionRepository.update(subscriptionId, {
      lastActiveDate: new Date(),
    });
  }

  async markExpired(subscriptionId: string): Promise<void> {
    await this.pushSubscriptionRepository.update(subscriptionId, {
      status: PushSubscriptionStatus.EXPIRED,
    });
    this.logger.verbose?.(
      'Push subscription marked as expired',
      LogContext.PUSH_NOTIFICATION
    );
  }

  async cleanupStale(staleDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - staleDays);

    const result = await this.pushSubscriptionRepository.delete({
      lastActiveDate: LessThan(cutoffDate),
      status: PushSubscriptionStatus.ACTIVE,
    });

    // Also clean up expired subscriptions
    const expiredResult = await this.pushSubscriptionRepository.delete({
      status: PushSubscriptionStatus.EXPIRED,
    });

    const totalDeleted = (result.affected ?? 0) + (expiredResult.affected ?? 0);
    return totalDeleted;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleStaleCleanup(): Promise<void> {
    const deletedCount = await this.cleanupStale(this.staleDays);
    this.logger.verbose?.(
      { message: 'Stale push subscription cleanup completed', deletedCount },
      LogContext.PUSH_NOTIFICATION
    );
  }

  private async enforceSubscriptionCap(userId: string): Promise<void> {
    const activeSubscriptions = await this.pushSubscriptionRepository.find({
      where: { userId, status: PushSubscriptionStatus.ACTIVE },
      order: { createdDate: 'ASC' },
    });

    if (activeSubscriptions.length >= this.maxSubscriptionsPerUser) {
      // Remove oldest subscriptions to make room
      const toRemove = activeSubscriptions.slice(
        0,
        activeSubscriptions.length - this.maxSubscriptionsPerUser + 1
      );
      await this.pushSubscriptionRepository.remove(toRemove);
      this.logger.verbose?.(
        {
          message: 'Subscription cap enforced, removed oldest subscriptions',
          removedCount: toRemove.length,
        },
        LogContext.PUSH_NOTIFICATION
      );
    }
  }
}
