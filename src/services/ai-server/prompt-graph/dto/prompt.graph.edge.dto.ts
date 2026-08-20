import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import {
  IsOptional,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

const PROMPT_GRAPH_MAP_MAX_ENTRIES = 100;

@ValidatorConstraint({ name: 'isPromptGraphMap', async: false })
class IsPromptGraphMap implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const entries = Object.entries(value);
    return (
      entries.length <= PROMPT_GRAPH_MAP_MAX_ENTRIES &&
      entries.every(
        ([key, target]) =>
          key.length <= SMALL_TEXT_LENGTH &&
          typeof target === 'string' &&
          target.length <= SMALL_TEXT_LENGTH
      )
    );
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be an object of at most ${PROMPT_GRAPH_MAP_MAX_ENTRIES} string-to-string entries, with keys and values no longer than ${SMALL_TEXT_LENGTH} characters`;
  }
}

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
  @IsOptional()
  @Validate(IsPromptGraphMap)
  map?: Record<string, string>;

  @Field(() => String, {
    nullable: true,
    description:
      'Conditional routing fallback target — validated by the engine at parse time.',
  })
  default?: string;
}
