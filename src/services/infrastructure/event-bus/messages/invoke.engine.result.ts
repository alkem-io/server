import { IEvent } from '@nestjs/cqrs';
import { AiPersonaInvocationInput } from '@services/ai-server/ai-persona';

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
  threadId?: string;

  constructor(data: Partial<InvokeEngineResponse>) {
    Object.assign(this, data);
    this.sources = (data.sources || []).map(source => new Source(source));
  }
}

export class InvokeEngineResult implements IEvent {
  constructor(
    public original: AiPersonaInvocationInput,
    public response: InvokeEngineResponse
  ) {}
}
