import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteReferenceInput {
  @Field()
  ID!: number;
}
