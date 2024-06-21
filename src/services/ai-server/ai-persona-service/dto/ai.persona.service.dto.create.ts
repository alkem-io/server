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
  @Field(() => AiPersonaEngine, { nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  engine?: AiPersonaEngine = AiPersonaEngine.EXPERT;

  @Field(() => JSON, { nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  prompt?: string = '';

  @Field(() => AiPersonaDataAccessMode, { nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  dataAccessMode?: AiPersonaDataAccessMode =
    AiPersonaDataAccessMode.SPACE_PROFILE_AND_CONTENTS;

  @Field(() => AiPersonaBodyOfKnowledgeType, { nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  bodyOfKnowledgeType?: AiPersonaBodyOfKnowledgeType =
    AiPersonaBodyOfKnowledgeType.ALKEMIO_SPACE;

  @Field(() => UUID, { nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  bodyOfKnowledgeID: string = '';
}
