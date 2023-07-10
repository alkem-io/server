import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagsetTemplateModule } from '../tagset-template/tagset.template.module';
import { TagsetTemplateSet } from './tagset.template.set.entity';
import { TagsetTemplateSetService } from './tagset.template.set.service';

@Module({
  imports: [
    TagsetTemplateModule,
    TypeOrmModule.forFeature([TagsetTemplateSet]),
  ],
  providers: [TagsetTemplateSetService],
  exports: [TagsetTemplateSetService],
})
export class TagsetTemplateSetModule {}
