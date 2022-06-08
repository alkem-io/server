import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { CreateNVPInput } from '@src/domain/common/nvp/nvp.dto.create';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateFeedbackOnCommunityContextInput {
  @Field(() => UUID, { nullable: false })
  communityID!: string;

  @Field(() => [CreateNVPInput], { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateNVPInput)
  questions!: CreateNVPInput[];
}
