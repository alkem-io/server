import { IngestSpaceResult } from './ingest.space.result.event';
import { IngestSpace } from './ingest.space.command';
import { InvokeEngineResult } from './invoke.engine.result';
import { InvokeEngine } from './invoke.engine';
export { IngestSpace, SpaceIngestionPurpose } from './ingest.space.command';

export const Messages = [IngestSpace, IngestSpaceResult, InvokeEngine];
export const HandleMessages = [IngestSpaceResult, InvokeEngineResult];
export const SendMessages = [IngestSpace, InvokeEngine];
