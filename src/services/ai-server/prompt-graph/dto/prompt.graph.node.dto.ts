import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { PromptGraphDataStruct } from './prompt.graph.data.struct.dto';

@InputType('PromptGraphNodeInput')
@ObjectType()
export class PromptGraphNode {
  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => [String], { nullable: true })
  input_variables?: string[];

  @Field({ nullable: true })
  prompt?: string;

  @Field(() => PromptGraphDataStruct, { nullable: true })
  output?: PromptGraphDataStruct;
}
