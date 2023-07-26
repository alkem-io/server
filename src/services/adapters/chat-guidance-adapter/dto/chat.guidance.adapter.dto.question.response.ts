import { ChatGuidanceBaseResponse } from './chat.guidance.adapter.dto.base.response';

export class ChatGuidanceQuestionResponse extends ChatGuidanceBaseResponse {
  answer!: string;
  sources!: string;
}
