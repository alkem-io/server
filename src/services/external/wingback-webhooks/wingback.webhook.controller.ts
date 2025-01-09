import { Body, Controller, Post } from '@nestjs/common';
import { Headers } from '@common/decorators';

@Controller('rest/wingback')
export class WingbackWebhookController {
  // v1.contract.change.completed
  @Post('contract/changed')
  public contractChanged(@Body() payload: any, @Headers() headers: any): void {
    console.log(
      'Wingback "v1.contract.change.completed" event received',
      payload,
      headers
    );
  }
  // v1.contract.signature.completed
  @Post('contract/signed')
  public newContract(@Body() payload: any, @Headers() headers: any): void {
    console.log(
      'Wingback "v1.contract.signature.completed" event received',
      payload,
      headers
    );
  }
}
