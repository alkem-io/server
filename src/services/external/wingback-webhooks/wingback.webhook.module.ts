import { Module } from '@nestjs/common';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AccountModule } from '@domain/space/account/account.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { WingbackManagerModule } from '@services/external/wingback';
import { WingbackWebhookService } from './wingback.webhook.service';
import { WingbackWebhookController } from './wingback.webhook.controller';

@Module({
  imports: [
    AccountModule,
    AuthorizationPolicyModule,
    LicenseModule,
    WingbackManagerModule,
  ],
  providers: [WingbackWebhookService],
  controllers: [WingbackWebhookController],
})
export class WingbackWebhookModule {}
