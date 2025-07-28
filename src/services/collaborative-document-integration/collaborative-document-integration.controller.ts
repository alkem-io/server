import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { ack } from '@services/util';
import { CollaborativeDocumentIntegrationService } from './collaborative-document-integration.service';
import { UserInfo, CollaborativeDocumentMessagePattern } from './types';
import {
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

@Controller('collaborative-document-integration')
export class CollaborativeDocumentIntegrationController {
  constructor(
    private readonly integrationService: CollaborativeDocumentIntegrationService
  ) {}

  @MessagePattern(CollaborativeDocumentMessagePattern.INFO, Transport.RMQ)
  public info(
    @Payload() data: InfoInputData,
    @Ctx() context: RmqContext
  ): Promise<InfoOutputData> {
    ack(context);
    return this.integrationService.info(data);
  }

  @MessagePattern(CollaborativeDocumentMessagePattern.WHO, Transport.RMQ)
  public async who(
    @Payload() data: WhoInputData,
    @Ctx() context: RmqContext
  ): Promise<UserInfo> {
    ack(context);
    return this.integrationService
      .who(data)
      .then(({ userID, email }) => ({ id: userID, email }));
  }

  @MessagePattern(
    CollaborativeDocumentMessagePattern.HEALTH_CHECK,
    Transport.RMQ
  )
  public health(@Ctx() context: RmqContext): HealthCheckOutputData {
    ack(context);
    // can be tight to more complex health check in the future
    // for now just return true
    return new HealthCheckOutputData(true);
  }

  @MessagePattern(CollaborativeDocumentMessagePattern.SAVE, Transport.RMQ)
  public save(
    @Payload() data: SaveInputData,
    @Ctx() context: RmqContext
  ): Promise<SaveOutputData> {
    ack(context);
    return this.integrationService.save(data);
  }

  @MessagePattern(CollaborativeDocumentMessagePattern.FETCH, Transport.RMQ)
  public fetch(
    @Payload() data: FetchInputData,
    @Ctx() context: RmqContext
  ): Promise<FetchOutputData> {
    ack(context);
    return this.integrationService.fetch(data);
  }
}
