import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteUserInput {
  @Field({ nullable: false })
  ID!: number;
}
