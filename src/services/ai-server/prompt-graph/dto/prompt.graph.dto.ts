import { ObjectType, Field, InputType } from '@nestjs/graphql';

import { PromptGraphNode } from './prompt.graph.node.dto';
import { PromptGraphEdge } from './prompt.graph.edge.dto';
import { PromptGraphDataStruct } from './prompt.graph.data.struct.dto';

@InputType('PromptGraphInput')
@ObjectType()
export class PromptGraph {
  @Field(() => [PromptGraphNode], { nullable: true })
  nodes?: PromptGraphNode[];

  @Field(() => [PromptGraphEdge], { nullable: true })
  edges?: PromptGraphEdge[];

  @Field({ nullable: true })
  start?: string;

  @Field({ nullable: true })
  end?: string;

  @Field(() => PromptGraphDataStruct, { nullable: true })
  state?: PromptGraphDataStruct;
}
