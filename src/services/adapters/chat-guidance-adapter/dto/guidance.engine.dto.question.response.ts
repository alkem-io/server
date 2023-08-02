import { GuidanceEngineBaseResponse } from './guidance.engine.dto.base.response';

export class GuidanceEngineQueryResponse extends GuidanceEngineBaseResponse {
  answer!: string;
  sources!: string;
}
