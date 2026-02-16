import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { AiServer } from '../ai-server/ai.server.entity';
import { PromptGraph } from '../prompt-graph/dto/prompt.graph.dto';
import { IAiPersona } from './ai.persona.interface';
import { IExternalConfig } from './dto/external.config';

export class AiPersona extends AuthorizableEntity implements IAiPersona {
  aiServer?: AiServer;

  engine!: AiPersonaEngine;

  prompt!: string[];

  externalConfig?: IExternalConfig = {};

  bodyOfKnowledgeLastUpdated: Date | null = null;

  promptGraph?: PromptGraph;
}
