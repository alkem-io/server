import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';

@Module({
  imports: [],
  providers: [AuthorizationService],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
