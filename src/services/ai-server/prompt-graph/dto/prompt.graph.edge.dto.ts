import { Field, InputType, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType('PromptGraphEdgeInput')
@ObjectType()
export class PromptGraphEdge {
  @Field({ nullable: true })
  from?: string;

  @Field({ nullable: true })
  to?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Conditional routing state field — validated by the engine at parse time.',
  })
  on?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description:
      'Conditional routing-value to node-name map; keys match case-insensitively in the engine.',
  })
  map?: Record<string, string>;

  @Field(() => String, {
    nullable: true,
    description:
      'Conditional routing fallback target — validated by the engine at parse time.',
  })
  default?: string;
}
