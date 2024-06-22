import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { UpdateContributorInput } from '@domain/community/contributor/dto/contributor.dto.update';
@InputType()
export class UpdateVirtualContributorInput extends UpdateContributorInput {
  // Override the type of entry accepted
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Virtual Contributor to update.',
  })
  ID!: string;
}
