import { Body, Controller, Post } from '@nestjs/common';
import { WingbackWebhookService } from '@services/external/wingback-webhooks/wingback.webhook.service';
import { WingbackContractPayload } from './types';

@Controller('rest/wingback')
export class WingbackWebhookController {
  constructor(private readonly handlers: WingbackWebhookService) {}
  // v1.contract.change.completed
  @Post('contract/changed')
  public contractChanged(@Body() payload: WingbackContractPayload): void {
    this.handlers.contractChanged(payload);
  }
  // v1.contract.signature.completed
  @Post('contract/signed')
  public newContract(@Body() payload: any): void {
    this.handlers.newContract(payload);
  }
}
