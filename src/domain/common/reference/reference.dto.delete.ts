import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteReferenceInput {
  @Field({ nullable: false })
  ID!: number;
}
