import { InputType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class DeleteBaseCherrytwistInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
