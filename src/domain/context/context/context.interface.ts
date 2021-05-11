import { Reference, IReference } from '@domain/common/reference';
import { createUnionType, Field, ID, InterfaceType } from '@nestjs/graphql';
import { Context, Context2 } from '@domain/context/context';
@InterfaceType()
export abstract class IContext {
  @Field(() => ID)
  id!: number;

  @Field(() => String, {
    nullable: true,
    description: 'A one line description',
  })
  tagline?: string;

  @Field(() => String, {
    nullable: true,
    description: 'A detailed description of the current situation',
  })
  background?: string;

  @Field(() => String, {
    nullable: true,
    description: 'The goal that is being pursued',
  })
  vision?: string;

  @Field(() => String, {
    nullable: true,
    description: 'What is the potential impact?',
  })
  impact?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Who should get involved in this challenge',
  })
  who?: string;

  @Field(() => [Reference], {
    nullable: true,
    description: 'A list of URLs to relevant information.',
  })
  references?: IReference[];
}

export const ContextUnion = createUnionType({
  name: 'ContextUnion',
  types: () => [Context, Context2],
});
