import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPreference } from './user.preference.entity';
import { UserPreferenceDefinition } from './user.preference.definition.entity';
import { UserPreferenceService } from './user.preference.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserPreference, UserPreferenceDefinition]),
    forwardRef(() => UserModule),
  ],
  providers: [UserPreferenceService],
  exports: [UserPreferenceService],
})
export class UserPreferenceModule {}
