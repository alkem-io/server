import { Application } from '@domain/community/application/application.entity';
import { ApplicationFactoryService } from '@domain/community/application/application.factory';
import { ApplicationResolver } from '@domain/community/application/application.resolver';
import { ApplicationService } from '@domain/community/application/application.service';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    UserModule,
    UserGroupModule,
    TypeOrmModule.forFeature([Application]),
  ],
  providers: [
    ApplicationResolver,
    ApplicationService,
    ApplicationFactoryService,
  ],
  exports: [ApplicationService, ApplicationFactoryService],
})
export class ApplicationModule {}
