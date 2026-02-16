import { Module } from '@nestjs/common';
import { TemplateContentSpaceLookupService } from './template-content-space.lookup.service';

@Module({
  providers: [TemplateContentSpaceLookupService],
  exports: [TemplateContentSpaceLookupService],
})
export class TemplateContentSpaceLookupModule {}
