import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteCredentialInput {
  @Field({ nullable: false })
  ID!: number;
}
