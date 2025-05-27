import { Field, InputType } from '@nestjs/graphql';
import { UpdateContributorInput } from '@domain/community/contributor/dto/contributor.dto.update';
import { IsOptional, ValidateNested } from 'class-validator';
import { SearchVisibility } from '@common/enums/search.visibility';
import { Type } from 'class-transformer';
import { UpdateKnowledgeBaseInput } from '@domain/common/knowledge-base/dto';
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
}
