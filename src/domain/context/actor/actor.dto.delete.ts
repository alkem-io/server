import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteActorInput {
  @Field({ nullable: false })
  ID!: number;
}
