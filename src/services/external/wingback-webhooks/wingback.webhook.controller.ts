import { Body, Controller, Post } from '@nestjs/common';
import { Headers } from '@common/decorators';

@Controller('rest/wingback')
export class WingbackWebhookController {
  @Post('customer')
  public customer(@Body() payload: any, @Headers() headers: any): void {
    console.log('Customer webhook received', payload, headers);
  }
}
