import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteChallengeInput {
  @Field()
  ID!: number;
}
