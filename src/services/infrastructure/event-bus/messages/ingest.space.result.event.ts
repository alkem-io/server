import { IEvent } from '@nestjs/cqrs';

export enum SpaceIngestionPurpose {
  KNOWLEDGE = 'knowledge',
  CONTEXT = 'context',
}

export enum SpaceIngestionResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export enum ErrorCode {
  VECTOR_INSERT = 'vector_insert',
}

type IngestError = {
  code?: ErrorCode;
  message: string;
};

export class IngestSpaceResult implements IEvent {
  constructor(
    public readonly spaceId: string,
    public readonly purpose: SpaceIngestionPurpose,
    public readonly personaServiceId: string,
    public readonly timestamp: number,
    public result: SpaceIngestionResult,
    public error?: IngestError
  ) {}
}
