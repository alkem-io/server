import { Module } from '@nestjs/common';
import { AuthResetService } from './auth-reset.service';
import { authResetQueueFactoryProvider } from './AuthResetQueueFactoryProvider';
import { SpaceModule } from '@domain/challenge/space/space.module';

@Module({
  // imports: [SpaceModule],
  providers: [AuthResetService, authResetQueueFactoryProvider],
  exports: [AuthResetService],
})
export class AuthResetModule {}
