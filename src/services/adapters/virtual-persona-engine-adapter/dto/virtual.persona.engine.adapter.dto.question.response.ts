import { VirtualPersonaEngineAdapterBaseResponse } from './virtual.persona.engine.adapter.dto.base.response';

export class VirtualPersonaEngineAdapterQueryResponse extends VirtualPersonaEngineAdapterBaseResponse {
  answer!: string;
  sources?: string;
  prompt_tokens!: number;
  completion_tokens!: number;
  total_tokens!: number;
  total_cost!: number;
}
