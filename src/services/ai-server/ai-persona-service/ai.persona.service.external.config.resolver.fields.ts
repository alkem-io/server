import { UseGuards } from '@nestjs/common';
import { Resolver, Parent, ResolveField } from '@nestjs/graphql';
import { AiPersonaService } from './ai.persona.service.entity';
import { AiPersonaServiceService } from './ai.persona.service.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IExternalConfig } from './dto';

@Resolver(() => IExternalConfig)
export class AiPersonaServiceExternalConfigResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private aiPersonaServiceService: AiPersonaServiceService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('apiKey', () => String, {
    nullable: true,
    description: 'The signature of the API key',
  })
  @Profiling.api
  async authorization(
    @Parent() parent: AiPersonaService,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    // Reload to ensure the authorization is loaded
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(parent.id);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersonaService.authorization,
      AuthorizationPrivilege.READ,
      `ai persona authorization access: ${aiPersonaService.id}`
    );
    return this.aiPersonaServiceService.getApiKeyID(
      aiPersonaService.externalConfig!
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('externalConfig', () => IExternalConfig, {
    nullable: true,
    description: 'The ExternalConfig for this Virtual.',
  })
  @Profiling.api
  async externalConfig(
    @Parent() parent: AiPersonaService,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    // Reload to ensure the authorization is loaded
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaServiceOrFail(parent.id);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersonaService.authorization,
      AuthorizationPrivilege.READ,
      `ai persona authorization access: ${aiPersonaService.id}`
    );

    return aiPersonaService.externalConfig;
  }
}
