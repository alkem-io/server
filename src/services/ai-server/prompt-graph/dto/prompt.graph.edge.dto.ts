import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class PromptGraphEdge {
  @Field({ nullable: true })
  from?: string;

  @Field({ nullable: true })
  to?: string;
}
