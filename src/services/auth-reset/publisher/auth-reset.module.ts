import { Global, Module } from '@nestjs/common';
import { AuthResetService } from './auth-reset.service';
import { authResetQueueFactoryProvider } from './AuthResetQueueFactoryProvider';

@Global()
@Module({
  imports: [],
  providers: [AuthResetService, authResetQueueFactoryProvider],
  exports: [AuthResetService],
})
export class AuthResetModule {}
