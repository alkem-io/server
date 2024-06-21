import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import JSON from 'graphql-type-json';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { UUID } from '@domain/common/scalars';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { AiPersonaDataAccessMode } from '@common/enums/ai.persona.data.access.mode';

@InputType()
export class CreateAiPersonaServiceInput {
  @Field(() => AiPersonaEngine, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  engine!: AiPersonaEngine;

  @Field(() => JSON, { nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  prompt!: string;

  @Field(() => AiPersonaDataAccessMode, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  dataAccessMode!: AiPersonaDataAccessMode;

  @Field(() => AiPersonaBodyOfKnowledgeType, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  bodyOfKnowledgeType!: AiPersonaBodyOfKnowledgeType;

  @Field(() => UUID, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  bodyOfKnowledgeID!: string;
}
