import { Module } from '@nestjs/common';
import { WingbackWebhookService } from './wingback.webhook.service';
import { WingbackWebhookController } from './wingback.webhook.controller';

@Module({
  providers: [WingbackWebhookService],
  controllers: [WingbackWebhookController],
})
export class WingbackWebhookModule {}
