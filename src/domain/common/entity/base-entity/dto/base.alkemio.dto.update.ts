import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateBaseAlkemioInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
