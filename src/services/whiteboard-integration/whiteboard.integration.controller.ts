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
import { WhiteboardIntegrationService } from './whiteboard.integration.service';

@Controller()
export class WhiteboardIntegrationController {
  constructor(private readonly authService: WhiteboardIntegrationService) {}

  @MessagePattern(AuthMessagePattern.ACCESS_GRANTED_WHITEBOARDS, Transport.RMQ)
  public async accessGrantedWhiteboard(
    @Payload() data: AccessGrantedInputData,
    @Ctx() context: RmqContext
  ): Promise<boolean> {
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
