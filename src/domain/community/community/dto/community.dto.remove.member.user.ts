import { UUID, UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveCommunityMemberUserInput {
  @Field(() => UUID, { nullable: false })
  communityID!: string;

  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  userID!: string;
}
