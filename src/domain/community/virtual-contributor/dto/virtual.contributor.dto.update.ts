import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { UpdateContributorInput } from '@domain/community/contributor/dto/contributor.dto.update';
import { IsOptional } from 'class-validator';
import { SearchVisibility } from '@common/enums/search.visibility';
@InputType()
export class UpdateVirtualContributorInput extends UpdateContributorInput {
  // Override the type of entry accepted
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Virtual Contributor to update.',
  })
  ID!: string;

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
}
