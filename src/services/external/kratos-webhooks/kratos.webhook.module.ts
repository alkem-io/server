import { UserPasswordChangeModule } from '@domain/community/user-password-change/user.password.change.module';
import { Module } from '@nestjs/common';
import { KratosWebhookController } from './kratos.webhook.controller';

@Module({
  imports: [UserPasswordChangeModule],
  controllers: [KratosWebhookController],
})
export class KratosWebhookModule {}
