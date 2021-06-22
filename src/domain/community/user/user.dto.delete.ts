import { DeleteBaseCherrytwistInput } from '@domain/common/entity/base-entity';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteUserInput extends DeleteBaseCherrytwistInput {
  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  ID!: string;
}
