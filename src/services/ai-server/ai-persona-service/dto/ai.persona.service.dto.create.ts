import { Field, InputType } from '@nestjs/graphql';
import { ArrayMaxSize, IsString, MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { UUID } from '@domain/common/scalars';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { AiPersonaDataAccessMode } from '@common/enums/ai.persona.data.access.mode';
import { IExternalConfig } from './external.config';

@InputType()
export class CreateAiPersonaServiceInput {
  @Field(() => AiPersonaEngine, {
    nullable: true,
    defaultValue: AiPersonaEngine.EXPERT,
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  engine!: AiPersonaEngine;

  @Field(() => [String], { nullable: true, defaultValue: [] })
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(LONG_TEXT_LENGTH, { each: true })
  prompt!: string[];

  @Field(() => AiPersonaDataAccessMode, {
    nullable: true,
    defaultValue: AiPersonaDataAccessMode.SPACE_PROFILE_AND_CONTENTS,
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  dataAccessMode!: AiPersonaDataAccessMode;

  @Field(() => AiPersonaBodyOfKnowledgeType, {
    nullable: true,
    defaultValue: AiPersonaBodyOfKnowledgeType.ALKEMIO_SPACE,
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  bodyOfKnowledgeType!: AiPersonaBodyOfKnowledgeType;

  @Field(() => UUID, { nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  bodyOfKnowledgeID: string = ''; // cannot default to a valid UUID

  @Field(() => IExternalConfig, { nullable: true })
  externalConfig?: IExternalConfig;
}
