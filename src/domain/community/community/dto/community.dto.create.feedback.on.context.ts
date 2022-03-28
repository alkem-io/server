import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { CreateNVPInput } from '@src/domain/common/nvp/nvp.dto.create';

@InputType()
export class CreateFeedbackOnCommunityContextInput {
  @Field(() => UUID, { nullable: false })
  communityID!: string;

  @Field(() => [CreateNVPInput], { nullable: false })
  questions!: CreateNVPInput[];
}
