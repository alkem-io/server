import { Field, InputType } from '@nestjs/graphql';
import { CreateNVPInput } from '@domain/common/nvp';
import { UUID } from '@domain/common/scalars';
import { MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UUID_LENGTH } from '@common/constants';

@InputType()
export class CommunityApplyInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  communityID!: string;

  @Field(() => [CreateNVPInput], { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateNVPInput)
  questions!: CreateNVPInput[];
}
