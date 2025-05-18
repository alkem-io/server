import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { AiPersona } from './ai.persona.entity';
import { AiPersonaService } from './ai.persona.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationAgentPrivilege } from '@common/decorators';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAiPersona } from './ai.persona.interface';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { AiPersonaInteractionMode } from '@common/enums/ai.persona.interaction.mode';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { AiPersonaModelCard } from '../ai-persona-model-card/dto/ai.persona.model.card.dto.result';

@Resolver(() => IAiPersona)
export class AiPersonaResolverFields {
  constructor(
    private aiPersonaService: AiPersonaService,
    private aiServerAdapter: AiServerAdapter
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: true,
    description: 'The Authorization for this Virtual.',
  })
  async authorization(@Parent() parent: AiPersona) {
    // Reload to ensure the authorization is loaded
    const aiPersona = await this.aiPersonaService.getAiPersonaOrFail(parent.id);

    return aiPersona.authorization;
  }

  // Expose these fields for now so that we do not have a regression in functionality on the client
  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('bodyOfKnowledgeType', () => AiPersonaBodyOfKnowledgeType, {
    nullable: true,
    description: 'The body of knowledge type used for the AI Persona.',
  })
  async bodyOfKnowledgeType(
    @Parent() aiPersona: AiPersona
  ): Promise<AiPersonaBodyOfKnowledgeType> {
    return await this.aiServerAdapter.getPersonaServiceBodyOfKnowledgeType(
      aiPersona.aiPersonaServiceID
    );
  }
  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('engine', () => AiPersonaEngine, {
    nullable: false,
    description: 'The engine powering the AiPersona.',
  })
  async engine(@Parent() aiPersona: AiPersona): Promise<AiPersonaEngine> {
    return await this.aiServerAdapter.getPersonaServiceEngine(
      aiPersona.aiPersonaServiceID
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('modelCard', () => AiPersonaModelCard, {
    nullable: false,
    description: 'The model card information about this AI Persona.',
  })
  async membership(
    @Parent() aiPersona: AiPersona
  ): Promise<AiPersonaModelCard> {
    const engine = await this.aiServerAdapter.getPersonaServiceEngine(
      aiPersona.aiPersonaServiceID
    );
    const modelCard: AiPersonaModelCard = {
      aiPersona,
      aiPersonaEngine: engine,
    };

    return modelCard;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('bodyOfKnowledgeID', () => String, {
    nullable: true,
    description: 'The body of knowledge ID used for the AI Persona.',
  })
  async bodyOfKnowledgeID(@Parent() aiPersona: AiPersona): Promise<string> {
    return await this.aiServerAdapter.getPersonaServiceBodyOfKnowledgeID(
      aiPersona.aiPersonaServiceID
    );
  }
  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('aiPersonaServiceID', () => String, {
    nullable: true,
    description: 'The ID of the AiPersonaService.',
  })
  aiPersonaServiceID(@Parent() aiPersona: AiPersona): string {
    return aiPersona.aiPersonaServiceID;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('interactionModes', () => [AiPersonaInteractionMode], {
    nullable: false,
    description:
      'The type of interactions that are supported by this AI Persona when used.',
  })
  async interactionModes(
    @Parent() aiPersona: AiPersona
  ): Promise<AiPersonaInteractionMode[]> {
    const interactionModes: AiPersonaInteractionMode[] =
      aiPersona.interactionModes;
    return interactionModes;
  }
}
