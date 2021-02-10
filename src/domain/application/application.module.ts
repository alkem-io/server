import { Application } from '@domain/application/application.entity';
import { ApplicationResolver } from '@domain/application/application.resolver';
import { ApplicationService } from '@domain/application/application.service';
import { UserModule } from '@domain/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [UserModule, TypeOrmModule.forFeature([Application])],
  providers: [ApplicationResolver, ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
