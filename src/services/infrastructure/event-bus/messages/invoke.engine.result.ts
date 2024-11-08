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

  constructor(data: Partial<Source>) {
    Object.assign(this, data);
  }
}

export class InvokeEngineResponse {
  message!: string;
  result!: string;
  humanLanguage!: string;
  resultLanguage!: string;
  knowledgeLanguage!: string;
  originalResult!: string;
  sources!: Source[];

  constructor(data: Partial<InvokeEngineResponse>) {
    Object.assign(this, data);
    this.sources = (data.sources || []).map(source => new Source(source));
  }
}

export class InvokeEngineResult implements IEvent {
  constructor(
    public original: AiPersonaServiceInvocationInput,
    public response: InvokeEngineResponse
  ) {}
}
