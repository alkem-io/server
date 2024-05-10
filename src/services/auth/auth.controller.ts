import { Channel, Message } from 'amqplib';
import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { AccessGrantedData } from './types';
import { AuthService } from './auth.service';

// todo extract patterns to constants
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('accessGrantedWhiteboard', Transport.RMQ)
  public async accessGrantedWhiteboard(
    @Payload() data: AccessGrantedData,
    @Ctx() context: RmqContext
  ): Promise<boolean> {
    console.log(data);
    ack(context);
    return this.authService.accessGrantedWhiteboard(data);
  }
}

const ack = (context: RmqContext) => {
  const channel: Channel = context.getChannelRef();
  const originalMsg = context.getMessage() as Message;
  channel.ack(originalMsg);
};
