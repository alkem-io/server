import { Module } from '@nestjs/common';
import { AgentInfoCacheService } from './agent.info.cache.service';
import { AgentInfoService } from './agent.info.service';
@Module({
  imports: [],
  providers: [AgentInfoService, AgentInfoCacheService],
  exports: [AgentInfoService, AgentInfoCacheService],
})
export class AuthenticationAgentInfoModule {}
