import { AiPersonaEngineAdapterBaseResponse } from './ai.persona.engine.adapter.dto.base.response';

export class AiPersonaEngineAdapterQueryResponse extends AiPersonaEngineAdapterBaseResponse {
  answer!: string;
  sources?: string;
  prompt_tokens!: number;
  completion_tokens!: number;
  total_tokens!: number;
  total_cost!: number;
}
