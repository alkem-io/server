import { AiPersonaEngineAdapterInputBase } from './ai.persona.engine.adapter.dto.base';

export interface AiPersonaEngineAdapterQueryInput
  extends AiPersonaEngineAdapterInputBase {
  question: string;
  prompt?: string;
  contextSpaceNameID?: string;
}
