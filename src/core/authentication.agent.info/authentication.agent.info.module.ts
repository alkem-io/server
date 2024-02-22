import { Module } from '@nestjs/common';
import { AgentInfoCacheService } from './agent-info.cache.service';
@Module({
  imports: [],
  providers: [AgentInfoCacheService],
  exports: [AgentInfoCacheService],
})
export class AuthenticationAgentInfoModule {}
