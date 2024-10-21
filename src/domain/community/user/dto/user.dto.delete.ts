import { DeleteBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteUserInput extends DeleteBaseAlkemioInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  deleteIdentity?: boolean;
}
