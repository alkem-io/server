import { Resolver, Parent, ResolveField } from '@nestjs/graphql';
import { AuthorizationPrivilege } from '@common/enums';
import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { IExternalConfig } from './dto';
import { IAiPersona } from './ai.persona.interface';
import { AiPersonaService } from './ai.persona.service';
import { AiPersona } from './ai.persona.entity';

import graphJson from './dto/graph.json';
import { PromptGraph } from './dto/prompt.graph.dto';

const EXTERNALY_CONFIGURABLE_ENGINES = [
  AiPersonaEngine.LIBRA_FLOW,
  AiPersonaEngine.GENERIC_OPENAI,
  AiPersonaEngine.LIBRA_FLOW,
];
@Resolver(() => IAiPersona)
export class AiPersonaResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private aiPersonaServiceService: AiPersonaService
  ) {}

  @ResolveField('promptGraph', () => PromptGraph, {
    nullable: true,
    description: 'The PromptGraph for this Virtual.',
  })
  async promptGraph(
    @Parent() parent: AiPersona,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    // Deep clone to avoid mutating the imported object
    const graph = graphJson;
    if (Array.isArray(graph.nodes)) {
      graph.nodes.forEach((node: any) => {
        if (
          node.output &&
          node.output.properties &&
          typeof node.output.properties === 'object' &&
          !Array.isArray(node.output.properties)
        ) {
          node.output.properties = Object.entries(node.output.properties).map(
            //@ts-ignore-next-line
            ([key, value]) => ({ name: key, ...value })
          );
        }
      });
    }
    return graph;
  }

  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: true,
    description: 'The Authorization for this Virtual.',
  })
  @Profiling.api
  async authorization(
    @Parent() parent: AiPersona,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    // Reload to ensure the authorization is loaded
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaOrFail(parent.id);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersonaService.authorization,
      AuthorizationPrivilege.READ,
      `ai persona authorization access: ${aiPersonaService.id}`
    );

    return aiPersonaService.authorization;
  }

  @ResolveField('externalConfig', () => IExternalConfig, {
    nullable: true,
    description: 'The ExternalConfig for this Virtual.',
  })
  @Profiling.api
  async externalConfig(
    @Parent() parent: AiPersona,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    // Reload to ensure the authorization is loaded
    const aiPersonaService =
      await this.aiPersonaServiceService.getAiPersonaOrFail(parent.id);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersonaService.authorization,
      AuthorizationPrivilege.READ,
      `ai persona authorization access: ${aiPersonaService.id}`
    );
    if (!EXTERNALY_CONFIGURABLE_ENGINES.includes(aiPersonaService.engine)) {
      return null;
    }

    return aiPersonaService.externalConfig;
  }
}
