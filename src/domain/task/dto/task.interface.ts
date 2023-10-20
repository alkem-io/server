import { Field, ObjectType } from '@nestjs/graphql';
import { TaskResult } from '@services/task/task.result.interface';
import { TaskError } from '@services/task/task.error.interface';
import { UUID } from '@domain/common/scalars';
import { TaskStatus } from '@domain/task/dto/task.status.enum';

@ObjectType('Task')
export abstract class ITask {
  @Field(() => UUID, {
    description: 'The UUID of the task',
  })
  id!: string;

  @Field(() => Number, {
    description: 'The timestamp when the task was created',
  })
  created!: number;
  /**
   * the timestamp when the task was started
   */
  @Field(() => Number, {
    description: 'The timestamp when the task was started',
  })
  start!: number;

  @Field(() => Number, {
    description: 'the timestamp when the task was completed',
    nullable: true,
  })
  end?: number;

  @Field(() => Number, {
    nullable: true,
    description: 'Amount of items that need to be processed',
  })
  itemsCount?: number;

  @Field(() => Number, {
    nullable: true,
    description: 'Amount of items that are already processed',
  })
  itemsDone?: number;

  @Field(() => String, {
    nullable: true,
    description: 'TBD',
  })
  type?: string;

  @Field(() => TaskStatus, {
    nullable: false,
    description: 'The current status of the task',
  })
  status?: TaskStatus;

  @Field(() => [String], {
    nullable: true,
    description: 'info about the completed part of the task',
  })
  results?: Array<TaskResult>;

  @Field(() => [String], {
    nullable: true,
    description: 'info about the errors of the task',
  })
  errors?: Array<TaskError>;
}
