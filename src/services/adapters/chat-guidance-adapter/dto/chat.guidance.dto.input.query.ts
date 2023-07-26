import { ChatGuidanceInputBase } from './chat.guidance.dto.input.base';

export interface ChatGuidanceInputQuery extends ChatGuidanceInputBase {
  question: string;
}
