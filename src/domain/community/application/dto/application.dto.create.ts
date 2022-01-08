import { Field, InputType } from '@nestjs/graphql';
import { CreateNVPInput } from '@domain/common/nvp';
import { UUID, UUID_NAMEID_EMAIL } from '@domain/common/scalars';

@InputType()
export class CreateApplicationInput {
  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  userID!: string;

  @Field(() => UUID, { nullable: false })
  parentID!: string;

  @Field(() => [CreateNVPInput], { nullable: false })
  questions!: CreateNVPInput[];
}
