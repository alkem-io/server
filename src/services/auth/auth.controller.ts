import { Channel, Message } from 'amqplib';
import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import {
  AccessGrantedInputData,
  WhoInputData,
  UserInfo,
  AuthMessagePattern,
} from './types';
import { AuthService } from './auth.service';

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

  @MessagePattern(AuthMessagePattern.WHO, Transport.RMQ)
  public async who(
    @Payload() data: WhoInputData,
    @Ctx() context: RmqContext
  ): Promise<UserInfo> {
    ack(context);
    return this.authService.who(data).then(({ userID }) => ({ id: userID }));
  }
}

const ack = (context: RmqContext) => {
  const channel: Channel = context.getChannelRef();
  const originalMsg = context.getMessage() as Message;
  channel.ack(originalMsg);
};
