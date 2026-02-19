import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscription } from './push.subscription.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';

@Injectable()
export class PushSubscriptionService {
  constructor(
    @InjectRepository(PushSubscription)
    private pushSubscriptionRepository: Repository<PushSubscription>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async createOrUpdate(
    userID: string,
    endpoint: string,
    p256dh: string,
    auth: string
  ): Promise<PushSubscription> {
    const existing = await this.pushSubscriptionRepository.findOne({
      where: { endpoint },
    });

    if (existing) {
      // Update keys if the subscription already exists
      existing.p256dh = p256dh;
      existing.auth = auth;
      existing.userID = userID;
      return this.pushSubscriptionRepository.save(existing);
    }

    const subscription = this.pushSubscriptionRepository.create({
      userID,
      endpoint,
      p256dh,
      auth,
    });

    this.logger.verbose?.(
      'Created new push subscription',
      LogContext.NOTIFICATIONS
    );

    return this.pushSubscriptionRepository.save(subscription);
  }

  public async deleteByEndpoint(endpoint: string): Promise<boolean> {
    const result = await this.pushSubscriptionRepository.delete({ endpoint });
    return (result.affected ?? 0) > 0;
  }

  public async findByUserID(userID: string): Promise<PushSubscription[]> {
    return this.pushSubscriptionRepository.find({ where: { userID } });
  }

  public async findByUserIDs(userIDs: string[]): Promise<PushSubscription[]> {
    if (userIDs.length === 0) {
      return [];
    }
    return this.pushSubscriptionRepository
      .createQueryBuilder('ps')
      .where('ps.userID IN (:...userIDs)', { userIDs })
      .getMany();
  }

  public async deleteByID(id: string): Promise<boolean> {
    const result = await this.pushSubscriptionRepository.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
