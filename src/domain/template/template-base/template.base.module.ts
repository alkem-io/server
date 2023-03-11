import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { TemplateBaseService } from './template.base.service';

@Module({
  imports: [ProfileModule],
  providers: [TemplateBaseService],
  exports: [TemplateBaseService],
})
export class TemplateBaseModule {}
