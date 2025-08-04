import { Module } from '@nestjs/common';
import { TemplateContentSpaceLookupService } from './template-content-space.lookup.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateContentSpace } from '../template.content.space.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TemplateContentSpace])],
  providers: [TemplateContentSpaceLookupService],
  exports: [TemplateContentSpaceLookupService],
})
export class TemplateContentSpaceLookupModule {}
