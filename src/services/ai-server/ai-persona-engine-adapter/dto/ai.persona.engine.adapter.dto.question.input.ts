import { AiPersonaEngineAdapterInputBase } from './ai.persona.engine.adapter.dto.base';
import { InteractionMessage } from '@services/ai-server/ai-persona-service/dto/interaction.message';

export interface AiPersonaEngineAdapterQueryInput
  extends AiPersonaEngineAdapterInputBase {
  question: string;
  prompt?: string;
  contextID?: string;
  bodyOfKnowledgeID: string;
  interactionID?: string;
  history?: InteractionMessage[];
  description?: string;
  displayName: string;
}
