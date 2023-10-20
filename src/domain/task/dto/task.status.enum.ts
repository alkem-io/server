import { registerEnumType } from '@nestjs/graphql';

export enum TaskStatus {
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  ERRORED = 'errored',
}

registerEnumType(TaskStatus, {
  name: 'TaskStatus',
  description: 'The current status of the task',
});
