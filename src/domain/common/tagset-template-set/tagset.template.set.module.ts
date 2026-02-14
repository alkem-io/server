import { Module } from '@nestjs/common';
import { TagsetTemplateModule } from '../tagset-template/tagset.template.module';
import { TagsetTemplateSetService } from './tagset.template.set.service';

@Module({
  imports: [
    TagsetTemplateModule,
  ],
  providers: [TagsetTemplateSetService],
  exports: [TagsetTemplateSetService],
})
export class TagsetTemplateSetModule {}
