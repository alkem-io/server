import { IngestBodyOfKnowledgeResultHandler } from './ingest.body.of.knowledge.result.handler';
import { IngestWebsiteResultHandler } from './ingest.website.result.handler';
import { InvokeEngineResultHandler } from './invoke.engine.result.handler';

export const Handlers = [
  InvokeEngineResultHandler,
  IngestBodyOfKnowledgeResultHandler,
  IngestWebsiteResultHandler,
];
