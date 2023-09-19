import { GuidanceEngineInputBase } from './guidance.engine.dto.base';

export type languageType =
  | 'EN'
  | 'US'
  | 'UK'
  | 'FR'
  | 'DE'
  | 'ES'
  | 'NL'
  | 'BG'
  | 'UA';
export interface GuidanceEngineQueryInput extends GuidanceEngineInputBase {
  question: string;
  language?: languageType;
}
