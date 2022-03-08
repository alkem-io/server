import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Preference } from './preference.entity';
import { PreferenceDefinition } from './preference.definition.entity';
import { PreferenceService as PreferenceService } from './preference.service';
import { PreferenceResolverMutations } from './preference.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PreferenceDefinitionResolverFields } from './preference.definition.resolver.fields';

@Module({
  imports: [
    AuthorizationModule,
    TypeOrmModule.forFeature([Preference, PreferenceDefinition]),
  ],
  providers: [
    PreferenceService,
    PreferenceResolverMutations,
    PreferenceDefinitionResolverFields,
  ],
  exports: [PreferenceService],
})
export class PreferenceModule {}
