import { GuidanceEngineInputBase } from './guidance.engine.dto.input.base';

export interface GuidanceEngineInputQuery extends GuidanceEngineInputBase {
  question: string;
}
