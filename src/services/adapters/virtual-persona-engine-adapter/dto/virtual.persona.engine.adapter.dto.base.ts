import { VirtualPersonaEngine } from '@common/enums/virtual.persona.engine';

export interface VirtualPersonaEngineAdapterInputBase {
  userId: string;
  engine: VirtualPersonaEngine;
}
