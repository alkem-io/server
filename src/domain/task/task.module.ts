import { Module } from '@nestjs/common';
import { TaskModule } from '@services/task/task.module';
import { TaskResolverFields } from './task.resolver.fields';
import { TaskResolverQueries } from './task.resolver.queries';

@Module({
  imports: [TaskModule],
  providers: [TaskResolverQueries, TaskResolverFields],
})
export class TaskGraphqlModule {}
