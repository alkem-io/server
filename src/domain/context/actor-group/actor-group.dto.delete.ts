import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteActorGroupInput {
  @Field({ nullable: false })
  ID!: number;
}
