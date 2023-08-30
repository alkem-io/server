import { Global, Module } from '@nestjs/common';
import { AuthResetService } from './auth-reset.service';

@Global()
@Module({
  imports: [],
  providers: [AuthResetService],
  exports: [AuthResetService],
})
export class AuthResetModule {}
