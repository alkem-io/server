import { Application } from '@domain/community/application/application.entity';
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
  providers: [ApplicationResolver, ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
