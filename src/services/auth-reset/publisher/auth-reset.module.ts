import { Global, Module } from '@nestjs/common';
import { TaskModule } from '@services/task/task.module';
import { AuthResetService } from './auth-reset.service';

@Global()
@Module({
  imports: [TaskModule],
  providers: [AuthResetService],
  exports: [AuthResetService],
})
export class AuthResetModule {}
