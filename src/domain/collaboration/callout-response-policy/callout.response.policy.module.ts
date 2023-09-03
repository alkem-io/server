import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { CalloutResponsePolicyService } from './callout.response.policy.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalloutResponsePolicy } from './callout.response.policy.entity';

@Module({
  imports: [ProfileModule, TypeOrmModule.forFeature([CalloutResponsePolicy])],
  providers: [CalloutResponsePolicyService],
  exports: [CalloutResponsePolicyService],
})
export class CalloutResponsePolicyModule {}
