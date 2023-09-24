import { Args, Query, Resolver } from '@nestjs/graphql';
import { TaskService } from '@services/task/task.service';
import { ITask } from './dto/';
import { Profiling } from '@common/decorators';
import { UUID } from '@domain/common/scalars';
import { TaskStatus } from '@domain/task/dto/task.status.enum';

@Resolver()
export class TaskResolverQueries {
  constructor(private taskService: TaskService) {}

  @Query(() => [ITask], {
    nullable: false,
    description: 'Information about a specific task',
  })
  @Profiling.api
  public task(
    @Args('id', { type: () => UUID }) id: string
  ): Promise<ITask | undefined> {
    return this.taskService.get(id);
  }

  @Query(() => [ITask], {
    nullable: false,
    description: 'All tasks with filtering applied',
  })
  @Profiling.api
  public tasks(
    @Args('status', { type: () => TaskStatus, nullable: true })
    status: TaskStatus
  ): Promise<ITask[]> {
    return this.taskService.getAll(status);
  }
}
