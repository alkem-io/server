import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteActorGroupInput {
  @Field()
  ID!: number;
}
