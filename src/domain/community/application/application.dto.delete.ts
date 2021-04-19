import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteApplicationInput {
  @Field({ nullable: false })
  ID!: number;
}
