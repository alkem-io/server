import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';

@InputType()
export class CreateAccountInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The host Organization for the account',
  })
  hostID!: string;
}
