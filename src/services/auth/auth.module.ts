import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { UserModule } from '@domain/community/user/user.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [AuthorizationModule, WhiteboardModule, UserModule, AgentModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
