import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { AiPersonaService } from './ai.persona.service.entity';
import { AiPersonaServiceService } from './ai.persona.service.service';
import { AuthorizationPrivilege } from '@common/enums';
import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAiPersonaService } from './ai.persona.service.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';

@Resolver(() => IAiPersonaService)
export class AiPersonaServiceResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private aiPersonaServiceService: AiPersonaServiceService
  ) {}

  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: true,
    description: 'The Authorization for this Virtual.',
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

    return aiPersonaService.authorization;
  }
}
