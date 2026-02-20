import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';
import { Global, Module } from '@nestjs/common';
import { AuthorizationModule } from './authorization.module';
import { GraphqlGuard } from './graphql.guard';

/**
 * Global module that provides GraphqlGuard with its dependencies resolved.
 * This avoids every module that uses @UseGuards(GraphqlGuard) needing to
 * import it explicitly.
 */
@Global()
@Module({
  imports: [AuthorizationModule, AuthenticationAgentInfoModule],
  providers: [GraphqlGuard],
  exports: [GraphqlGuard, AuthorizationModule, AuthenticationAgentInfoModule],
})
export class GraphqlGuardModule {}
