import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RemoveEntityInput {
  @Field()
  ID!: number;
}
