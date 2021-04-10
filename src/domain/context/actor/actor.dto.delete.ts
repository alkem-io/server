import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteActorInput {
  @Field()
  ID!: number;
}
