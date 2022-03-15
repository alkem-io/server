import { Field, InputType } from '@nestjs/graphql';
import { CreateNVPInput } from '@domain/common/nvp';
import { UUID } from '@domain/common/scalars';

@InputType()
export class CommunityApplyInput {
  @Field(() => UUID, { nullable: false })
  communityID!: string;

  @Field(() => [CreateNVPInput], { nullable: false })
  questions!: CreateNVPInput[];
}
