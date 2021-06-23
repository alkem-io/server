import { InputType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class UpdateBaseCherrytwistInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
