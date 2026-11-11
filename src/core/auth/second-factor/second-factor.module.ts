import { Organization } from '@domain/community/organization/organization.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { SecondFactorPolicyService } from './second-factor.policy.service';

@Module({
  imports: [TypeOrmModule.forFeature([Platform, Organization])],
  providers: [SecondFactorPolicyService],
  exports: [SecondFactorPolicyService],
})
export class SecondFactorModule {}
