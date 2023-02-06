import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';

@Module({
  imports: [PreferenceSetModule],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
