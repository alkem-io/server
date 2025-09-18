import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class PromptGraphDataPoint {
  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => String, { nullable: true })
  type?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  optional?: boolean;
}

@ObjectType()
export class PromptGrapDataStruct {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  type?: string;

  @Field(() => [PromptGraphDataPoint], { nullable: true })
  properties?: PromptGraphDataPoint[];
}

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

@ObjectType()
export class PromptGraphEdge {
  @Field({ nullable: true })
  from?: string;

  @Field({ nullable: true })
  to?: string;
}

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
