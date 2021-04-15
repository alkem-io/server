import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteAspectInput {
  @Field({ nullable: false })
  ID!: number;
}
