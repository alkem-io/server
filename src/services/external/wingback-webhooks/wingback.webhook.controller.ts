import { Body, Controller, Inject, LoggerService, Post } from '@nestjs/common';
import { WingbackWebhookService } from '@services/external/wingback-webhooks/wingback.webhook.service';
import { WingbackContractPayload } from './types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';

@Controller('rest/wingback')
export class WingbackWebhookController {
  constructor(
    private readonly handlers: WingbackWebhookService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}
  // v1.contract.change.completed
  @Post('contract/changed')
  public contractChanged(@Body() payload: WingbackContractPayload): void {
    this.logger.verbose?.(
      `Wingback "v1.contract.change.completed" event received for contract: "${payload.id}"`,
      LogContext.WINGBACK_HOOKS
    );
    this.handlers.contractChanged(payload);
  }
  // v1.contract.signature.completed
  @Post('contract/signed')
  public newContract(@Body() payload: any): void {
    this.logger.verbose?.(
      `Wingback "v1.contract.signature.completed" event received for contract: "${payload.id}"`,
      LogContext.WINGBACK_HOOKS
    );
    this.handlers.newContract(payload);
  }
}
