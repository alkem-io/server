import { Module } from '@nestjs/common';
import { TemplateInfoModule } from '../template-info/template.info.module';
import { TemplateBaseService } from './template.base.service';

@Module({
  imports: [TemplateInfoModule],
  providers: [TemplateBaseService],
  exports: [TemplateBaseService],
})
export class TemplateBaseModule {}
