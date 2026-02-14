import { pgTable, varchar, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';
import { simpleJson } from '@config/drizzle/custom-types';
import type { IExternalConfig } from './dto/external.config';
import type { PromptGraph } from '../prompt-graph/dto/prompt.graph.dto';

export const aiPersonas = pgTable('ai_persona', {
  ...authorizableColumns,
  aiServerId: uuid('aiServerId'),
  engine: varchar('engine', { length: ENUM_LENGTH }).notNull(),
  prompt: simpleJson<string[]>()('prompt').notNull(),
  externalConfig: simpleJson<IExternalConfig>()('externalConfig'),
  bodyOfKnowledgeLastUpdated: timestamp('bodyOfKnowledgeLastUpdated', {
    mode: 'date',
  }),
  promptGraph: jsonb('promptGraph').$type<PromptGraph>(),
});
