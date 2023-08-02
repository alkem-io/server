import { GuidanceEngineBaseResponse } from './guidance.engine.adapter.dto.base.response';

export class GuidanceEngineQueryResponse extends GuidanceEngineBaseResponse {
  answer!: string;
  sources!: string;
}
