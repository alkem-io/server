import { Module } from '@nestjs/common';
import { TemplateBaseService } from './template.base.service';

@Module({
  imports: [],
  providers: [TemplateBaseService],
  exports: [TemplateBaseService],
})
export class TemplateBaseModule {}
