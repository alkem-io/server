import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { VirtualContributorModelCardEntry } from '@common/enums/virtual.contributor.model.card.entry';
import { VirtualContributorModelCardEntryFlagName } from '@common/enums/virtual.contributor.model.card.entry.flag.name';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ModelCardAiEngineResult } from './dto/virtual.contributor.model.card.dto.ai.engine.result';
import { ModelCardMonitoringResult } from './dto/virtual.contributor.model.card.dto.monitoring.result';
import { VirtualContributorModelCard } from './dto/virtual.contributor.model.card.dto.result';
import { ModelCardSpaceUsageResult } from './dto/virtual.contributor.model.card.dto.space.usage.result';

const DEFAULT_ENGINE_HOSTING_LOCATION = 'Sweden, EU';

/*
 * This resolver is used to provide a set of Model Cards about the AI Persona.
 * It is at the moment a simple and static set of data that is returned, based on the engine
 * that is used by the AI Persona. It is expected that the set of Model Cards returned will expand
 * in the future, as more engines are added and more data is available.
 */
@Resolver(() => VirtualContributorModelCard)
export class VirtualContributorModelCardResolverFields {
  @ResolveField('spaceUsage', () => [ModelCardSpaceUsageResult], {
    nullable: true,
    description:
      'The Model Card details related to usage of the Ai Persona within a Space.',
  })
  myPrivileges(): ModelCardSpaceUsageResult[] {
    const result: ModelCardSpaceUsageResult[] = [
      {
        modelCardEntry: VirtualContributorModelCardEntry.SPACE_CAPABILITIES,
        flags: [
          {
            name: VirtualContributorModelCardEntryFlagName.SPACE_CAPABILITY_TAGGING,
            enabled: true,
          },
          {
            name: VirtualContributorModelCardEntryFlagName.SPACE_CAPABILITY_CREATE_CONTENT,
            enabled: false,
          },
          {
            name: VirtualContributorModelCardEntryFlagName.SPACE_CAPABILITY_COMMUNITY_MANAGEMENT,
            enabled: false,
          },
        ],
      },
      {
        modelCardEntry: VirtualContributorModelCardEntry.SPACE_DATA_ACCESS,
        flags: [
          {
            name: VirtualContributorModelCardEntryFlagName.SPACE_DATA_ACCESS_ABOUT,
            enabled: true,
          },
          {
            name: VirtualContributorModelCardEntryFlagName.SPACE_DATA_ACCESS_CONTENT,
            enabled: false,
          },
          {
            name: VirtualContributorModelCardEntryFlagName.SPACE_DATA_ACCESS_SUBSPACES,
            enabled: false,
          },
        ],
      },
      {
        modelCardEntry: VirtualContributorModelCardEntry.SPACE_ROLE_REQUIRED,
        flags: [
          {
            name: VirtualContributorModelCardEntryFlagName.SPACE_ROLE_MEMBER,
            enabled: true,
          },
          {
            name: VirtualContributorModelCardEntryFlagName.SPACE_ROLE_ADMIN,
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
    @Parent() modelCard: VirtualContributorModelCard
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
      canAccessWebWhenAnswering: isExternal,
      hostingLocation: isExternalOrAssistant
        ? 'Unknown'
        : DEFAULT_ENGINE_HOSTING_LOCATION,
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
