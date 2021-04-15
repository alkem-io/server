import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteChallengeInput {
  @Field({ nullable: false })
  ID!: number;
}
