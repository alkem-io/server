import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { PromptGraphDataStruct } from './prompt.graph.data.struct.dto';
import { PromptGraphEdge } from './prompt.graph.edge.dto';
import { PromptGraphNode } from './prompt.graph.node.dto';

@InputType('PromptGraphInput')
@ObjectType()
export class PromptGraph {
  @Field(() => [PromptGraphNode], { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => PromptGraphNode)
  nodes?: PromptGraphNode[];

  @Field(() => [PromptGraphEdge], { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => PromptGraphEdge)
  edges?: PromptGraphEdge[];

  @Field({ nullable: true })
  start?: string;

  @Field({ nullable: true })
  end?: string;

  @Field(() => PromptGraphDataStruct, { nullable: true })
  state?: PromptGraphDataStruct;
}
