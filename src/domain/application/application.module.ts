import { Application } from '@domain/application/application.entity';
import { ApplicationFactoryService } from '@domain/application/application.factory';
import { ApplicationResolver } from '@domain/application/application.resolver';
import { ApplicationService } from '@domain/application/application.service';
import { Challenge } from '@domain/challenge/challenge.entity';
import { Ecoverse } from '@domain/ecoverse/ecoverse.entity';
import { Opportunity } from '@domain/opportunity/opportunity.entity';
import { UserModule } from '@domain/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([Application]),
    TypeOrmModule.forFeature([Ecoverse]),
    TypeOrmModule.forFeature([Opportunity]),
    TypeOrmModule.forFeature([Challenge]),
  ],
  providers: [
    ApplicationResolver,
    ApplicationService,
    ApplicationFactoryService,
  ],
  exports: [ApplicationService, ApplicationFactoryService],
})
export class ApplicationModule {}
