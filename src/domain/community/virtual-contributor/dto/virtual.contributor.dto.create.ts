import { SMALL_TEXT_LENGTH } from '@common/constants';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { CreateContributorInput } from '@domain/actor/actor/dto/actor.dto.filter';
import { CreateKnowledgeBaseInput } from '@domain/common/knowledge-base/dto';
import { Field, InputType } from '@nestjs/graphql';
import { CreateAiPersonaInput } from '@services/ai-server/ai-persona/dto/ai.persona.dto.create';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class CreateVirtualContributorInput extends CreateContributorInput {
  @Field(() => CreateAiPersonaInput, {
    nullable: false,
    description: 'The AI Persona to use for this Virtual Contributor.',
  })
  aiPersona!: CreateAiPersonaInput;

  @Field(() => CreateKnowledgeBaseInput, {
    nullable: true,
    description: 'The KnowledgeBase to use for this Collaboration.',
  })
  @ValidateNested()
  @IsOptional()
  @Type(() => CreateKnowledgeBaseInput)
  knowledgeBaseData!: CreateKnowledgeBaseInput;

  @Field(() => VirtualContributorDataAccessMode, {
    nullable: true,
    defaultValue: VirtualContributorDataAccessMode.SPACE_PROFILE_AND_CONTENTS,
  })
  @IsEnum(VirtualContributorDataAccessMode)
  dataAccessMode!: VirtualContributorDataAccessMode;

  @Field(() => VirtualContributorBodyOfKnowledgeType, {
    nullable: true,
    defaultValue: VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
  })
  @IsEnum(VirtualContributorBodyOfKnowledgeType)
  bodyOfKnowledgeType!: VirtualContributorBodyOfKnowledgeType;

  @Field(() => String, {
    nullable: true,
    description: 'The ID of the body of knowledge (if any) to use.',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  bodyOfKnowledgeID?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Description of the body of knowledge for this VC.',
  })
  bodyOfKnowledgeDescription?: string;

  @Field(() => [VirtualContributorInteractionMode], {
    nullable: true,
    defaultValue: [VirtualContributorInteractionMode.DISCUSSION_TAGGING],
  })
  @IsEnum(VirtualContributorInteractionMode, { each: true })
  interactionModes?: VirtualContributorInteractionMode[];
}
