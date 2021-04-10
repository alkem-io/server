import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveCommunityMemberInput {
  @Field({ nullable: false })
  parentID!: number;

  @Field({ nullable: false })
  childID!: number;
}
