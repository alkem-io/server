import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class TagsetArgs {
  @Field(() => String, {
    name: 'name',
    description:
      'Return only Callouts that match one of the tagsets and any of the tags in them.',
  })
  name!: string;

  @Field(() => [String], {
    name: 'tags',
    description: 'A list of tags to include.',
  })
  tags!: string[];
}
