import { VirtualPersonaEngineAdapterInputBase } from './virtual.persona.engine.adapter.dto.base';

export interface VirtualPersonaEngineAdapterQueryInput
  extends VirtualPersonaEngineAdapterInputBase {
  question: string;
  prompt: string;
  knowledgeSpaceNameID: string;
  contextSpaceNameID: string;
}
