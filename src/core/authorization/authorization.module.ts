import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { GraphqlGuard } from './graphql.guard';
import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';

@Module({
  imports: [AuthenticationAgentInfoModule],
  providers: [AuthorizationService, GraphqlGuard],
  exports: [AuthorizationService, GraphqlGuard],
})
export class AuthorizationModule {}
