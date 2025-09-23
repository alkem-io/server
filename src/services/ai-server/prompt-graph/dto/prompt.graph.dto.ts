import { ObjectType, Field } from '@nestjs/graphql';

import { PromptGraphNode } from './prompt.graph.node.dto';
import { PromptGraphEdge } from './prompt.graph.edge.dto';
import { PromptGrapDataStruct } from './prompt.grap.data.struct.dto';

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

  @Field(() => PromptGrapDataStruct, { nullable: true })
  state?: PromptGrapDataStruct;
}
