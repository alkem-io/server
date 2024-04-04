import { VirtualPersonaBaseResponse } from './virtual.persona.dto.base.response';

export class VirtualPersonaQueryResponse extends VirtualPersonaBaseResponse {
  answer!: string;
  sources?: string;
  prompt_tokens!: number;
  completion_tokens!: number;
  total_tokens!: number;
  total_cost!: number;
}
