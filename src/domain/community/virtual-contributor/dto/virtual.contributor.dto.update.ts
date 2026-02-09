import { LONG_TEXT_LENGTH } from '@common/constants';
import { SearchVisibility } from '@common/enums/search.visibility';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { UpdateKnowledgeBaseInput } from '@domain/common/knowledge-base/dto';
import { UpdateContributorInput } from '@domain/community/contributor/dto/contributor.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class UpdateVirtualContributorInput extends UpdateContributorInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Flag to control the visibility of the VC in the platform store.',
  })
  @IsOptional()
  listedInStore?: boolean;

  @Field(() => SearchVisibility, {
    description: 'Visibility of the VC in searches.',
    nullable: true,
  })
  @IsOptional()
  searchVisibility?: SearchVisibility;

  @Field(() => UpdateKnowledgeBaseInput, {
    nullable: true,
    description: 'The KnowledgeBase to use for this Collaboration.',
  })
  @ValidateNested()
  @IsOptional()
  @Type(() => UpdateKnowledgeBaseInput)
  knowledgeBaseData!: UpdateKnowledgeBaseInput;

  @Field(() => VirtualContributorBodyOfKnowledgeType, {
    nullable: true,
  })
  @IsEnum(VirtualContributorBodyOfKnowledgeType)
  bodyOfKnowledgeType?: VirtualContributorBodyOfKnowledgeType;

  @Field(() => VirtualContributorDataAccessMode, { nullable: true })
  @IsEnum(VirtualContributorDataAccessMode)
  dataAccessMode?: VirtualContributorDataAccessMode;

  @Field(() => [VirtualContributorInteractionMode], { nullable: true })
  @IsEnum(VirtualContributorInteractionMode, { each: true })
  interactionModes?: VirtualContributorInteractionMode[];

  @Field(() => String, { nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  bodyOfKnowledgeDescription?: string;
}
