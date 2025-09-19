import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IAiServer } from '../ai-server/ai.server.interface';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { IExternalConfig } from './dto/external.config';
import { PromptGraph } from './dto/prompt.graph.dto';

@ObjectType('AiPersona')
export abstract class IAiPersona extends IAuthorizable {
  aiServer?: IAiServer;

  @Field(() => AiPersonaEngine, {
    nullable: false,
    description: 'The AI Persona Engine being used by this AI Persona.',
  })
  engine!: AiPersonaEngine;

  @Field(() => [String], {
    nullable: false,
    description: 'The prompt used by this AI Persona',
  })
  prompt!: string[];

  @Field(() => IExternalConfig, {
    nullable: true,
    description: 'The external configuration for this AI Persona.',
  })
  externalConfig?: IExternalConfig;

  @Field(() => Date, {
    nullable: true,
    description: 'The date when the body of knowledge was last ingested.',
  })
  bodyOfKnowledgeLastUpdated: Date | null = null;

  @Field(() => PromptGraph, {
    nullable: true,
    description: 'The prompt graph for this AI Persona.',
  })
  promptGraph?: PromptGraph;
}
