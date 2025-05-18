import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AiPersonaModelCard } from './dto/ai.persona.model.card.dto.result';
import { ModelCardSpaceUsageResult } from './dto/ai.persona.model.card.dto.space.usage.result';
import { AiPersonaModelCardEntry } from '@common/enums/ai.persona.model.card.entry';
import { AiPersonaModelCardEntryFlagName } from '@common/enums/ai.persona.model.card.entry.flag.name';
import { ModelCardAiEngineResult } from './dto/ai.persona.model.card.dto.ai.engine.result';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { ModelCardMonitoringResult } from './dto/ai.persona.model.card.dto.monitoring.result';

@Resolver(() => AiPersonaModelCard)
export class AiPersonaModelCardResolverFields {
  @ResolveField('spaceUsage', () => [ModelCardSpaceUsageResult], {
    nullable: true,
    description:
      'The Model Card details related to usage of the Ai Persona within a Space.',
  })
  myPrivileges(): ModelCardSpaceUsageResult[] {
    const result: ModelCardSpaceUsageResult[] = [
      {
        modelCardEntry: AiPersonaModelCardEntry.SPACE_CAPABILITIES,
        flags: [
          {
            name: AiPersonaModelCardEntryFlagName.SPACE_CAPABILITY_TAGGING,
            enabled: true,
          },
          {
            name: AiPersonaModelCardEntryFlagName.SPACE_CAPABILITY_CREATE_CONTENT,
            enabled: false,
          },
          {
            name: AiPersonaModelCardEntryFlagName.SPACE_CAPABILITY_COMMUNITY_MANAGEMENT,
            enabled: false,
          },
        ],
      },
      {
        modelCardEntry: AiPersonaModelCardEntry.SPACE_DATA_ACCESS,
        flags: [
          {
            name: AiPersonaModelCardEntryFlagName.SPACE_DATA_ACCESS_ABOUT,
            enabled: true,
          },
          {
            name: AiPersonaModelCardEntryFlagName.SPACE_DATA_ACCESS_CONTENT,
            enabled: false,
          },
          {
            name: AiPersonaModelCardEntryFlagName.SPACE_DATA_ACCESS_SUBSPACES,
            enabled: false,
          },
        ],
      },
      {
        modelCardEntry: AiPersonaModelCardEntry.SPACE_ROLE_REQUIRED,
        flags: [
          {
            name: AiPersonaModelCardEntryFlagName.SPACE_ROLE_MEMBER,
            enabled: true,
          },
          {
            name: AiPersonaModelCardEntryFlagName.SPACE_ROLE_ADMIN,
            enabled: false,
          },
        ],
      },
    ];
    return result;
  }

  @ResolveField('aiEngine', () => ModelCardAiEngineResult, {
    nullable: true,
    description:
      'The model card information about the AI Engine behind the AI Persona.',
  })
  async aiEngine(
    @Parent() modelCard: AiPersonaModelCard
  ): Promise<ModelCardAiEngineResult> {
    const engine = modelCard.aiPersonaEngine;

    const isExternal = [
      AiPersonaEngine.LIBRA_FLOW,
      AiPersonaEngine.GENERIC_OPENAI,
    ].includes(engine);

    const isAssistant = engine === AiPersonaEngine.OPENAI_ASSISTANT;
    const isExternalOrAssistant = isExternal || isAssistant;

    const result: ModelCardAiEngineResult = {
      isExternal,
      isUsingOpenWeightsModel: isExternalOrAssistant,
      isInteractionDataUsedForTraining: isExternalOrAssistant ? null : false,
      areAnswersRestrictedToBodyOfKnowledge: (() => {
        switch (engine) {
          case AiPersonaEngine.GENERIC_OPENAI:
            return 'No';
          case AiPersonaEngine.OPENAI_ASSISTANT:
            return 'Yes, when provided';
          default:
            return 'Yes';
        }
      })(),
      canAccessWebWhenAnswering: !isExternal,
      hostingLocation: isExternalOrAssistant ? 'Unknown' : 'Sweden, EU',
      additionalTechnicalDetails: isExternal
        ? 'https://platform.openai.com/docs/overview'
        : isAssistant
          ? 'https://platform.openai.com/docs/assistants/overview'
          : 'https://huggingface.co/mistralai/Mistral-Small-Instruct-2409/tree/main',
    };
    return result;
  }

  @ResolveField('monitoring', () => ModelCardMonitoringResult, {
    nullable: true,
    description:
      'The model card information about the monitoring that is done on usage.',
  })
  async monitoring(): Promise<ModelCardMonitoringResult> {
    const result: ModelCardMonitoringResult = {
      isUsageMonitoredByAlkemio: true,
    };
    return result;
  }
}
