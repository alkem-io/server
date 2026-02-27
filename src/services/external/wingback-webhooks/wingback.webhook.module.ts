import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { AccountModule } from '@domain/space/account/account.module';
import { Module } from '@nestjs/common';
import { WingbackManagerModule } from '@services/external/wingback';
import { WingbackWebhookController } from './wingback.webhook.controller';
import { WingbackWebhookService } from './wingback.webhook.service';

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
