import { NVP } from '@domain/common/nvp';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Activity {
  @Field(() => [NVP], {
    nullable: true,
    description: 'The topics representing metrics for activities.',
  })
  topics: NVP[];

  constructor() {
    this.topics = [];
  }
}
