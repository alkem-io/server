import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteUserGroupInput {
  @Field({ nullable: false })
  ID!: number;
}
