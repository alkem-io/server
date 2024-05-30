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
import { FileInfoInputData } from './inputs';
import { FileInfoOutputData } from './outputs';
import { ack } from '../util';

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
}
