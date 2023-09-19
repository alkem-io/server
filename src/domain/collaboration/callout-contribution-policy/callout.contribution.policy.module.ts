import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { CalloutContributionPolicyService } from './callout.contribution.policy.service';
import { CalloutContributionPolicy } from './callout.contribution.policy.entity';

@Module({
  imports: [
    ProfileModule,
    TypeOrmModule.forFeature([CalloutContributionPolicy]),
  ],
  providers: [CalloutContributionPolicyService],
  exports: [CalloutContributionPolicyService],
})
export class CalloutContributionPolicyModule {}
