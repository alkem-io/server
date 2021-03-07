import { ApplicationFactoryService } from '@domain/community/application/application.factory';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [UserModule],
  providers: [ApplicationFactoryService],
  exports: [ApplicationFactoryService],
})
export class ApplicationFactoryModule {}
