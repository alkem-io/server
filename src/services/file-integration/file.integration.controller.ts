import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { ack } from '../util';
import { FileIntegrationService } from './file.integration.service';
import { FileInfoInputData } from './inputs';
import { FileInfoOutputData, HealthCheckOutputData } from './outputs';
import { FileMessagePatternEnum } from './types/message.pattern';

@Controller()
export class FileIntegrationController {
  constructor(private readonly integrationService: FileIntegrationService) {}

  @MessagePattern(FileMessagePatternEnum.FILE_INFO, Transport.RMQ)
  public fileInfo(
    @Payload() data: FileInfoInputData,
    @Ctx() context: RmqContext
  ): Promise<FileInfoOutputData> {
    ack(context);
    return this.integrationService.fileInfo(data);
  }

  @MessagePattern(FileMessagePatternEnum.HEALTH_CHECK, Transport.RMQ)
  public health(@Ctx() context: RmqContext): HealthCheckOutputData {
    ack(context);
    // can be tight to more complex health check in the future
    // for now just return true
    return new HealthCheckOutputData(true);
  }
}
