import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AgentService } from './agent.service';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { Agent, IAgent } from '@domain/agent/agent';
import { GraphqlGuard } from '@core/authorization';
import { ConfigService } from '@nestjs/config';
import { NotEnabledException } from '@common/exceptions/not.enabled.exception';
import { IVerifiedCredential } from '../verified-credential/verified.credential.interface';
import { AlkemioConfig } from '@src/types';

@Resolver(() => IAgent)
export class AgentResolverFields {
  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    private agentService: AgentService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('verifiedCredentials', () => [IVerifiedCredential], {
    nullable: true,
    description: 'The Verfied Credentials for this Agent.',
  })
  @Profiling.api
  public verifiedCredentials(
    @Parent() agent: Agent
  ): Promise<IVerifiedCredential[]> {
    const ssiEnabled = this.configService.get('ssi.enabled', { infer: true });
    if (!ssiEnabled) {
      throw new NotEnabledException('SSI is not enabled', LogContext.SSI);
    }
    return this.agentService.getVerifiedCredentials(agent.id);
  }
}
