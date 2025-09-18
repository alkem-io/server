import { Field, InputType } from '@nestjs/graphql';
import { CreateContributorInput } from '@domain/community/contributor/dto/contributor.dto.create';
import { CreateAiPersonaInput } from '@services/ai-server/ai-persona/dto/ai.persona.dto.create';
import { CreateKnowledgeBaseInput } from '@domain/common/knowledge-base/dto';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { SMALL_TEXT_LENGTH } from '@common/constants';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';

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
  @MaxLength(SMALL_TEXT_LENGTH)
  dataAccessMode!: VirtualContributorDataAccessMode;

  @Field(() => VirtualContributorBodyOfKnowledgeType, {
    nullable: true,
    defaultValue: VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
  })
  @MaxLength(SMALL_TEXT_LENGTH)
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
  interactionModes?: VirtualContributorInteractionMode[];
}
