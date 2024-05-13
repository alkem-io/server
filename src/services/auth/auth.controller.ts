import { Channel, Message } from 'amqplib';
import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { AccessGrantedInputData } from './types';
import { AuthService } from './auth.service';
import { AuthMessagePattern } from '@services/auth/types/auth.message.pattern';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(AuthMessagePattern.ACCESS_GRANTED_WHITEBOARDS, Transport.RMQ)
  public async accessGrantedWhiteboard(
    @Payload() data: AccessGrantedInputData,
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
