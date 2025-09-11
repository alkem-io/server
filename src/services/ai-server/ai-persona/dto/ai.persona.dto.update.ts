import { Field, InputType } from '@nestjs/graphql';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { IExternalConfig } from './external.config';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class UpdateAiPersonaInput extends UpdateBaseAlkemioInput {
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

  @Field(() => String, { nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => VirtualContributorDataAccessMode, { nullable: true })
  dataAccessMode?: VirtualContributorDataAccessMode;

  @Field(() => [VirtualContributorInteractionMode], { nullable: true })
  interactionModes?: VirtualContributorInteractionMode[];

  @Field(() => String, { nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  bodyOfKnowledge?: string;
}
