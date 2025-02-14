import { Field, InputType } from '@nestjs/graphql';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { IExternalConfig } from './external.config';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class UpdateAiPersonaServiceInput extends UpdateBaseAlkemioInput {
  @Field(() => AiPersonaEngine, { nullable: true })
  engine?: AiPersonaEngine;

  @Field(() => [String], { nullable: true })
  prompt?: string[];

  @Field(() => IExternalConfig, { nullable: true })
  externalConfig?: IExternalConfig;

  @Field(() => AiPersonaBodyOfKnowledgeType, {
    nullable: true,
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  bodyOfKnowledgeType?: AiPersonaBodyOfKnowledgeType;

  @Field(() => UUID, { nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  bodyOfKnowledgeID?: string;
}
