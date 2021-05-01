import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteCapabilityInput {
  @Field({ nullable: false })
  ID!: number;
}
