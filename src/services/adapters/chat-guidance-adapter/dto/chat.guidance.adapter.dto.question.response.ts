import { ChatGuidanceBaseResponse } from './chat.guidance.adapter.dto.base.response';

export class ChatGuidanceQueryResponse extends ChatGuidanceBaseResponse {
  answer!: string;
  sources!: string;
}
