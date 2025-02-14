import { IngestBodyOfKnowledgeResult } from './ingest.body.of.knowledge.result.event';
import { InvokeEngineResult } from './invoke.engine.result';
import { InvokeEngine } from './invoke.engine';
import { IngestBodyOfKnowledge } from './ingest.body.of.knowledge.command';
export {
  IngestBodyOfKnowledge,
  IngestionPurpose,
} from './ingest.body.of.knowledge.command';

export const Messages = [
  IngestBodyOfKnowledge,
  IngestBodyOfKnowledgeResult,
  InvokeEngine,
];
export const HandleMessages = [IngestBodyOfKnowledgeResult, InvokeEngineResult];
export const SendMessages = [IngestBodyOfKnowledge, InvokeEngine];
