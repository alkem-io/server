import { Module } from '@nestjs/common';
import { TaskModule } from '@services/task/task.module';
import { TaskResolverQueries } from './task.resolver.queries';
import { TaskResolverFields } from './task.resolver.fields';

@Module({
  imports: [TaskModule],
  providers: [TaskResolverQueries, TaskResolverFields],
})
export class TaskGraphqlModule {}
