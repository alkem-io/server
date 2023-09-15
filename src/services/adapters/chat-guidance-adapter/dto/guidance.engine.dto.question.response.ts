import { GuidanceEngineBaseResponse } from './guidance.engine.dto.base.response';

export class GuidanceEngineQueryResponse extends GuidanceEngineBaseResponse {
  answer!: string;
  sources!: string;
  prompt_tokens!: number;
  completion_tokens!: number;
  total_tokens!: number;
  total_cost!: number;
}
