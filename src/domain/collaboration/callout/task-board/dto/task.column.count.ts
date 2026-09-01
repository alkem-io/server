import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('TaskColumnCount')
export class TaskColumnCount {
  @Field(() => String, {
    nullable: false,
    description: 'The Tasks board column, in the board-defined order.',
  })
  column!: string;

  @Field(() => Int, {
    nullable: false,
    description: 'The number of tasks currently in this column.',
  })
  count!: number;
}
