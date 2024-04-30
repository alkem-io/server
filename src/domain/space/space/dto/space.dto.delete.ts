import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteSpaceInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  ID!: string;
}
