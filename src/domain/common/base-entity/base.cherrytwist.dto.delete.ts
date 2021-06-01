import { InputType, Field } from '@nestjs/graphql';
import { UUID } from '../scalars/scalar.uuid';

@InputType()
export class DeleteBaseCherrytwistInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
