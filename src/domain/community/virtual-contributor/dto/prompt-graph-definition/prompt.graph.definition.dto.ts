import { Field, ObjectType } from '@nestjs/graphql';
import { PromptGraphDefinitionDataStruct } from './prompt.graph.definition.data.struct.dto';
import { PromptGraphDefinitionEdge } from './prompt.graph.definition.edge.dto';
import { PromptGraphDefinitionNode } from './prompt.graph.definition.node.dto';

@ObjectType()
export class PromptGraphDefinition {
  @Field(() => [PromptGraphDefinitionNode], { nullable: true })
  nodes?: PromptGraphDefinitionNode[];

  @Field(() => [PromptGraphDefinitionEdge], { nullable: true })
  edges?: PromptGraphDefinitionEdge[];

  @Field({ nullable: true })
  start?: string;

  @Field({ nullable: true })
  end?: string;

  @Field(() => PromptGraphDefinitionDataStruct, { nullable: true })
  state?: PromptGraphDefinitionDataStruct;
}
