import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { CalloutResponseDefaultsService } from './callout.response.defaults.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalloutResponseDefaults } from './callout.response.defaults.entity';

@Module({
  imports: [ProfileModule, TypeOrmModule.forFeature([CalloutResponseDefaults])],
  providers: [CalloutResponseDefaultsService],
  exports: [CalloutResponseDefaultsService],
})
export class CalloutResponseDefaultsModule {}
