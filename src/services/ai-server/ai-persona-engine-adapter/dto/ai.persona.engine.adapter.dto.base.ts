import { AiPersonaEngine } from '@common/enums/ai.persona.engine';

export interface AiPersonaEngineAdapterInputBase {
  userID?: string | undefined;
  engine: AiPersonaEngine;
}
