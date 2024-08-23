import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { AiPersonaDataAccessMode } from '@common/enums/ai.persona.data.access.mode';
import { IAiServer } from '../ai-server/ai.server.interface';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';

@ObjectType('AiPersonaService')
export class IAiPersonaService extends IAuthorizable {
  aiServer?: IAiServer;

  @Field(() => AiPersonaEngine, {
    nullable: false,
    description: 'The AI Persona Engine being used by this AI Persona.',
  })
  engine!: AiPersonaEngine;

  @Field(() => String, {
    nullable: false,
    description: 'The prompt used by this Virtual Persona',
  })
  prompt!: string;

  @Field(() => AiPersonaDataAccessMode, {
    nullable: false,
    description: 'The required data access by the Virtual Persona',
  })
  dataAccessMode!: AiPersonaDataAccessMode;

  @Field(() => AiPersonaBodyOfKnowledgeType, {
    nullable: false,
    description: 'The body of knowledge type used for the AI Persona Service',
  })
  bodyOfKnowledgeType!: AiPersonaBodyOfKnowledgeType;

  @Field(() => UUID, {
    nullable: false,
    description: 'The body of knowledge ID used for the AI Persona Service',
  })
  bodyOfKnowledgeID!: string;
}
