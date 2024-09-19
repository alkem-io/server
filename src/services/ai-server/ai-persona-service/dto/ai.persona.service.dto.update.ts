import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import JSON from 'graphql-type-json';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { IExternalConfig } from './external.config';

@InputType()
export class UpdateAiPersonaServiceInput extends UpdateBaseAlkemioInput {
  @Field(() => AiPersonaEngine, { nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  engine?: AiPersonaEngine;

  @Field(() => JSON, { nullable: true })
  prompt?: string[];

  @Field(() => IExternalConfig, { nullable: true })
  externalConfig?: IExternalConfig;
}
