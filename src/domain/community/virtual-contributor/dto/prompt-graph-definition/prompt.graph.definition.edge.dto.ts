import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PromptGraphDefinitionEdge {
  @Field({ nullable: true })
  from?: string;

  @Field({ nullable: true })
  to?: string;
}
