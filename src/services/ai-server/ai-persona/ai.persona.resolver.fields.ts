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
import graphJson from '../prompt-graph/config/prompt.graph.expert.json';
import { PromptGraph } from '../prompt-graph/dto/prompt.graph.dto';

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
    // Reload to ensure the authorization is loaded
    const aiPersona = await this.aiPersonaServiceService.getAiPersonaOrFail(
      parent.id
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersona.authorization,
      AuthorizationPrivilege.READ,
      `ai persona authorization access: ${aiPersona.id}`
    );

    if (aiPersona.promptGraph) {
      return aiPersona.promptGraph;
    }

    if (
      [AiPersonaEngine.EXPERT, AiPersonaEngine.LIBRA_FLOW].includes(
        aiPersona.engine
      )
    ) {
      // Clone the imported JSON to avoid mutating the module cache
      const formattedGraph = JSON.parse(JSON.stringify(graphJson));

      // If any node.prompt is stored as an array of lines, join them into a single string
      if (formattedGraph && Array.isArray(formattedGraph.nodes)) {
        formattedGraph.nodes.forEach((node: any) => {
          if (node && Array.isArray(node.prompt)) {
            node.prompt = node.prompt.join('\n');
          }
        });
      }

      return formattedGraph;
    }

    return null;
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
    const aiPersona = await this.aiPersonaServiceService.getAiPersonaOrFail(
      parent.id
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersona.authorization,
      AuthorizationPrivilege.READ,
      `ai persona authorization access: ${aiPersona.id}`
    );

    return aiPersona.authorization;
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
