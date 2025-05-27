import { DeleteBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteUserInput extends DeleteBaseAlkemioInput {
  @Field(() => Boolean, { nullable: true, defaultValue: true })
  deleteIdentity?: boolean;
}
