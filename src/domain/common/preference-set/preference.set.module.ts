import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { PreferenceModule } from '../preference/preference.module';
import { PreferenceSet } from './preference.set.entity';
import { PreferenceSetService } from './preference.set.service';
import { PreferenceSetAuthorizationService } from './preference.set.service.authorization';

@Module({
  imports: [
    PreferenceModule,
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([PreferenceSet]),
  ],
  providers: [PreferenceSetService, PreferenceSetAuthorizationService],
  exports: [PreferenceSetService, PreferenceSetAuthorizationService],
})
export class PreferenceSetModule {}
