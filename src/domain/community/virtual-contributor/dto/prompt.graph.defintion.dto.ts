import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class PromptGraphDefinitionDataPoint {
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
export class PromptGraphDefinitionDataStruct {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  type?: string;

  @Field(() => [PromptGraphDefinitionDataPoint], { nullable: true })
  properties?: PromptGraphDefinitionDataPoint[];
}

@ObjectType()
export class PromptGraphDefinitionNode {
  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => [String], { nullable: true })
  input_variables?: string[];

  @Field({ nullable: true })
  prompt?: string;

  @Field(() => PromptGraphDefinitionDataStruct, { nullable: true })
  output?: PromptGraphDefinitionDataStruct;
}

@ObjectType()
export class PromptGraphDefinitionEdge {
  @Field({ nullable: true })
  from?: string;

  @Field({ nullable: true })
  to?: string;
}

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
