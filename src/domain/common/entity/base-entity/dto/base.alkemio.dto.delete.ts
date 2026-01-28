import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteBaseAlkemioInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
