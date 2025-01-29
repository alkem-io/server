import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteInnovationPackInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
