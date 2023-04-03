import {
  Controller,
  Get,
  Inject,
  LoggerService,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication';
import { LogContext } from '@common/enums';
import { RestGuard } from '@core/authorization/rest.guard';

@Controller('/rest')
export class StorageAccessController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @UseGuards(RestGuard)
  @Get('storage')
  async storage(@CurrentUser() agentInfo: AgentInfo) {
    this.logger.verbose?.(
      `retrieved the current agent inf22o: ${agentInfo}`,
      LogContext.STORAGE_ACCESS
    );
  }
}
