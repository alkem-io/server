import { IngestSpaceResult } from './ingest.space.result.event';
import { IngestSpace } from './ingest.space.command';
export { IngestSpace, SpaceIngestionPurpose } from './ingest.space.command';

export const Messages = [IngestSpace, IngestSpaceResult];
export const HandleMessages = [IngestSpaceResult];
export const SendMessages = [IngestSpace];
