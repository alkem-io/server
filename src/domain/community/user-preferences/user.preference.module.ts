import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPreference } from './user.preference.entity';
import { UserPreferenceDefinition } from './user.preference.definition.entity';
import { UserPreferenceService } from './user.preference.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserPreference, UserPreferenceDefinition]),
  ],
  providers: [UserPreferenceService],
  exports: [UserPreferenceService],
})
export class UserPreferenceModule {}
