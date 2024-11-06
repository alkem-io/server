import { IEvent } from '@nestjs/cqrs';
import { AiPersonaServiceInvocationInput } from '@services/ai-server/ai-persona-service/dto';

export class Source {
  chunkIndex?: number;
  documentId!: string;
  embeddingType!: string;
  source!: string;
  title!: string;
  type!: string;
  score!: number;
  uri!: string;
}

export class InvokeEngineResponse {
  message!: string;
  result!: string;
  human_language!: string;
  result_language!: string;
  knowledge_language!: string;
  original_result!: string;
  sources!: Source[];
}

export class InvokeEngineResult implements IEvent {
  constructor(
    public original: AiPersonaServiceInvocationInput,
    public response: { result: string }
  ) {}
}
