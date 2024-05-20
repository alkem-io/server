import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { UserModule } from '@domain/community/user/user.module';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { WhiteboardIntegrationService } from './whiteboard.integration.service';
import { WhiteboardIntegrationController } from './whiteboard.integration.controller';

@Module({
  imports: [
    AuthorizationModule,
    WhiteboardModule,
    UserModule,
    AuthenticationModule,
  ],
  providers: [WhiteboardIntegrationService],
  controllers: [WhiteboardIntegrationController],
})
export class WhiteboardIntegrationModule {}
