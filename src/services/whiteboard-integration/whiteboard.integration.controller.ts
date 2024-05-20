import { Channel, Message } from 'amqplib';
import { Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { UserInfo, WhiteboardIntegrationMessagePattern } from './types';
import { WhiteboardIntegrationService } from './whiteboard.integration.service';
import { WhiteboardIntegrationEventPattern } from '@services/whiteboard-integration/types/event.pattern';
import {
  ContentModifiedInputData,
  ContributionInputData,
  InfoInputData,
  WhoInputData,
} from './inputs';
import { InfoOutputData } from '@services/whiteboard-integration/outputs/info.output.data';

/**
 * Controller exposing the Whiteboard Integration service via message queue.
 * It's a way to use the dependencies that the whiteboard server has.
 */
@Controller()
export class WhiteboardIntegrationController {
  constructor(
    private readonly integrationService: WhiteboardIntegrationService
  ) {}

  @MessagePattern(WhiteboardIntegrationMessagePattern.INFO, Transport.RMQ)
  public info(
    @Payload() data: InfoInputData,
    @Ctx() context: RmqContext
  ): Promise<InfoOutputData> {
    ack(context);
    return this.integrationService.info(data);
  }

  @MessagePattern(WhiteboardIntegrationMessagePattern.WHO, Transport.RMQ)
  public async who(
    @Payload() data: WhoInputData,
    @Ctx() context: RmqContext
  ): Promise<UserInfo> {
    ack(context);
    return this.integrationService
      .who(data)
      .then(({ userID, email }) => ({ id: userID, email }));
  }

  @EventPattern(WhiteboardIntegrationEventPattern.CONTRIBUTION, Transport.RMQ)
  public contribution(
    @Payload() data: ContributionInputData,
    @Ctx() context: RmqContext
  ) {
    ack(context);
    this.integrationService.contribution(data);
  }

  @EventPattern(
    WhiteboardIntegrationEventPattern.CONTENT_MODIFIED,
    Transport.RMQ
  )
  public contentModified(
    @Payload() data: ContentModifiedInputData,
    @Ctx() context: RmqContext
  ) {
    ack(context);
    this.integrationService.contentModified(data);
  }
}

const ack = (context: RmqContext) => {
  const channel: Channel = context.getChannelRef();
  const originalMsg = context.getMessage() as Message;
  channel.ack(originalMsg);
};
