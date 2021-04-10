import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteOpportunityInput {
  @Field()
  ID!: number;
}
