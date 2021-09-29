import { Module } from '@nestjs/common';
import { AuthorizableService } from './authorizable.service';

@Module({
  imports: [],
  providers: [AuthorizableService],
  exports: [AuthorizableService],
})
export class AuthorizableEntityModule {}
