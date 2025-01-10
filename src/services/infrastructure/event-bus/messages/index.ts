import { IngestSpaceResult } from './ingest.space.result.event';
import { InvokeEngineResult } from './invoke.engine.result';
import { InvokeEngine } from './invoke.engine';
import { IngestBodyOfKnowledge } from './ingest.body.of.knowledge.command';
export {
  IngestBodyOfKnowledge,
  IngestionPurpose,
} from './ingest.body.of.knowledge.command';

export const Messages = [
  IngestBodyOfKnowledge,
  IngestSpaceResult,
  InvokeEngine,
];
export const HandleMessages = [IngestSpaceResult, InvokeEngineResult];
export const SendMessages = [IngestBodyOfKnowledge, InvokeEngine];
