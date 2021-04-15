import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteProjectInput {
  @Field({ nullable: false })
  ID!: number;
}
