import { Module } from '@nestjs/common';
import { UrlGeneratorService } from './url.generator.service';
import { ProfileModule } from '@domain/common/profile/profile.module';

@Module({
  imports: [ProfileModule],
  providers: [UrlGeneratorService],
  exports: [UrlGeneratorService],
})
export class UrlGeneratorModule {}
