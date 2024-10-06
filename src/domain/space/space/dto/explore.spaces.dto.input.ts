import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ExploreSpacesInput {
  @Field(() => Number, {
    nullable: true,
    description: 'Amount of Spaces returned.',
    defaultValue: 30,
  })
  limit!: number;

  @Field(() => Number, {
    nullable: true,
    description: 'Take into account only the activity in the past X days.',
    defaultValue: 30,
  })
  daysOld!: number;
}
