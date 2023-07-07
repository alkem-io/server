import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagsetTemplate } from './tagset.template.entity';
import { TagsetTemplateService } from './tagset.template.service';

@Module({
  imports: [TypeOrmModule.forFeature([TagsetTemplate])],
  providers: [TagsetTemplateService],
  exports: [TagsetTemplateService],
})
export class TagsetTemplateModule {}
