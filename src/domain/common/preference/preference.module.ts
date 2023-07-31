import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Preference } from './preference.entity';
import { PreferenceDefinition } from './preference.definition.entity';
import { PreferenceService as PreferenceService } from './preference.service';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([Preference, PreferenceDefinition]),
  ],
  providers: [PreferenceService],
  exports: [PreferenceService],
})
export class PreferenceModule {}
