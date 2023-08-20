import { Inject, Injectable } from '@nestjs/common';
import { AUTH_RESET_QUEUE_PROVIDER } from './AuthResetQueueFactoryProvider';
import { PubSubEngine } from 'graphql-subscriptions';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { randomUUID } from 'crypto';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AuthResetService {
  constructor(
    @Inject(AUTH_RESET_QUEUE_PROVIDER)
    private authResetQueue: ClientProxy,
    @InjectEntityManager() private manager: EntityManager
  ) {}

  public async publishAllSpaceReset() {
    // const spaces = await this.manager.find(Space, {
    //   select: { id: true },
    // });
    const spaces = new Array(1000).fill(1).map(x => ({ id: randomUUID() }));
    console.log(`sending ${spaces.length} Spaces`);


    spaces.forEach(({ id }) => this.authResetQueue.emit('space-reset', id));
  }
}
