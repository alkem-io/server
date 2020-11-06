import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class IdList {
  @Field(() => [String], {
    nullable: true,
    description: 'List of IDs used for search',
  })
  ids?: string[] = [];
}
