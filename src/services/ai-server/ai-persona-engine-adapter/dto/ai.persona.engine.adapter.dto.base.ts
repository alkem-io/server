import { AiPersonaEngine } from '@common/enums/ai.persona.engine';

export interface AiPersonaEngineAdapterInputBase {
  userId: string;
  engine: AiPersonaEngine;
}
