import { InputType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class DeleteBaseAlkemioInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
