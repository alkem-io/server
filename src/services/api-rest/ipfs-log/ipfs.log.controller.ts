import {
  Controller,
  Get,
  Param,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { RestGuard } from '@core/authorization/rest.guard';
import { LogContext } from '@common/enums';
import { IpfsNotFoundHttpException } from '@common/exceptions/http';

@Controller('/ipfs')
export class IpfsLogController {
  @UseGuards(RestGuard)
  @Get(':id')
  async document(
    @CurrentUser() agentInfo: AgentInfo,
    @Param('id') id: string
  ): Promise<StreamableFile | void> {
    throw new IpfsNotFoundHttpException(
      `IPFS accessed from user: ${agentInfo.email} for document with id: ${id}`,
      LogContext.IPFS
    );
  }
}
