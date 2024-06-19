import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import JSON from 'graphql-type-json';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { UUID } from '@domain/common/scalars';
import { BodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { AiPersonaAccessMode } from '@common/enums/ai.persona.access.mode';

@InputType()
export class CreateAiPersonaServiceInput {
  @Field(() => AiPersonaEngine, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  engine!: AiPersonaEngine;

  @Field(() => JSON, { nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  prompt!: string;

  @Field(() => AiPersonaAccessMode, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  dataAccessMode!: AiPersonaAccessMode;

  @Field(() => BodyOfKnowledgeType, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  bodyOfKnowledgeType!: BodyOfKnowledgeType;

  @Field(() => UUID, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  bodyOfKnowledgeID!: string;
}
