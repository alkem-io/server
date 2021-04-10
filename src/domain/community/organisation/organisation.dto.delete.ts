import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteOrganisationInput {
  @Field({ nullable: false })
  ID!: number;
}
