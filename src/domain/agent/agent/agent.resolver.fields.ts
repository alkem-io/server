import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { AgentService } from './agent.service';
import {
  AuthorizationPrivilege,
  ConfigurationTypes,
  LogContext,
} from '@common/enums';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { Agent, IAgent } from '@domain/agent/agent';
import { GraphqlGuard } from '@core/authorization';
import { ConfigService } from '@nestjs/config';
import { NotEnabledException } from '@common/exceptions/not.enabled.exception';
import { IVerifiedCredential } from '../verified-credential/verified.credential.interface';

@Resolver(() => IAgent)
export class AgentResolverFields {
  constructor(
    private configService: ConfigService,
    private agentService: AgentService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('verifiedCredentials', () => [IVerifiedCredential], {
    nullable: true,
    description: 'The Verfied Credentials for this Agent.',
  })
  @Profiling.api
  async verifiedCredentials(
    @Parent() agent: Agent
  ): Promise<IVerifiedCredential[]> {
    const ssiEnabled = this.configService.get(ConfigurationTypes.SSI).enabled;
    if (!ssiEnabled) {
      throw new NotEnabledException('SSI is not enabled', LogContext.SSI);
    }
    const result = await this.agentService.getVerifiedCredentials(agent);
    return result;
  }
}
