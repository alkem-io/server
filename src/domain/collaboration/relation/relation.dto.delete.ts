import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteRelationInput {
  @Field({ nullable: false })
  ID!: string;
}
