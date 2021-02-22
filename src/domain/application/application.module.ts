import { Application } from '@domain/application/application.entity';
import { ApplicationFactoryService } from '@domain/application/application.factory';
import { ApplicationResolver } from '@domain/application/application.resolver';
import { ApplicationService } from '@domain/application/application.service';
import { ChallengeModule } from '@domain/challenge/challenge.module';
import { EcoverseModule } from '@domain/ecoverse/ecoverse.module';
import { OpportunityModule } from '@domain/opportunity/opportunity.module';
import { UserGroupModule } from '@domain/user-group/user-group.module';
import { UserModule } from '@domain/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    EcoverseModule,
    UserModule,
    UserGroupModule,
    ChallengeModule,
    OpportunityModule,
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
