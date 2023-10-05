import {
  Controller,
  Get,
  Inject,
  LoggerService,
  Param,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication';
import { RestGuard } from '@core/authorization/rest.guard';

@Controller('/ipfs')
export class IpfsLogController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @UseGuards(RestGuard)
  @Get(':id')
  async document(
    @CurrentUser() agentInfo: AgentInfo,
    @Param('id') id: string
  ): Promise<StreamableFile | void> {
    this.logger.warn(
      `IPFS accessed from user: ${agentInfo.email} for document with id: ${id}`
    );
  }
}
