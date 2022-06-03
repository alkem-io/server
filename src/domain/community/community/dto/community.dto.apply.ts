import { Field, InputType } from '@nestjs/graphql';
import { CreateNVPInput } from '@domain/common/nvp';
import { UUID } from '@domain/common/scalars';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CommunityApplyInput {
  @Field(() => UUID, { nullable: false })
  communityID!: string;

  @Field(() => [CreateNVPInput], { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateNVPInput)
  questions!: CreateNVPInput[];
}
