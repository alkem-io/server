import { IEvent } from '@nestjs/cqrs';
import { IngestWebsite } from './ingest.website';
import { IngestError, IngestionResult } from './types';

export class IngestWebsiteResponse {
  constructor(
    public readonly timestamp: number,
    public result: IngestionResult,
    public error?: IngestError
  ) {}
}
export class IngestWebsiteResult implements IEvent {
  constructor(
    public readonly original: IngestWebsite,
    public readonly response: IngestWebsiteResponse
  ) {}
}
