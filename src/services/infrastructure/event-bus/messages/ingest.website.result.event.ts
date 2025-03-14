import { IEvent } from '@nestjs/cqrs';
import { IngestionResult, IngestError } from './types';
import { IngestWebsite } from './ingest.website';

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
