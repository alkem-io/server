import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateContentSpace } from '../template.content.space.entity';
import { TemplateContentSpaceLookupService } from './template-content-space.lookup.service';

@Module({
  imports: [TypeOrmModule.forFeature([TemplateContentSpace])],
  providers: [TemplateContentSpaceLookupService],
  exports: [TemplateContentSpaceLookupService],
})
export class TemplateContentSpaceLookupModule {}
