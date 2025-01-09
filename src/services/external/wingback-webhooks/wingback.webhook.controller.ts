import { Body, Controller, Post } from '@nestjs/common';

@Controller('rest/wingback')
export class WingbackWebhookController {
  @Post('customer')
  public customer(@Body() payload: any) {
    console.log('Customer webhook received', payload);
  }
}
