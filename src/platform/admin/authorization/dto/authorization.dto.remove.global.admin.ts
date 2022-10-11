import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveGlobalAdminInput {
  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  userID!: string;
}
