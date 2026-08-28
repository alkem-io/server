import { Module } from '@nestjs/common';
import { TaskBoardService } from './task.board.service';

@Module({
  providers: [TaskBoardService],
  exports: [TaskBoardService],
})
export class TaskBoardModule {}
