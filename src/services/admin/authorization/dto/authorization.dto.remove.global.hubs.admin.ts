import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveGlobalHubsAdminInput {
  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  userID!: string;
}
