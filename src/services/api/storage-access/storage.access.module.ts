import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [AuthorizationModule],
  providers: [],
  exports: [],
})
export class StorageAccessModule {}
