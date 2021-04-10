import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteProjectInput {
  @Field()
  ID!: number;
}
