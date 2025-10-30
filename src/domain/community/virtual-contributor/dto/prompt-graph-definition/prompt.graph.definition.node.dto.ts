import { ObjectType, Field } from '@nestjs/graphql';
import { PromptGraphDefinitionDataStruct } from './prompt.graph.definition.data.struct.dto';

@ObjectType()
export class PromptGraphDefinitionNode {
  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => Boolean, { nullable: false })
  system!: boolean;

  @Field(() => [String], { nullable: true })
  input_variables?: string[];

  @Field({ nullable: true })
  prompt?: string;

  @Field(() => PromptGraphDefinitionDataStruct, { nullable: true })
  output?: PromptGraphDefinitionDataStruct;
}
