import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { PromptGraphDataStruct } from './prompt.graph.data.struct.dto';

@InputType('PromptGraphNodeInput')
@ObjectType()
export class PromptGraphNode {
  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => Boolean, { nullable: false })
  system!: boolean;

  @Field(() => [String], { nullable: true })
  input_variables?: string[];

  @Field({ nullable: true })
  prompt?: string;

  @Field(() => PromptGraphDataStruct, { nullable: true })
  output?: PromptGraphDataStruct;

  @Field(() => String, {
    nullable: true,
    description:
      'Node type: llm (default) | retrieve | echo — validated by the engine at parse time.',
  })
  type?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Echo node state key — validated by the engine contract at parse time.',
  })
  source?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Retrieve collection template — validated by the engine contract at parse time.',
  })
  collection_template?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Retrieve query template — validated by the engine contract at parse time.',
  })
  query_template?: string;

  @Field(() => Int, {
    nullable: true,
    description:
      'Retrieve result count — validated by the engine contract at parse time.',
  })
  n_results?: number;

  @Field(() => Int, {
    nullable: true,
    description:
      'Retrieve context character cap — validated by the engine contract at parse time.',
  })
  max_context_chars?: number;

  @Field(() => String, {
    nullable: true,
    description:
      'Retrieve output state key — validated by the engine contract at parse time.',
  })
  output_key?: string;
}
