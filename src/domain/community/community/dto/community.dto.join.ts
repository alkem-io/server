import { Field, InputType } from '@nestjs/graphql';
import { UUID, UUID_NAMEID_EMAIL } from '@domain/common/scalars';

@InputType()
export class CommunityJoinInput {
  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  userID!: string;

  @Field(() => UUID, { nullable: false })
  communityID!: string;
}
