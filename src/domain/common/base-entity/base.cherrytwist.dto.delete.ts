import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DeleteBaseCherrytwistInput {
  @Field({ nullable: false })
  ID!: string;
}
