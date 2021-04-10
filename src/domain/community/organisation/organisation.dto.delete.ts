import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteOrganisationInput {
  @Field()
  ID!: number;
}
