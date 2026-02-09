import { UserAuthenticationLinkModule } from '@domain/community/user-authentication-link/user.authentication.link.module';
import { Module } from '@nestjs/common';
import { AgentInfoCacheService } from './agent.info.cache.service';
import { AgentInfoService } from './agent.info.service';
@Module({
  imports: [UserAuthenticationLinkModule],
  providers: [AgentInfoService, AgentInfoCacheService],
  exports: [AgentInfoService, AgentInfoCacheService],
})
export class AuthenticationAgentInfoModule {}
