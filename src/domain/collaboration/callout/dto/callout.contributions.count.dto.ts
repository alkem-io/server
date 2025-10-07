import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CalloutContributionsCountOutput {
  @Field({
    nullable: false,
    description: 'The number of contributions of type Post in this callout',
  })
  post!: number;

  @Field({
    nullable: false,
    description: 'The number of contributions of type Link in this callout',
  })
  link!: number;

  @Field({
    nullable: false,
    description:
      'The number of contributions of type Whiteboard in this callout',
  })
  whiteboard!: number;

  @Field({
    nullable: false,
    description: 'The number of contributions of type Memo in this callout',
  })
  memo!: number;
}
