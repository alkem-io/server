import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminWhiteboardFilesResult {
  @Field(() => [String], {
    description: 'Successes',
  })
  results!: [];

  @Field(() => [String], {
    description: 'Warnings',
  })
  warns!: [];

  @Field(() => [String], {
    description: 'Errors',
  })
  errors!: [];
}
