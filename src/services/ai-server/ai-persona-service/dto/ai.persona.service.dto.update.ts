import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import JSON from 'graphql-type-json';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';

@InputType()
export class UpdateAiPersonaServiceInput extends UpdateBaseAlkemioInput {
  @Field(() => AiPersonaEngine, { nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  engine?: AiPersonaEngine;

  @Field(() => JSON, { nullable: true })
  prompt?: string[];

  @Field(() => String, { nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  apiKey?: string;
}
