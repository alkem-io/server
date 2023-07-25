import { ChatGuidanceInputBase } from './chat.guidance.dto.input.base';

export interface ChatGuidanceInputQuery extends ChatGuidanceInputBase {
  userId: string;
  question: string;
}
