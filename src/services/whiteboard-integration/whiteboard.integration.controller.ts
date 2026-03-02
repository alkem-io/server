import { Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { ack } from '../util';
import {
  ContentModifiedInputData,
  ContributionInputData,
  FetchInputData,
  InfoInputData,
  SaveInputData,
  WhoInputData,
} from './inputs';
import {
  FetchOutputData,
  HealthCheckOutputData,
  InfoOutputData,
  SaveOutputData,
} from './outputs';
import { WhiteboardIntegrationMessagePattern } from './types';
import { WhiteboardIntegrationEventPattern } from './types/event.pattern';
import { WhiteboardIntegrationService } from './whiteboard.integration.service';

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
  ): Promise<string> {
    ack(context);
    return this.integrationService.who(data);
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

  @MessagePattern(WhiteboardIntegrationEventPattern.HEALTH_CHECK, Transport.RMQ)
  public health(@Ctx() context: RmqContext): HealthCheckOutputData {
    ack(context);
    // can be tight to more complex health check in the future
    // for now just return true
    return new HealthCheckOutputData(true);
  }

  @MessagePattern(WhiteboardIntegrationMessagePattern.SAVE, Transport.RMQ)
  public save(
    @Payload() data: SaveInputData,
    @Ctx() context: RmqContext
  ): Promise<SaveOutputData> {
    ack(context);
    return this.integrationService.save(data);
  }

  @MessagePattern(WhiteboardIntegrationMessagePattern.FETCH, Transport.RMQ)
  public fetch(
    @Payload() data: FetchInputData,
    @Ctx() context: RmqContext
  ): Promise<FetchOutputData> {
    ack(context);
    return this.integrationService.fetch(data);
  }
}
