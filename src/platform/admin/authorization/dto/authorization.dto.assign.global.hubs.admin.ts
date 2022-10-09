import { UUID_NAMEID_EMAIL } from '@domain/common/scalars/scalar.uuid.nameid.email';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignGlobalHubsAdminInput {
  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  userID!: string;
}
