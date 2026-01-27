import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType('PromptGraphEdgeInput')
@ObjectType()
export class PromptGraphEdge {
  @Field({ nullable: true })
  from?: string;

  @Field({ nullable: true })
  to?: string;
}
