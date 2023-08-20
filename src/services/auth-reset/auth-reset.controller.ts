import { Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';
import { SpaceAuthorizationService } from '@domain/challenge/space/space.service.authorization';
import { setTimeout } from 'timers/promises';

@Controller()
export class AuthResetController {
  constructor(private spaceAuthorizationService: SpaceAuthorizationService) {}
  @EventPattern('space-reset', Transport.RMQ)
  public async authResetSpace(
    @Payload() payload: { id: string },
    @Ctx() context: RmqContext
  ) {
    console.log('got', payload);

    const res = await setTimeout(700, () => {
      const channel: Channel = context.getChannelRef();
      const originalMsg = context.getMessage() as Message;
      console.log('finished', payload)
      channel.ack(originalMsg);
    });
    res();
    // await this.spaceAuthorizationService.applyAuthorizationPolicy({
    //   id: payload.id,
    // } as any);
  }

  @EventPattern(undefined)
  undefinedMessages(@Payload() payload: any, @Ctx() context: RmqContext) {
    console.error(payload);

    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    channel.ack(originalMsg);
  }
}
