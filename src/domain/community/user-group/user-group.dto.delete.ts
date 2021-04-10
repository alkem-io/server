import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteUserGroupInput {
  @Field()
  ID!: number;
}
