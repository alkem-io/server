import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteOpportunityInput {
  @Field({ nullable: false })
  ID!: number;
}
