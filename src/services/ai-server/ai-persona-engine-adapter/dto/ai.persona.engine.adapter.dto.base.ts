import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { InvocationOperation } from '@common/enums/ai.persona.invocation.operation';

export interface AiPersonaEngineAdapterInputBase {
  userID?: string | undefined;
  engine: AiPersonaEngine;
  operation?: InvocationOperation;
}
