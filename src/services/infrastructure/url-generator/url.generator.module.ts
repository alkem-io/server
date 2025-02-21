import { Module } from '@nestjs/common';
import { UrlGeneratorService } from './url.generator.service';
import { UrlGeneratorCacheService } from './url.generator.service.cache';

@Module({
  imports: [],
  providers: [UrlGeneratorService, UrlGeneratorCacheService],
  exports: [UrlGeneratorService, UrlGeneratorCacheService],
})
export class UrlGeneratorModule {}
