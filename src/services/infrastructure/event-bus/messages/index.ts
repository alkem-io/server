import { IngestBodyOfKnowledge } from './ingest.body.of.knowledge.command';
import { IngestBodyOfKnowledgeResult } from './ingest.body.of.knowledge.result.event';
import { IngestWebsite } from './ingest.website';
import { IngestWebsiteResult } from './ingest.website.result.event';
import { InvokeEngine } from './invoke.engine';
import { InvokeEngineResult } from './invoke.engine.result';

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
