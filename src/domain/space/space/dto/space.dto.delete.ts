import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteSpaceInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
