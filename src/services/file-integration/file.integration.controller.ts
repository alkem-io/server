import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { FileIntegrationService } from './file.integration.service';
import { FileMessagePatternEnum } from './types/message.pattern';
import { CanReadInputData } from './inputs';
import { CanReadOutputData } from './outputs';
import { ack } from '../util';

@Controller()
export class FileIntegrationController {
  constructor(private readonly integrationService: FileIntegrationService) {}

  @MessagePattern(FileMessagePatternEnum.CAN_READ, Transport.RMQ)
  public canRead(
    @Payload() data: CanReadInputData,
    @Ctx() context: RmqContext
  ): Promise<CanReadOutputData> {
    ack(context);
    return this.integrationService.canRead(data);
  }
}
