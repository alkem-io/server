import { Module } from '@nestjs/common';
import { UrlGeneratorService } from './url.generator.service';

@Module({
  imports: [],
  providers: [UrlGeneratorService],
  exports: [UrlGeneratorService],
})
export class UrlGeneratorModule {}
