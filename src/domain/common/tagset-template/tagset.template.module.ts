import { Module } from '@nestjs/common';
import { TagsetTemplateService } from './tagset.template.service';

@Module({
  imports: [],
  providers: [TagsetTemplateService],
  exports: [TagsetTemplateService],
})
export class TagsetTemplateModule {}
