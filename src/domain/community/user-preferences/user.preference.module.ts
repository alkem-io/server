import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UserPreference } from './user.preference.entity';
import { UserPreferenceDefinition } from './user.preference.definition.entity';
import { UserPreferenceService } from './user.preference.service';
import { UserPreferenceResolverMutations } from './user.preference.resolver.mutations';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserPreference, UserPreferenceDefinition]),
    AuthorizationModule,
  ],
  providers: [UserPreferenceService, UserPreferenceResolverMutations],
  exports: [UserPreferenceService],
})
export class UserPreferenceModule {}
