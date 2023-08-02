import { GuidanceEngineInputBase } from './guidance.engine.dto.base';

export interface GuidanceEngineQueryInput extends GuidanceEngineInputBase {
  question: string;
}
