import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class CommunityJoinInput {
  @Field(() => UUID, { nullable: false })
  communityID!: string;
}
