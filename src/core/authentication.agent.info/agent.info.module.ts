import { Module } from '@nestjs/common';
import { AgentInfoCacheService } from './agent.info.cache.service';
import { AgentInfoService } from './agent.info.service';
import { UserAuthenticationLinkModule } from '@domain/community/user/user.authentication.link.module';
@Module({
  imports: [UserAuthenticationLinkModule],
  providers: [AgentInfoService, AgentInfoCacheService],
  exports: [AgentInfoService, AgentInfoCacheService],
})
export class AuthenticationAgentInfoModule {}
