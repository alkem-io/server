import { ObjectType, Field } from '@nestjs/graphql';
import { PromptGrapDataStruct } from './prompt.grap.data.struct.dto';

@ObjectType()
export class PromptGraphNode {
  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => [String], { nullable: true })
  input_variables?: string[];

  @Field({ nullable: true })
  prompt?: string;

  @Field(() => PromptGrapDataStruct, { nullable: true })
  output?: PromptGrapDataStruct;
}
