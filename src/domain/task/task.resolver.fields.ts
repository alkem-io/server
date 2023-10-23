import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ITask } from './dto/';
import { Profiling } from '@common/decorators';

@Resolver(() => ITask)
export class TaskResolverFields {
  @ResolveField(() => Number, {
    nullable: true,
    description: 'The progress  of the task if the total item count is defined',
  })
  @Profiling.api
  public progress(@Parent() task: ITask): number | undefined {
    if (task.itemsCount == null) {
      return undefined;
    }

    return Number(Number((task.itemsDone ?? 1) / task.itemsCount).toFixed(2));
  }
}
