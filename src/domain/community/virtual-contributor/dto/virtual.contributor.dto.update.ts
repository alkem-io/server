import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars';
import { MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { UpdateContributorInput } from '@domain/community/contributor/dto/contributor.dto.update';
@InputType()
export class UpdateVirtualInput extends UpdateContributorInput {
  // Override the type of entry accepted
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID or NameID of the Virtual to update.',
  })
  ID!: string;

  @Field(() => String, { nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  prompt?: string;
}
