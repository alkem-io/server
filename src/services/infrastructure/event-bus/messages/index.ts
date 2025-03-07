import { IngestBodyOfKnowledgeResult } from './ingest.body.of.knowledge.result.event';
import { IngestWebsiteResult } from './ingest.website.result.event';
import { InvokeEngineResult } from './invoke.engine.result';
import { InvokeEngine } from './invoke.engine';
import { IngestBodyOfKnowledge } from './ingest.body.of.knowledge.command';
import { IngestWebsite } from './ingest.website';
export {
  IngestBodyOfKnowledge,
  IngestionPurpose,
} from './ingest.body.of.knowledge.command';

export const Messages = [
  IngestBodyOfKnowledge,
  IngestBodyOfKnowledgeResult,
  InvokeEngine,
];
export const HandleMessages = [
  IngestBodyOfKnowledgeResult,
  InvokeEngineResult,
  IngestWebsiteResult,
];
export const SendMessages = [
  IngestBodyOfKnowledge,
  IngestWebsite,
  InvokeEngine,
];
