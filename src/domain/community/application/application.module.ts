import { Application } from '@domain/community/application/application.entity';
import { ApplicationFactoryService } from '@domain/community/application/application.factory';
import { ApplicationResolver } from '@domain/community/application/application.resolver';
import { ApplicationService } from '@domain/community/application/application.service';
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { OpportunityModule } from '@domain/challenge/opportunity/opportunity.module';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { UserModule } from '@domain/community/user/user.module';
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
