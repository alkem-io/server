import {
  Body,
  Controller,
  Inject,
  LoggerService,
  Post,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { WingbackContractPayload } from './types';
import { WingbackWebhookService } from './wingback.webhook.service';
import { HeaderInterceptor } from './wingback.webhook.interceptor';
import { getContractValidationPipe } from './get.contract.validation.pipe';

@Controller('rest/wingback')
@UseInterceptors(HeaderInterceptor)
export class WingbackWebhookController {
  constructor(
    private readonly handlers: WingbackWebhookService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}
  // v1.contract.change.completed
  @Post('contract/changed')
  @UsePipes(getContractValidationPipe())
  public contractChanged(@Body() payload: WingbackContractPayload): void {
    this.logger.verbose?.(
      `Wingback "v1.contract.change.completed" event received for contract: "${payload.id}"`,
      LogContext.WINGBACK_HOOKS
    );
    void this.handlers.contractChanged(payload);
  }
  // v1.contract.signature.completed
  @Post('contract/signed')
  @UsePipes(getContractValidationPipe())
  public newContract(@Body() payload: WingbackContractPayload): void {
    this.logger.verbose?.(
      `Wingback "v1.contract.signature.completed" event received for contract: "${payload.id}"`,
      LogContext.WINGBACK_HOOKS
    );
    void this.handlers.newContract(payload);
  }
}
